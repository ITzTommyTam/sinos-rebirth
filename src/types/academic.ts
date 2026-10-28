export type Language = 'python' | 'html' | 'sql';

export type PracticeMode = 'python' | 'html' | 'sql' | 'algorithm';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'advanced';

export type ProblemSource =
  | 'Bộ GD&ĐT'
  | 'Genopy'
  | 'HackerRank'
  | 'LeetCode'
  | 'Codeforces'
  | 'VNOI'
  | 'CSES'
  | 'W3Schools'
  | 'Đề Sở GD&ĐT';

export interface PythonTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
  isHidden?: boolean;
}

export interface SqlTableSchema {
  tableName: string;
  columns: { name: string; type: string; description: string }[];
  rows: Record<string, string | number>[];
}

export interface HtmlRequirement {
  id: string;
  description: string;
  selector: string;
  attribute?: string;
  expectedValue?: string;
  minCount?: number;
  textIncludes?: string;
  cssRuleIncludes?: string;
}

export interface StructureSection {
  stepTitle: string;
  syntaxPattern: string;
  note: string;
}

export interface Problem {
  id: string;
  codeNumber: string;
  title: string;
  language: Language;
  categoryMode?: PracticeMode;
  isAlgorithm?: boolean;
  algorithmGroup?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  structureGuide?: StructureSection[];
  difficulty: Difficulty;
  source: ProblemSource;
  gradeTag: string;
  topic: string;
  xpReward: number;
  description: string;
  taskSpecification: string;
  constraints: string[];
  starterCode: string;
  solutionCode: string;
  hints: string[];
  // Language-specific grading payloads
  pythonTests?: PythonTestCase[];
  sqlTables?: SqlTableSchema[];
  sqlExpectedColumns?: string[];
  sqlExpectedRows?: Record<string, string | number>[];
  htmlRequirements?: HtmlRequirement[];
  isGenerated?: boolean;
}

export interface SyntaxDiagnostic {
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  suggestion: string;
}

export interface AutocompleteSuggestion {
  label: string;
  insertText: string;
  kind: 'keyword' | 'function' | 'snippet' | 'tag' | 'column';
  detail: string;
}

export interface TestCaseResult {
  id: string;
  label: string;
  passed: boolean;
  inputSummary: string;
  expectedSummary: string;
  actualSummary: string;
  detailMessage?: string;
}

export interface ExecutionReport {
  passedAll: boolean;
  passedCount: number;
  totalCount: number;
  score: number;
  maxScore: number;
  executionTimeMs: number;
  stdout: string;
  diagnostics: SyntaxDiagnostic[];
  testResults: TestCaseResult[];
  sqlResultTable?: {
    columns: string[];
    rows: Record<string, string | number>[];
  };
  htmlRenderedPreview?: string;
}

export interface MultipleChoiceQuestion {
  id: string;
  part: 'part1_mcq' | 'part2_true_false';
  topic: string;
  language: Language;
  prompt: string;
  codeSnippet?: string;
  // For part 1 (4 options A, B, C, D)
  options?: { id: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctOption?: 'A' | 'B' | 'C' | 'D';
  // For part 2 (GDPT 2018 True/False 4 statements a, b, c, d)
  statements?: {
    id: 'a' | 'b' | 'c' | 'd';
    text: string;
    isTrue: boolean;
  }[];
  explanation: string;
}

export type ExamCategory =
  | 'Đề Chính Thức & Minh Họa Bộ GD&ĐT'
  | 'Đề Thi Thử Sở GD&ĐT Các Tỉnh'
  | 'Đề Thi Thử Trường THPT Chuyên'
  | 'Đề Tổng Ôn Định Hướng CS & ICT';

export interface MockExam {
  id: string;
  code: string;
  title: string;
  institution: string;
  examYear: number;
  category: ExamCategory;
  durationMinutes: number;
  description: string;
  questions: MultipleChoiceQuestion[];
  codingProblemIds: string[];
}

export interface SubmissionItem {
  submissionId: string;
  userId: string;
  problemId: string;
  problemTitle: string;
  language: Language;
  difficulty: Difficulty;
  code: string;
  passed: boolean;
  score: number;
  createdAtIso: string;
}

export interface ExamAttemptItem {
  attemptId: string;
  userId: string;
  examId: string;
  examTitle: string;
  totalScore: number;
  maxScore: number;
  durationSeconds: number;
  createdAtIso: string;
}

export interface UserProgressState {
  userId: string;
  displayName: string;
  schoolName: string;
  className?: string;
  cloudEmail?: string;
  targetUniversity: string;
  profileCompleted?: boolean;
  xp: number;
  streakDays: number;
  solvedCount: number;
  solvedIds: string[];
  examCount: number;
  deviceLabel: string;
  lastSyncedIso: string;
  submissions: SubmissionItem[];
  examAttempts: ExamAttemptItem[];
  savedCodeByProblem: Record<string, string>;
}
