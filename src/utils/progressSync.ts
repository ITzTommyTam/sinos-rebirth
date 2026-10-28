import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
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

export function loadLocalProgress(): UserProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultProgress();
    const parsed = JSON.parse(raw) as Partial<UserProgressState>;
    const def = getDefaultProgress();
    const displayName = typeof parsed.displayName === 'string' ? parsed.displayName : '';
    const cloudEmail = typeof parsed.cloudEmail === 'string' ? parsed.cloudEmail : '';
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
      solvedIds: Array.isArray(parsed.solvedIds) ? parsed.solvedIds.slice(0, 500) : def.solvedIds,
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
 * Synchronizes local progress with Firestore `/user_progress/{uid}` adhering strictly
 * to the schema and security rules in `firestore.rules`.
 */
export async function syncProgressWithCloud(
  uid: string,
  localState: UserProgressState
): Promise<UserProgressState> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return localState;
  }

  const safeUid = sanitizeId(uid);
  const userDocPath = `user_progress/${safeUid}`;
  const userDocRef = doc(db, 'user_progress', safeUid);
  const authEmail = auth.currentUser.email || localState.cloudEmail || '';

  try {
    const snap = await getDoc(userDocRef);
    const deviceLabel = getBrowserDeviceLabel().slice(0, 100);

    if (!snap.exists()) {
      const sanitizedSolved = localState.solvedIds
        .map((id) => sanitizeId(id))
        .slice(0, 500);

      const createPayload = {
        userId: safeUid,
        displayName: (
          localState.displayName ||
          auth.currentUser.displayName ||
          (authEmail ? authEmail.split('@')[0] : '') ||
          'Học Sinh'
        ).slice(0, 100),
        schoolName: (localState.schoolName || '').slice(0, 150),
        targetUniversity: (localState.targetUniversity || '').slice(0, 150),
        xp: Math.max(0, Math.min(10000000, Math.round(localState.xp))),
        streakDays: Math.max(0, Math.min(10000, Math.round(localState.streakDays))),
        solvedCount: sanitizedSolved.length,
        solvedIds: sanitizedSolved,
        examCount: Math.max(0, Math.min(10000, Math.round(localState.examCount))),
        deviceLabel,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(userDocRef, createPayload);
      const updatedState: UserProgressState = {
        ...localState,
        userId: safeUid,
        displayName: createPayload.displayName,
        cloudEmail: authEmail,
        profileCompleted: true,
        solvedIds: sanitizedSolved,
        solvedCount: sanitizedSolved.length,
        deviceLabel,
        lastSyncedIso: new Date().toISOString(),
      };
      saveLocalProgress(updatedState);
      return updatedState;
    } else {
      const cloudData = snap.data();
      const cloudSolved: string[] = Array.isArray(cloudData.solvedIds) ? cloudData.solvedIds : [];
      const mergedSolved = Array.from(
        new Set([...localState.solvedIds.map(sanitizeId), ...cloudSolved.map(sanitizeId)])
      ).slice(0, 500);

      const mergedXp = Math.max(localState.xp, Number(cloudData.xp) || 0);
      const mergedStreak = Math.max(localState.streakDays, Number(cloudData.streakDays) || 1);
      const mergedExamCount = Math.max(localState.examCount, Number(cloudData.examCount) || 0);
      const displayName = (
        localState.displayName ||
        cloudData.displayName ||
        auth.currentUser.displayName ||
        'Học Sinh'
      ).slice(0, 100);
      const schoolName = (localState.schoolName || cloudData.schoolName || '').slice(0, 150);
      const targetUniversity = (localState.targetUniversity || cloudData.targetUniversity || '').slice(0, 150);

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

      const mergedSubsMap = new Map<string, SubmissionItem>();
      localState.submissions.forEach((s) => mergedSubsMap.set(s.submissionId, s));

      try {
        const subsPath = `user_progress/${safeUid}/submissions`;
        const subsQuery = query(
          collection(db, subsPath),
          where('userId', '==', safeUid),
          limit(20)
        );
        const subsSnap = await getDocs(subsQuery);
        subsSnap.docs.forEach((d) => {
          const data = d.data();
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
        });
      } catch (subErr) {
        console.warn('Skipping subcollection sync:', subErr);
      }

      const mergedState: UserProgressState = {
        ...localState,
        userId: safeUid,
        displayName,
        schoolName,
        cloudEmail: authEmail,
        targetUniversity,
        profileCompleted: true,
        xp: mergedXp,
        streakDays: mergedStreak,
        solvedIds: mergedSolved,
        solvedCount: mergedSolved.length,
        examCount: mergedExamCount,
        deviceLabel,
        lastSyncedIso: new Date().toISOString(),
        submissions: Array.from(mergedSubsMap.values()).slice(0, 30),
      };
      saveLocalProgress(mergedState);
      return mergedState;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userDocPath);
  }
}

export async function recordCloudSubmission(
  uid: string,
  sub: SubmissionItem,
  updatedState: UserProgressState
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeUid = sanitizeId(uid);
  const safeSubId = sanitizeId(sub.submissionId);
  const subPath = `user_progress/${safeUid}/submissions/${safeSubId}`;

  try {
    await syncProgressWithCloud(safeUid, updatedState);

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
}

export async function recordCloudExamAttempt(
  uid: string,
  attempt: ExamAttemptItem,
  updatedState: UserProgressState
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const safeUid = sanitizeId(uid);
  const safeAttemptId = sanitizeId(attempt.attemptId);
  const attemptPath = `user_progress/${safeUid}/exam_attempts/${safeAttemptId}`;

  try {
    await syncProgressWithCloud(safeUid, updatedState);

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
}
