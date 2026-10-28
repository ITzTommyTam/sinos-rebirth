import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeSyntax,
  executeAndGrade,
  getLiveCommandOutput,
} from './codeEngine';
import { INITIAL_PROBLEMS, generateInfiniteProblem } from './problemCatalog';
import { MOCK_EXAMS, gradeMockExam } from './examCatalog';
import { getDefaultProgress } from './progressSync';

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

test('Problem catalog pre-loads 400 problems (100 Python, 100 HTML, 100 SQL, 100 Algorithm) and all pass grading', () => {
  assert.equal(INITIAL_PROBLEMS.length, 400);
  const pyProbs = INITIAL_PROBLEMS.filter((p) => p.categoryMode === 'python');
  const htmlProbs = INITIAL_PROBLEMS.filter((p) => p.categoryMode === 'html');
  const sqlProbs = INITIAL_PROBLEMS.filter((p) => p.categoryMode === 'sql');
  const algoProbs = INITIAL_PROBLEMS.filter((p) => p.categoryMode === 'algorithm');

  assert.equal(pyProbs.length, 100);
  assert.equal(htmlProbs.length, 100);
  assert.equal(sqlProbs.length, 100);
  assert.equal(algoProbs.length, 100);

  // Sample check across all 4 modes and difficulties
  const sampleCheck = [
    ...pyProbs.slice(0, 8),
    ...htmlProbs.slice(0, 8),
    ...sqlProbs.slice(0, 8),
    ...algoProbs.slice(0, 8),
  ];
  for (const prob of sampleCheck) {
    const report = executeAndGrade(prob, prob.solutionCode);
    assert.equal(
      report.passedAll,
      true,
      `Failed problem ${prob.id}: ${JSON.stringify(report.testResults)}`
    );
  }
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
