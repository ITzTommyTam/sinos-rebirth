import {
  Difficulty,
  Language,
  PracticeMode,
  Problem,
} from '../types/academic';
import { PYTHON_PROBLEMS } from './catalog/pythonProblems';
import { HTML_PROBLEMS } from './catalog/htmlProblems';
import { SQL_PROBLEMS, SHARED_SQL_SCHEMAS } from './catalog/sqlProblems';
import { ALGORITHM_PROBLEMS } from './catalog/algorithmProblems';

export { SHARED_SQL_SCHEMAS };

/**
 * Complete pre-loaded bank of 400 100%-distinct problems:
 * - 100 Python problems (PY-001 to PY-100: 25 Easy, 25 Medium, 25 Hard, 25 Advanced)
 * - 100 HTML/CSS problems (WEB-001 to WEB-100: 25 Easy, 25 Medium, 25 Hard, 25 Advanced)
 * - 100 SQL problems (SQL-001 to SQL-100: 25 Easy, 25 Medium, 25 Hard, 25 Advanced)
 * - 100 Algorithm problems (ALGO-001 to ALGO-100: 25 Easy, 25 Medium, 25 Hard, 25 Advanced)
 */
export const INITIAL_PROBLEMS: Problem[] = [
  ...PYTHON_PROBLEMS,
  ...HTML_PROBLEMS,
  ...SQL_PROBLEMS,
  ...ALGORITHM_PROBLEMS,
];

/**
 * Returns a distinct, solvable problem for on-demand generation ("Sinh Bài Tập Mới")
 * by selecting from the curated 400-problem bank and creating a unique practice instance.
 */
export function generateInfiniteProblem(
  language: Language,
  difficulty: Difficulty,
  seedNumber: number,
  modeOverride?: PracticeMode
): Problem {
  const targetMode: PracticeMode = modeOverride || language;
  const pool = INITIAL_PROBLEMS.filter(
    (p) => p.categoryMode === targetMode && p.difficulty === difficulty
  );
  const fallbackPool = INITIAL_PROBLEMS.filter((p) => p.language === language);
  const activePool = pool.length > 0 ? pool : fallbackPool;
  const base = activePool[(seedNumber - 1) % activePool.length] || INITIAL_PROBLEMS[0];

  return {
    ...base,
    id: `gen-${targetMode}-${difficulty}-${seedNumber}`,
    isGenerated: true,
  };
}
