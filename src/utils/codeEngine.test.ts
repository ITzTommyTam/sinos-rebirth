import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSyntax,
  autoUppercaseSql,
  executeAndGrade,
  generateMeetRoomCode,
  getDefaultEditorCode,
  getLiveCommandOutput,
  isBlockedDevToolsShortcut,
  mergeRoomParticipants,
  parseMeetPeerPayload,
  runPythonCode,
  sanitizeHtmlForPreview,
  selectSpotlightParticipant,
  serializeMeetPeerPayload,
} from './codeEngine';
import { INITIAL_PROBLEMS, generateInfiniteProblem } from './problemCatalog';
import { MOCK_EXAMS, gradeMockExam } from './examCatalog';
import { getCanonicalSyncKey, getDefaultProgress, isIgnoredTestEntry } from './progressSync';

test('Python syntax analyzer detects missing colon and assignment in if condition', () => {
  const diagnostics = analyzeSyntax('if x = 5\n    print(x)', 'python');
  assert.equal(diagnostics.some((d) => d.severity === 'error'), true);
});

test('HTML syntax analyzer detects unclosed tags', () => {
  const diagnostics = analyzeSyntax('<table><tr><td>Dữ liệu</td></table>', 'html');
  assert.equal(diagnostics.some((d) => d.severity === 'error'), true);
});

test('SQL syntax analyzer detects SELECT without FROM and typo SELCET', () => {
  const diag1 = analyzeSyntax('SELCET * FROM HOC_SINH;', 'sql');
  assert.equal(diag1.some((d) => d.severity === 'error'), true);
  const diag2 = analyzeSyntax('SELECT ma_hs, ho_ten;', 'sql');
  assert.equal(diag2.some((d) => d.severity === 'error'), true);
});

test('Problem catalog pre-loads 400 completely unique problems (100 Python, 100 HTML, 100 SQL, 100 Algorithm) and all 400 pass grading', () => {
  assert.equal(INITIAL_PROBLEMS.length, 400);
  const pyProbs = INITIAL_PROBLEMS.filter((p) => p.categoryMode === 'python');
  const htmlProbs = INITIAL_PROBLEMS.filter((p) => p.categoryMode === 'html');
  const sqlProbs = INITIAL_PROBLEMS.filter((p) => p.categoryMode === 'sql');
  const algoProbs = INITIAL_PROBLEMS.filter((p) => p.categoryMode === 'algorithm');

  assert.equal(pyProbs.length, 100);
  assert.equal(htmlProbs.length, 100);
  assert.equal(sqlProbs.length, 100);
  assert.equal(algoProbs.length, 100);

  // Verify 100% uniqueness across all 400 problems
  const ids = new Set(INITIAL_PROBLEMS.map((p) => p.id));
  const codeNumbers = new Set(INITIAL_PROBLEMS.map((p) => p.codeNumber));
  const titles = new Set(INITIAL_PROBLEMS.map((p) => p.title.trim().toLowerCase()));
  const descriptions = new Set(INITIAL_PROBLEMS.map((p) => p.description.trim().toLowerCase()));
  const specs = new Set(INITIAL_PROBLEMS.map((p) => p.taskSpecification.trim().toLowerCase()));

  assert.equal(ids.size, 400, 'Every problem must have a unique id');
  assert.equal(codeNumbers.size, 400, 'Every problem must have a unique codeNumber');
  assert.equal(titles.size, 400, 'Every problem must have a unique title');
  assert.equal(descriptions.size, 400, 'Every problem must have a unique description');
  assert.equal(specs.size, 400, 'Every problem must have a unique taskSpecification');

  const failures: string[] = [];
  for (const prob of INITIAL_PROBLEMS) {
    assert.equal(
      /\(Bài #\d+\)/i.test(prob.title),
      false,
      `Problem ${prob.codeNumber} has repetitive template suffix in title: ${prob.title}`
    );
    const report = executeAndGrade(prob, prob.solutionCode);
    if (!report.passedAll) {
      failures.push(
        `${prob.codeNumber} (${prob.id}): ${JSON.stringify(
          report.testResults.filter((t) => !t.passed)
        )} | diag: ${JSON.stringify(report.diagnostics)}`
      );
    }
  }
  assert.deepEqual(failures, []);
});

test('Exam catalog pre-loads 100 THPT Quốc Gia GDPT 2018 mock exams without V-ACT', () => {
  assert.equal(MOCK_EXAMS.length, 100);
  const hasVact = MOCK_EXAMS.some(
    (e) => e.title.includes('V-ACT') || e.category.includes('V-ACT')
  );
  assert.equal(hasVact, false);
});

test('Default account setup form starts empty and requires student completion before learning', () => {
  const def = getDefaultProgress();
  assert.equal(def.displayName, '');
  assert.equal(def.schoolName, '');
  assert.equal(def.profileCompleted, false);
});

test('Infinite Problem Generator creates valid solvable problems across languages and difficulties', () => {
  const languages = ['python', 'html', 'sql'] as const;
  const difficulties = ['easy', 'medium', 'hard', 'advanced'] as const;
  let seed = 1;
  for (const lang of languages) {
    for (const diff of difficulties) {
      const generated = generateInfiniteProblem(lang, diff, seed++);
      const report = executeAndGrade(generated, generated.solutionCode);
      assert.equal(
        report.passedAll,
        true,
        `Generated problem ${generated.id} failed grading: ${JSON.stringify(report.testResults)}`
      );
    }
  }
});

test('Mock exam grading enforces GDPT 2018 Bộ GD&ĐT progressive True/False scoring (0.1, 0.25, 0.5, 1.0)', () => {
  const exam = MOCK_EXAMS[0];
  const fullResult = gradeMockExam(
    exam,
    { q1: 'A', q2: 'A', q3: 'B', q4: 'B' },
    {
      q5: { a: true, b: false, c: false, d: true }, // 4/4 correct -> 1.0
      q6: { a: true, b: true, c: false, d: false }, // 3/4 correct -> 0.5
    }
  );
  assert.equal(fullResult.totalScore, 2.5);
  assert.equal(fullResult.maxScore, 3.0);
});

test('getLiveCommandOutput handles empty editor and returns live output for Python/SQL/HTML statements', () => {
  const pyProb = INITIAL_PROBLEMS.find((p) => p.language === 'python')!;
  const emptyRes = getLiveCommandOutput(pyProb, '', 0);
  assert.equal(emptyRes.currentStatement, '(Trống)');

  const pyRes = getLiveCommandOutput(pyProb, 'x = 40 * 1800\nprint(x)', 18);
  assert.equal(pyRes.currentStatement, 'print(x)');
  assert.equal(pyRes.liveOutput.includes('72000'), true);
});

test('Security: Python sandbox blocks DOM, storage, network, and prototype access while allowing strings containing those words', () => {
  const blockedPayloads = [
    'print(window.location)',
    'x = localStorage.getItem("token")',
    'fetch("https://evil.example")',
    'print(document.cookie)',
    'x = "".__proto__',
  ];
  for (const payload of blockedPayloads) {
    const res = runPythonCode(payload, '');
    assert.equal(Boolean(res.error && res.error.includes('SecurityError')), true, `Expected payload to be blocked: ${payload}`);
  }

  // Legitimate string literal containing the word "window" must still execute normally
  const safeString = runPythonCode('print("Sliding window algorithm")', '');
  assert.equal(safeString.error, undefined);
  assert.equal(safeString.stdout, 'Sliding window algorithm');
});

test('Security: sanitizeHtmlForPreview strips script tags, event handlers, and javascript URIs', () => {
  const maliciousHtml =
    '<h1>Bảng điểm</h1><script>alert(document.cookie)</script><img src="x" onerror="alert(1)" alt="Anh"><a href="javascript:alert(2)">Link</a><iframe src="https://evil.com"></iframe>';
  const cleaned = sanitizeHtmlForPreview(maliciousHtml);
  assert.equal(cleaned.includes('<script'), false);
  assert.equal(cleaned.includes('onerror'), false);
  assert.equal(cleaned.includes('javascript:'), false);
  assert.equal(cleaned.includes('<iframe'), false);
  assert.equal(cleaned.includes('<h1>Bảng điểm</h1>'), true);
});

test('Cross-device sync: getCanonicalSyncKey maps PC and Phone with the same email to the exact same syncKey', () => {
  const pcState = {
    ...getDefaultProgress(),
    userId: 'firebase_uid_pc_123',
    cloudEmail: 'HocSinh2009@gmail.com ',
    displayName: 'Nguyễn Văn A (PC)',
  };
  const phoneState = {
    ...getDefaultProgress(),
    userId: 'google_hocsinh2009_gmail_com',
    cloudEmail: 'hocsinh2009@gmail.com',
    displayName: 'Nguyễn Văn A (Mobile)',
  };

  const pcKey = getCanonicalSyncKey(pcState, 'firebase_uid_pc_123', 'HocSinh2009@gmail.com');
  const phoneKey = getCanonicalSyncKey(phoneState, null, null);
  assert.equal(pcKey, phoneKey);
  assert.equal(pcKey.startsWith('acct_'), true);
});

test('SQL auto-uppercase converts only SQL functions and keywords to uppercase while preserving column/table names, string literals, and exact length', () => {
  const rawSql = "select ma_hs, ho_ten, count(*) as so_luong from hoc_sinh where xep_loai = 'Giỏi' order by diem_tb desc;";
  const upperSql = autoUppercaseSql(rawSql);
  assert.equal(
    upperSql,
    "SELECT ma_hs, ho_ten, COUNT(*) AS so_luong FROM hoc_sinh WHERE xep_loai = 'Giỏi' ORDER BY diem_tb DESC;"
  );
  assert.equal(upperSql.length, rawSql.length);

  // Verify snake_case column names starting with a function prefix (e.g. MIN_diem, MAX_diem) revert to lowercase
  const snakeCaseProgress = autoUppercaseSql('select MIN_diem, MAX_diem, COUNT_hs from bang_diem');
  assert.equal(snakeCaseProgress, 'SELECT min_diem, max_diem, count_hs FROM bang_diem');
});

test('getDefaultEditorCode pre-populates bare HTML skeleton without title, style, or comments for HTML problems and empty string for Python/SQL', () => {
  const htmlProb = INITIAL_PROBLEMS.find((p) => p.language === 'html')!;
  const pyProb = INITIAL_PROBLEMS.find((p) => p.language === 'python')!;
  const sqlProb = INITIAL_PROBLEMS.find((p) => p.language === 'sql')!;

  const htmlDefault = getDefaultEditorCode(htmlProb);
  assert.equal(htmlDefault.includes('<!DOCTYPE html>'), true);
  assert.equal(htmlDefault.includes('<html lang="vi">'), true);
  assert.equal(htmlDefault.includes('<head>'), true);
  assert.equal(htmlDefault.includes('<body>'), true);
  assert.equal(htmlDefault.includes('</html>'), true);
  assert.equal(htmlDefault.includes('<title'), false);
  assert.equal(htmlDefault.includes('<style'), false);
  assert.equal(htmlDefault.includes('<!--'), false);
  assert.equal(htmlDefault.includes('/*'), false);
  assert.deepEqual(analyzeSyntax(htmlDefault, 'html'), []);

  assert.equal(getDefaultEditorCode(pyProb), '');
  assert.equal(getDefaultEditorCode(sqlProb), '');
});

test('isIgnoredTestEntry filters out automated test accounts (such as Nguyễn Văn A, Học Sinh Máy 1, Bạn Học Máy 2) while preserving real registered users', () => {
  assert.equal(isIgnoredTestEntry('acct_nguyenvana_cd174226_5b8a6e42', 'Nguyễn Văn A'), true);
  assert.equal(isIgnoredTestEntry('uid_test_playwright_m1', 'Học Sinh Máy 1'), true);
  assert.equal(isIgnoredTestEntry('uid_test_playwright_m2', 'Bạn Học Máy 2'), true);
  assert.equal(isIgnoredTestEntry('std_c96d290c', 'Tester'), true);
  assert.equal(isIgnoredTestEntry('std_c789ed49', 'Lê Minh Tuấn'), true);
  assert.equal(isIgnoredTestEntry('std_6fe40b0c', 'aaa'), true);
  assert.equal(isIgnoredTestEntry('acct_tamdayne2009_86881558_1465c0a2', 'ITz_Tommy (KVM,AOSP Developers)'), false);
  assert.equal(isIgnoredTestEntry('uid_QykxgoNKbjcGl11dJJhqbe5e22I2', 'Võ Nguyên Minh'), false);
});

test('Security: isBlockedDevToolsShortcut blocks F12 and DevTools/View-Source shortcuts while allowing standard typing and editor shortcuts', () => {
  assert.equal(isBlockedDevToolsShortcut({ key: 'F12', code: 'F12', keyCode: 123 }), true);
  assert.equal(isBlockedDevToolsShortcut({ keyCode: 123 }), true);
  assert.equal(isBlockedDevToolsShortcut({ key: 'I', ctrlKey: true, shiftKey: true }), true);
  assert.equal(isBlockedDevToolsShortcut({ key: 'j', ctrlKey: true, shiftKey: true }), true);
  assert.equal(isBlockedDevToolsShortcut({ key: 'C', ctrlKey: true, shiftKey: true }), true);
  assert.equal(isBlockedDevToolsShortcut({ key: 'i', metaKey: true, altKey: true }), true);
  assert.equal(isBlockedDevToolsShortcut({ key: 'u', ctrlKey: true, shiftKey: false }), true);

  // Standard editor shortcuts & typing must remain allowed
  assert.equal(isBlockedDevToolsShortcut({ key: 'c', ctrlKey: true, shiftKey: false }), false);
  assert.equal(isBlockedDevToolsShortcut({ key: 'v', ctrlKey: true, shiftKey: false }), false);
  assert.equal(isBlockedDevToolsShortcut({ key: 'Enter', ctrlKey: true }), false);
  assert.equal(isBlockedDevToolsShortcut({ key: 'a', code: 'KeyA' }), false);
});

test('Meet signaling: serializeMeetPeerPayload and parseMeetPeerPayload preserve peerName, screenFrame, and stay under Firestore 30k limit', () => {
  const raw = serializeMeetPeerPayload({
    type: 'answer',
    sdp: 'v=0\r\no=- 123 2 IN IP4 127.0.0.1\r\n',
    peerId: 'peer_guest_99',
    peerName: 'Thầy Minh (Giáo viên)',
    isSharing: true,
    screenFrame: 'data:image/jpeg;base64,abc123frame',
    chatList: [{ id: 'm1', sender: 'Thầy Minh', text: 'Các em nhìn màn hình thầy nhé!', time: '09:00' }],
    ts: 1700000000000,
  });
  assert.equal(raw.length <= 29000, true);
  const parsed = parseMeetPeerPayload(raw);
  assert.equal(parsed?.type, 'answer');
  assert.equal(parsed?.peerId, 'peer_guest_99');
  assert.equal(parsed?.peerName, 'Thầy Minh (Giáo viên)');
  assert.equal(parsed?.isSharing, true);
  assert.equal(parsed?.screenFrame, 'data:image/jpeg;base64,abc123frame');
  assert.equal(parsed?.chatList?.length, 1);

  // Oversized screenFrame (> 30k chars) is automatically stripped so Firestore write never fails
  const hugeFrame = 'data:image/jpeg;base64,' + 'A'.repeat(32000);
  const safeRaw = serializeMeetPeerPayload({
    type: 'offer',
    sdp: 'v=0\r\n',
    peerId: 'peer_host_1',
    peerName: 'Học sinh A',
    isSharing: true,
    screenFrame: hugeFrame,
    ts: 1700000000000,
  });
  assert.equal(safeRaw.length <= 29000, true);
  const safeParsed = parseMeetPeerPayload(safeRaw);
  assert.equal(safeParsed?.peerName, 'Học sinh A');
  assert.equal(safeParsed?.isSharing, true);
  assert.equal(safeParsed?.screenFrame, undefined);

  const code1 = generateMeetRoomCode();
  const code2 = generateMeetRoomCode();
  assert.equal(/^MEET-[A-Z0-9]{6}$/.test(code1), true);
  assert.equal(/^MEET-[A-Z0-9]{6}$/.test(code2), true);
  assert.notEqual(code1, code2);
});

test('Multi-participant Meet: mergeRoomParticipants deduplicates peers and selectSpotlightParticipant automatically enlarges active screen sharer', () => {
  const now = 1700000050000;
  const merged = mergeRoomParticipants(
    [
      {
        peerId: 'peer_local',
        peerName: 'Học sinh An',
        role: 'host',
        isMicOn: true,
        isSharing: false,
        isLocal: true,
        lastSeen: now - 5000,
      },
      {
        peerId: 'peer_2',
        peerName: 'Bạn Bình',
        role: 'guest',
        isMicOn: true,
        isSharing: false,
        lastSeen: now - 4000,
      },
    ],
    [
      {
        peerId: 'peer_2',
        peerName: 'Bạn Bình',
        role: 'guest',
        isMicOn: true,
        isSharing: true,
        screenFrame: 'data:image/jpeg;base64,binh_screen',
        lastSeen: now - 1000,
      },
      {
        peerId: 'peer_3',
        peerName: 'Cô Giáo Lan',
        role: 'guest',
        isMicOn: true,
        isSharing: false,
        lastSeen: now - 500,
      },
      {
        peerId: 'peer_expired',
        peerName: 'Người cũ',
        role: 'guest',
        isMicOn: false,
        isSharing: false,
        lastSeen: now - 2_000_000, // expired > 15m
      },
    ],
    now,
    900_000
  );

  assert.equal(merged.length, 3);
  assert.equal(merged[0].peerId, 'peer_local');

  // Automatically selects Bạn Bình because Bạn Bình is sharing screen
  const autoSpotlight = selectSpotlightParticipant(merged, null);
  assert.equal(autoSpotlight?.peerId, 'peer_2');
  assert.equal(autoSpotlight?.isSharing, true);
  assert.equal(autoSpotlight?.screenFrame, 'data:image/jpeg;base64,binh_screen');

  // Explicit pin overrides automatic selection
  const pinnedSpotlight = selectSpotlightParticipant(merged, 'peer_3');
  assert.equal(pinnedSpotlight?.peerId, 'peer_3');
  assert.equal(pinnedSpotlight?.peerName, 'Cô Giáo Lan');

  // Exiting spotlight (dismissedPeerId) hides the enlarged stage until re-pinned
  const dismissedSpotlight = selectSpotlightParticipant(merged, null, 'peer_2');
  assert.equal(dismissedSpotlight, null);
});



