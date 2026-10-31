import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  Difficulty,
  ExamAttemptItem,
  Language,
  SubmissionItem,
  UserProgressState,
} from '../types/academic';

const STORAGE_KEY = 'thpt_qt_tin_thpt_progress_v2';

// Filter out automated test IDs so only genuine registered students appear on the Leaderboard
const IGNORED_TEST_SYNC_KEYS = new Set([
  'std_c789ed49',
  'std_6fe40b0c',
  'acct_nguyenvana_cd174226_5b8a6e42',
]);

export function isIgnoredTestEntry(syncKey?: string, displayName?: string): boolean {
  const key = (syncKey || '').trim();
  if (
    IGNORED_TEST_SYNC_KEYS.has(key) ||
    key.startsWith('acct_nguyenvana') ||
    key.startsWith('usr_test_') ||
    key.startsWith('test_')
  ) {
    return true;
  }
  const normName = (displayName || '').trim().toLowerCase();
  if (normName === 'nguyễn văn a' || normName === 'aaa' || normName.startsWith('test_')) {
    return true;
  }
  return false;
}

export interface CloudLeaderboardEntry {
  syncKey: string;
  displayName: string;
  schoolName: string;
  className: string;
  xp: number;
  streakDays: number;
  solvedCount: number;
  solvedIds: string[];
  examCount: number;
  deviceLabel: string;
  updatedAtIso: string;
  isCurrentUser?: boolean;
}

export function getDefaultProgress(): UserProgressState {
  return {
    userId: 'local_scholar',
    displayName: '',
    schoolName: '',
    className: '',
    cloudEmail: '',
    targetUniversity: '',
    profileCompleted: false,
    xp: 0,
    streakDays: 1,
    solvedCount: 0,
    solvedIds: [],
    examCount: 0,
    deviceLabel: getBrowserDeviceLabel(),
    lastSyncedIso: new Date().toISOString(),
    submissions: [],
    examAttempts: [],
    savedCodeByProblem: {},
  };
}

export function getBrowserDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Thiết bị Web';
  const ua = navigator.userAgent;
  const os = ua.includes('Win')
    ? 'Windows'
    : ua.includes('Mac')
      ? 'macOS'
      : ua.includes('Linux')
        ? 'Linux'
        : ua.includes('Android')
          ? 'Android'
          : ua.includes('iPhone') || ua.includes('iPad')
            ? 'iOS'
            : 'Web';
  return `Trình duyệt trên ${os}`.slice(0, 95);
}

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  return cleaned || 'id_default';
}

/**
 * Computes a deterministic, non-PII syncKey so that any two devices (PC & Phone)
 * logged into the same email or account always sync against the exact same Firestore document
 * without exposing raw email addresses in public document IDs.
 */
export function getCanonicalSyncKey(
  state: UserProgressState,
  firebaseUid?: string | null,
  firebaseEmail?: string | null
): string {
  const rawEmail = (firebaseEmail || state.cloudEmail || '').trim().toLowerCase();
  if (rawEmail && rawEmail.includes('@')) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < rawEmail.length; i++) {
      const ch = rawEmail.charCodeAt(i);
      h1 ^= ch;
      h1 = Math.imul(h1, 0x01000193) >>> 0;
      h2 ^= ch * (i + 1);
      h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
    }
    const localPrefix = sanitizeId(rawEmail.split('@')[0]).slice(0, 24);
    return sanitizeId(`acct_${localPrefix}_${h1.toString(16)}_${h2.toString(16)}`);
  }

  if (firebaseUid && firebaseUid !== 'local_scholar') {
    return sanitizeId(`uid_${firebaseUid}`);
  }

  if (state.userId && state.userId !== 'local_scholar') {
    return sanitizeId(`usr_${state.userId}`);
  }

  if (state.displayName.trim()) {
    const slug = `${state.displayName.trim().toLowerCase()}_${state.schoolName.trim().toLowerCase()}_${(state.className || '').trim().toLowerCase()}`;
    let h = 2166136261;
    for (let i = 0; i < slug.length; i++) {
      h ^= slug.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return sanitizeId(`std_${h.toString(16)}`);
  }

  return '';
}

export function loadLocalProgress(): UserProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<UserProgressState>;
    const def = getDefaultProgress();
    const displayName = typeof parsed.displayName === 'string' ? parsed.displayName : '';
    const cloudEmail = typeof parsed.cloudEmail === 'string' ? parsed.cloudEmail : '';
    const solvedIds = Array.isArray(parsed.solvedIds)
      ? Array.from(new Set(parsed.solvedIds.map(sanitizeId))).slice(0, 500)
      : def.solvedIds;
    return {
      ...def,
      ...parsed,
      displayName,
      cloudEmail,
      schoolName: typeof parsed.schoolName === 'string' ? parsed.schoolName : '',
      className: typeof parsed.className === 'string' ? parsed.className : '',
      targetUniversity: typeof parsed.targetUniversity === 'string' ? parsed.targetUniversity : '',
      profileCompleted: Boolean(
        parsed.profileCompleted || displayName.trim().length > 0 || cloudEmail.trim().length > 0
      ),
      solvedIds,
      solvedCount: solvedIds.length,
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : def.submissions,
      examAttempts: Array.isArray(parsed.examAttempts) ? parsed.examAttempts : def.examAttempts,
      savedCodeByProblem: parsed.savedCodeByProblem || {},
    };
  } catch {
    return getDefaultProgress();
  }
}

export function saveLocalProgress(state: UserProgressState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Fresh server-first document fetch to prevent stale IndexedDB/browser cache on mobile & desktop.
 */
async function fetchFreshDoc(docRef: ReturnType<typeof doc>) {
  try {
    return await getDocFromServer(docRef);
  } catch {
    return await getDoc(docRef);
  }
}

async function fetchFreshDocs(q: ReturnType<typeof query>) {
  try {
    return await getDocsFromServer(q);
  } catch {
    return await getDocs(q);
  }
}

/**
 * Encodes progress state into a portable Base64 UTF-8 string for instant cross-device transfer.
 */
export function exportSyncToken(state: UserProgressState): string {
  const compact = {
    d: state.displayName,
    s: state.schoolName,
    c: state.className || '',
    e: state.cloudEmail || '',
    u: state.targetUniversity,
    x: state.xp,
    st: state.streakDays,
    ids: state.solvedIds.slice(0, 500),
    ec: state.examCount,
    sub: state.submissions.slice(0, 25),
    ex: state.examAttempts.slice(0, 15),
  };
  return btoa(encodeURIComponent(JSON.stringify(compact)));
}

export function importSyncToken(token: string, current: UserProgressState): UserProgressState {
  const jsonStr = decodeURIComponent(atob(token.trim()));
  const parsed = JSON.parse(jsonStr);
  if (!parsed || !Array.isArray(parsed.ids)) {
    throw new Error('Mã đồng bộ không đúng định dạng.');
  }
  const mergedIds = Array.from(new Set([...current.solvedIds, ...parsed.ids])).slice(0, 500);
  const nextName = String(parsed.d || current.displayName).slice(0, 100);
  const nextEmail = String(parsed.e ?? current.cloudEmail ?? '').slice(0, 120);
  const next: UserProgressState = {
    ...current,
    displayName: nextName,
    schoolName: String(parsed.s ?? current.schoolName).slice(0, 150),
    className: String(parsed.c ?? current.className ?? '').slice(0, 50),
    cloudEmail: nextEmail,
    targetUniversity: String(parsed.u ?? current.targetUniversity).slice(0, 150),
    profileCompleted: Boolean(
      nextName.trim().length > 0 || nextEmail.trim().length > 0 || current.profileCompleted
    ),
    xp: Math.max(current.xp, Number(parsed.x) || 0),
    streakDays: Math.max(current.streakDays, Number(parsed.st) || 1),
    solvedIds: mergedIds,
    solvedCount: mergedIds.length,
    examCount: Math.max(current.examCount, Number(parsed.ec) || 0),
    deviceLabel: getBrowserDeviceLabel(),
    lastSyncedIso: new Date().toISOString(),
    submissions: Array.isArray(parsed.sub) ? parsed.sub : current.submissions,
    examAttempts: Array.isArray(parsed.ex) ? parsed.ex : current.examAttempts,
  };
  saveLocalProgress(next);
  return next;
}

/**
 * Automatically reads BOTH `/leaderboard/{syncKey}` AND `/user_progress/{uid}` from the Firestore server
 * (bypassing stale browser cache via getDocFromServer), merges all solved problems, XP, exam counts,
 * submissions, saved code, and profile fields, and writes the unified state back to both collections.
 */
export async function syncProgressWithCloud(
  uid: string,
  localState: UserProgressState
): Promise<UserProgressState> {
  const deviceLabel = (getBrowserDeviceLabel() || 'Thiết bị Web').slice(0, 100);
  const authUser = auth.currentUser;
  const authEmail = (authUser?.email || localState.cloudEmail || '').trim().toLowerCase();
  const effectiveUid = authUser?.uid || uid || localState.userId;
  const safeUid = sanitizeId(effectiveUid);
  const syncKey = getCanonicalSyncKey(localState, effectiveUid, authEmail);

  let lbSnapData: Record<string, unknown> | null = null;
  let lbExists = false;
  let userSnapData: Record<string, unknown> | null = null;
  let userExists = false;

  const lbRef =
    syncKey && !isIgnoredTestEntry(syncKey, localState.displayName)
      ? doc(db, 'leaderboard', syncKey)
      : null;
  const userDocRef =
    safeUid && safeUid !== 'local_scholar' ? doc(db, 'user_progress', safeUid) : null;

  // Read both documents in parallel directly from Firestore Server (bypasses stale cache)
  await Promise.all([
    (async () => {
      if (!lbRef) return;
      try {
        const snap = await fetchFreshDoc(lbRef);
        if (snap.exists()) {
          lbExists = true;
          lbSnapData = snap.data() as Record<string, unknown>;
        }
      } catch (err) {
        console.warn('Could not read leaderboard doc:', err);
      }
    })(),
    (async () => {
      if (!userDocRef) return;
      try {
        const snap = await fetchFreshDoc(userDocRef);
        if (snap.exists()) {
          userExists = true;
          userSnapData = snap.data() as Record<string, unknown>;
        }
      } catch (err) {
        console.warn('Could not read user_progress doc:', err);
      }
    })(),
  ]);

  const lbSolved = Array.isArray(lbSnapData?.solvedIds)
    ? (lbSnapData!.solvedIds as unknown[]).map((x) => sanitizeId(String(x)))
    : [];
  const userSolved = Array.isArray(userSnapData?.solvedIds)
    ? (userSnapData!.solvedIds as unknown[]).map((x) => sanitizeId(String(x)))
    : [];
  const localSolved = localState.solvedIds.map((x) => sanitizeId(String(x)));

  const mergedSolved = Array.from(
    new Set([...localSolved, ...lbSolved, ...userSolved].filter(Boolean))
  ).slice(0, 500);

  const mergedXp = Math.max(
    0,
    Math.min(
      10000000,
      Math.round(
        Math.max(
          localState.xp || 0,
          Number(lbSnapData?.xp) || 0,
          Number(userSnapData?.xp) || 0
        )
      )
    )
  );

  const mergedStreak = Math.max(
    1,
    Math.min(
      10000,
      Math.round(
        Math.max(
          localState.streakDays || 1,
          Number(lbSnapData?.streakDays) || 1,
          Number(userSnapData?.streakDays) || 1
        )
      )
    )
  );

  const mergedExamCount = Math.max(
    0,
    Math.min(
      10000,
      Math.round(
        Math.max(
          localState.examCount || 0,
          Number(lbSnapData?.examCount) || 0,
          Number(userSnapData?.examCount) || 0
        )
      )
    )
  );

  const displayName = (
    localState.displayName.trim() ||
    String(lbSnapData?.displayName || '').trim() ||
    String(userSnapData?.displayName || '').trim() ||
    (authUser?.displayName || '').trim() ||
    (authEmail ? authEmail.split('@')[0] : '') ||
    'Học Sinh'
  ).slice(0, 100);

  const schoolName = (
    localState.schoolName.trim() ||
    String(lbSnapData?.schoolName || '').trim() ||
    String(userSnapData?.schoolName || '').trim() ||
    ''
  ).slice(0, 150);

  const className = (
    (localState.className || '').trim() ||
    String(lbSnapData?.className || '').trim() ||
    ''
  ).slice(0, 50);

  const targetUniversity = (
    (localState.targetUniversity || '').trim() ||
    String(userSnapData?.targetUniversity || '').trim() ||
    ''
  ).slice(0, 150);

  // Write unified state to /leaderboard/{syncKey} so both Leaderboard and Cross-Device Sync stay 100% up-to-date
  if (lbRef && syncKey && (localState.profileCompleted || displayName !== 'Học Sinh' || authEmail)) {
    const lbPayload = {
      syncKey,
      displayName,
      schoolName,
      className,
      xp: mergedXp,
      streakDays: mergedStreak,
      solvedCount: mergedSolved.length,
      solvedIds: mergedSolved,
      examCount: mergedExamCount,
      deviceLabel,
      updatedAt: serverTimestamp(),
    };
    try {
      if (!lbExists) {
        await setDoc(lbRef, lbPayload);
      } else {
        await updateDoc(lbRef, lbPayload);
      }
    } catch (lbWriteErr) {
      console.warn('Could not write leaderboard doc:', lbWriteErr);
    }
  }

  const mergedSubsMap = new Map<string, SubmissionItem>();
  localState.submissions.forEach((s) => mergedSubsMap.set(s.submissionId, s));
  const mergedSavedCode: Record<string, string> = {
    ...(localState.savedCodeByProblem || {}),
  };

  // If Firebase Auth currentUser matches uid, also write unified state to /user_progress/{safeUid} and pull submissions
  if (authUser && userDocRef && sanitizeId(authUser.uid) === safeUid) {
    try {
      if (!userExists) {
        await setDoc(userDocRef, {
          userId: safeUid,
          displayName,
          schoolName,
          targetUniversity,
          xp: mergedXp,
          streakDays: mergedStreak,
          solvedCount: mergedSolved.length,
          solvedIds: mergedSolved,
          examCount: mergedExamCount,
          deviceLabel,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(userDocRef, {
          displayName,
          schoolName,
          targetUniversity,
          xp: mergedXp,
          streakDays: mergedStreak,
          solvedCount: mergedSolved.length,
          solvedIds: mergedSolved,
          examCount: mergedExamCount,
          deviceLabel,
          updatedAt: serverTimestamp(),
        });
      }

      try {
        const subsPath = `user_progress/${safeUid}/submissions`;
        const subsQuery = query(
          collection(db, subsPath),
          where('userId', '==', safeUid),
          limit(30)
        );
        const subsSnap = await fetchFreshDocs(subsQuery);
        subsSnap.docs.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          const subItem: SubmissionItem = {
            submissionId: String(data.submissionId),
            userId: String(data.userId),
            problemId: String(data.problemId),
            problemTitle: String(data.problemTitle),
            language: data.language as Language,
            difficulty: data.difficulty as Difficulty,
            code: String(data.code),
            passed: Boolean(data.passed),
            score: Number(data.score) || 0,
            createdAtIso: new Date().toISOString(),
          };
          mergedSubsMap.set(subItem.submissionId, subItem);
          // Populate savedCodeByProblem on secondary device if not yet present locally
          if (subItem.problemId && subItem.code && !mergedSavedCode[subItem.problemId]) {
            mergedSavedCode[subItem.problemId] = subItem.code;
          }
        });
      } catch {
        // Ignore subcollection read error
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `user_progress/${safeUid}`);
    }
  }

  const finalState: UserProgressState = {
    ...localState,
    userId: safeUid,
    displayName,
    schoolName,
    className,
    cloudEmail: authEmail || localState.cloudEmail,
    targetUniversity,
    profileCompleted: Boolean(
      localState.profileCompleted || displayName.trim().length > 0 || authEmail.length > 0
    ),
    xp: mergedXp,
    streakDays: mergedStreak,
    solvedIds: mergedSolved,
    solvedCount: mergedSolved.length,
    examCount: mergedExamCount,
    deviceLabel,
    lastSyncedIso: new Date().toISOString(),
    submissions: Array.from(mergedSubsMap.values()).slice(0, 35),
    savedCodeByProblem: mergedSavedCode,
  };

  saveLocalProgress(finalState);
  return finalState;
}

/**
 * Subscribes in real-time (via Firestore onSnapshot) to the user's cross-device cloud documents
 * so that solving a problem or updating account info on PC immediately updates the Phone automatically.
 */
export function subscribeToCrossDeviceProgress(
  syncKey: string,
  firebaseUid: string | null,
  onRemoteData: (remote: {
    displayName?: string;
    schoolName?: string;
    className?: string;
    xp: number;
    streakDays: number;
    solvedIds: string[];
    examCount: number;
    deviceLabel?: string;
  }) => void
): () => void {
  const unsubscribers: Array<() => void> = [];

  if (syncKey && !isIgnoredTestEntry(syncKey)) {
    const lbRef = doc(db, 'leaderboard', syncKey);
    const unsubLb = onSnapshot(
      lbRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const remoteSolved = Array.isArray(data.solvedIds)
          ? data.solvedIds.map((id: unknown) => sanitizeId(String(id)))
          : [];
        onRemoteData({
          displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
          schoolName: typeof data.schoolName === 'string' ? data.schoolName : undefined,
          className: typeof data.className === 'string' ? data.className : undefined,
          xp: Number(data.xp) || 0,
          streakDays: Number(data.streakDays) || 1,
          solvedIds: remoteSolved,
          examCount: Number(data.examCount) || 0,
          deviceLabel: typeof data.deviceLabel === 'string' ? data.deviceLabel : undefined,
        });
      },
      (err) => {
        console.warn('Cross-device realtime listener warning:', err);
      }
    );
    unsubscribers.push(unsubLb);
  }

  if (firebaseUid && firebaseUid !== 'local_scholar') {
    const safeUid = sanitizeId(firebaseUid);
    const userRef = doc(db, 'user_progress', safeUid);
    const unsubUser = onSnapshot(
      userRef,
      { includeMetadataChanges: true },
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const remoteSolved = Array.isArray(data.solvedIds)
          ? data.solvedIds.map((id: unknown) => sanitizeId(String(id)))
          : [];
        onRemoteData({
          displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
          schoolName: typeof data.schoolName === 'string' ? data.schoolName : undefined,
          xp: Number(data.xp) || 0,
          streakDays: Number(data.streakDays) || 1,
          solvedIds: remoteSolved,
          examCount: Number(data.examCount) || 0,
          deviceLabel: typeof data.deviceLabel === 'string' ? data.deviceLabel : undefined,
        });
      },
      (err) => {
        console.warn('User progress realtime listener warning:', err);
      }
    );
    unsubscribers.push(unsubUser);
  }

  return () => {
    unsubscribers.forEach((fn) => fn());
  };
}

/**
 * Subscribes in real time to ALL real registered users in the web app across both
 * `/leaderboard` and `/user_progress` collections in Firestore, merging duplicates automatically.
 */
export function subscribeToLeaderboard(
  onUpdate: (entries: CloudLeaderboardEntry[]) => void
): () => void {
  let lbItems: CloudLeaderboardEntry[] = [];
  let userItems: CloudLeaderboardEntry[] = [];

  const emitMerged = () => {
    const byName = new Map<string, CloudLeaderboardEntry>();

    const upsert = (entry: CloudLeaderboardEntry) => {
      const cleanName = entry.displayName.trim();
      if (!cleanName || isIgnoredTestEntry(entry.syncKey, cleanName)) return;

      const nameKey = cleanName.toLowerCase();
      const existing = byName.get(nameKey);

      if (!existing) {
        byName.set(nameKey, entry);
      } else {
        const mergedSolved = Array.from(
          new Set([...existing.solvedIds, ...entry.solvedIds])
        );
        const merged: CloudLeaderboardEntry = {
          syncKey:
            existing.syncKey.startsWith('acct_') || existing.syncKey.startsWith('uid_')
              ? existing.syncKey
              : entry.syncKey,
          displayName: cleanName || existing.displayName,
          schoolName: entry.schoolName.trim() || existing.schoolName,
          className: entry.className.trim() || existing.className,
          xp: Math.max(existing.xp, entry.xp),
          streakDays: Math.max(existing.streakDays, entry.streakDays),
          solvedCount: Math.max(
            existing.solvedCount,
            entry.solvedCount,
            mergedSolved.length
          ),
          solvedIds: mergedSolved,
          examCount: Math.max(existing.examCount, entry.examCount),
          deviceLabel: entry.deviceLabel || existing.deviceLabel,
          updatedAtIso: entry.updatedAtIso || existing.updatedAtIso,
        };
        byName.set(nameKey, merged);
      }
    };

    userItems.forEach(upsert);
    lbItems.forEach(upsert);

    const sorted = Array.from(byName.values()).sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp;
      return b.solvedCount - a.solvedCount;
    });

    onUpdate(sorted);
  };

  const qLb = query(collection(db, 'leaderboard'), orderBy('xp', 'desc'), limit(100));
  const unsubLb = onSnapshot(
    qLb,
    (snap) => {
      lbItems = snap.docs
        .filter((d) => !isIgnoredTestEntry(d.id, String(d.data()?.displayName || '')))
        .map((d) => {
          const data = d.data();
          const solvedIds = Array.isArray(data.solvedIds)
            ? data.solvedIds.map((x: unknown) => String(x))
            : [];
          return {
            syncKey: String(data.syncKey || d.id),
            displayName: String(data.displayName || '').trim(),
            schoolName: String(data.schoolName || '').trim(),
            className: String(data.className || '').trim(),
            xp: Number(data.xp) || 0,
            streakDays: Number(data.streakDays) || 1,
            solvedCount: Number(data.solvedCount) || solvedIds.length,
            solvedIds,
            examCount: Number(data.examCount) || 0,
            deviceLabel: String(data.deviceLabel || 'Thiết bị Web'),
            updatedAtIso: new Date().toISOString(),
          };
        });
      emitMerged();
    },
    (err) => {
      console.warn('Leaderboard collection listener warning:', err);
      emitMerged();
    }
  );

  const qUsers = query(collection(db, 'user_progress'), orderBy('xp', 'desc'), limit(100));
  const unsubUsers = onSnapshot(
    qUsers,
    (snap) => {
      userItems = snap.docs.map((d) => {
        const data = d.data();
        const solvedIds = Array.isArray(data.solvedIds)
          ? data.solvedIds.map((x: unknown) => String(x))
          : [];
        return {
          syncKey: sanitizeId(`uid_${String(data.userId || d.id)}`),
          displayName: String(data.displayName || '').trim(),
          schoolName: String(data.schoolName || '').trim(),
          className: String(data.className || '').trim(),
          xp: Number(data.xp) || 0,
          streakDays: Number(data.streakDays) || 1,
          solvedCount: Number(data.solvedCount) || solvedIds.length,
          solvedIds,
          examCount: Number(data.examCount) || 0,
          deviceLabel: String(data.deviceLabel || 'Thiết bị Web'),
          updatedAtIso: new Date().toISOString(),
        };
      });
      emitMerged();
    },
    (err) => {
      console.warn('UserProgress collection listener warning:', err);
      emitMerged();
    }
  );

  return () => {
    unsubLb();
    unsubUsers();
  };
}

export async function recordCloudSubmission(
  uid: string,
  sub: SubmissionItem,
  updatedState: UserProgressState
): Promise<UserProgressState> {
  const safeUid = sanitizeId(uid || updatedState.userId);
  const syncedState = await syncProgressWithCloud(safeUid, updatedState);

  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return syncedState;
  }

  const safeSubId = sanitizeId(sub.submissionId);
  const subPath = `user_progress/${safeUid}/submissions/${safeSubId}`;

  try {
    await setDoc(doc(db, 'user_progress', safeUid, 'submissions', safeSubId), {
      submissionId: safeSubId,
      userId: safeUid,
      problemId: sanitizeId(sub.problemId),
      problemTitle: sub.problemTitle.slice(0, 200),
      language: sub.language,
      difficulty: sub.difficulty,
      code: sub.code.slice(0, 20000) || '# Empty',
      passed: Boolean(sub.passed),
      score: Math.max(0, Math.min(1000, Math.round(sub.score))),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, subPath);
  }
  return syncedState;
}

export async function recordCloudExamAttempt(
  uid: string,
  attempt: ExamAttemptItem,
  updatedState: UserProgressState
): Promise<UserProgressState> {
  const safeUid = sanitizeId(uid || updatedState.userId);
  const syncedState = await syncProgressWithCloud(safeUid, updatedState);

  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return syncedState;
  }

  const safeAttemptId = sanitizeId(attempt.attemptId);
  const attemptPath = `user_progress/${safeUid}/exam_attempts/${safeAttemptId}`;

  try {
    await setDoc(doc(db, 'user_progress', safeUid, 'exam_attempts', safeAttemptId), {
      attemptId: safeAttemptId,
      userId: safeUid,
      examId: sanitizeId(attempt.examId),
      examTitle: attempt.examTitle.slice(0, 200),
      totalScore: Math.max(0, Math.min(1000, Number(attempt.totalScore))),
      maxScore: Math.max(1, Math.min(1000, Number(attempt.maxScore))),
      durationSeconds: Math.max(0, Math.min(86400, Math.round(attempt.durationSeconds))),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, attemptPath);
  }
  return syncedState;
}
