/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Database,
  FileCode2,
  Layers,
  LogIn,
  Search,
  Terminal,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  Difficulty,
  ExamAttemptItem,
  ExecutionReport,
  MockExam,
  PracticeMode,
  Problem,
  SubmissionItem,
  UserProgressState,
} from './types/academic';
import { executeAndGrade } from './utils/codeEngine';
import { ExamGradingResult, MOCK_EXAMS } from './utils/examCatalog';
import { INITIAL_PROBLEMS } from './utils/problemCatalog';
import {
  loadLocalProgress,
  recordCloudExamAttempt,
  recordCloudSubmission,
  saveLocalProgress,
  syncProgressWithCloud,
} from './utils/progressSync';
import { ClassicalIdeEditor } from './components/ClassicalIdeEditor';
import { ExamArenaView } from './components/ExamArenaView';
import { ProgressSyncView } from './components/ProgressSyncView';
import { SqlSandboxRunner } from './components/SqlSandboxRunner';
import { SyntaxHighlightedCode } from './components/SyntaxHighlightedCode';

type ActiveSection = 'practice' | 'algorithms' | 'exams' | 'progress';

const DIFFICULTY_META: Record<Difficulty, { label: string; rank: string }> = {
  easy: { label: 'Dễ (Nhận biết)', rank: 'Cấp I' },
  medium: { label: 'Trung bình (Thông hiểu)', rank: 'Cấp II' },
  hard: { label: 'Khó (Vận dụng)', rank: 'Cấp III' },
  advanced: { label: 'Cao hơn (Vận dụng cao)', rank: 'Cấp IV' },
};

const PROBLEMS_PER_PAGE = 20;

export default function App() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('practice');
  const [problems] = useState<Problem[]>(INITIAL_PROBLEMS);
  const [exams] = useState<MockExam[]>(MOCK_EXAMS);

  // Filter states in Practice / Algorithm Workspace
  const [modeFilter, setModeFilter] = useState<'ALL' | PracticeMode>('ALL');
  const [diffFilter, setDiffFilter] = useState<'ALL' | Difficulty>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [algoGroupFilter, setAlgoGroupFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [catalogPage, setCatalogPage] = useState<number>(1);

  // Selected problem & active code editor state (starts empty without pre-filled code)
  const [selectedProblemId, setSelectedProblemId] = useState<string>(
    INITIAL_PROBLEMS[0].id
  );
  const [progress, setProgress] = useState<UserProgressState>(() =>
    loadLocalProgress()
  );
  const [editorCodeMap, setEditorCodeMap] = useState<Record<string, string>>(
    () => loadLocalProgress().savedCodeByProblem || {}
  );
  const [executionReport, setExecutionReport] =
    useState<ExecutionReport | null>(null);

  // Mandatory empty onboarding form state before entering workspace
  const [setupName, setSetupName] = useState<string>('');
  const [setupSchool, setSetupSchool] = useState<string>('');
  const [setupClass, setSetupClass] = useState<string>('');
  const [setupError, setSetupError] = useState<string>('');

  // Firebase Auth & Cloud Sync states
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string>('');

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setFirebaseUser(user);
        if (user) {
          setIsSyncing(true);
          try {
            const synced = await syncProgressWithCloud(
              user.uid,
              loadLocalProgress()
            );
            setProgress(synced);
            setSyncStatusMessage(
              `Đã đồng bộ tự động với tài khoản đám mây (${user.email || user.displayName}).`
            );
          } catch (err) {
            console.error(err);
            setSyncStatusMessage(
              'Đang sử dụng bộ nhớ cục bộ (kiểm tra xác thực email tài khoản nếu cần đồng bộ Cloud).'
            );
          } finally {
            setIsSyncing(false);
          }
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('Firebase Auth initialization skipped:', err);
      return undefined;
    }
  }, []);

  const selectedProblem = useMemo(
    () =>
      problems.find((p) => p.id === selectedProblemId) || problems[0],
    [problems, selectedProblemId]
  );

  // Editor starts empty ("") when no user code has been saved for this problem
  const currentCode = editorCodeMap[selectedProblem.id] ?? '';

  const effectiveModeFilter: 'ALL' | PracticeMode =
    activeSection === 'algorithms' ? 'algorithm' : modeFilter;

  const filteredProblems = useMemo(() => {
    return problems.filter((p) => {
      const pMode = p.categoryMode || p.language;
      if (effectiveModeFilter !== 'ALL' && pMode !== effectiveModeFilter) {
        return false;
      }
      if (diffFilter !== 'ALL' && p.difficulty !== diffFilter) return false;
      if (sourceFilter !== 'ALL' && p.source !== sourceFilter) return false;
      if (
        activeSection === 'algorithms' &&
        algoGroupFilter !== 'ALL' &&
        p.algorithmGroup !== algoGroupFilter
      ) {
        return false;
      }
      if (
        searchQuery.trim() &&
        !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.codeNumber.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !p.topic.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [
    problems,
    effectiveModeFilter,
    diffFilter,
    sourceFilter,
    activeSection,
    algoGroupFilter,
    searchQuery,
  ]);

  const totalCatalogPages = Math.max(
    1,
    Math.ceil(filteredProblems.length / PROBLEMS_PER_PAGE)
  );
  const safeCatalogPage = Math.min(catalogPage, totalCatalogPages);
  const pagedProblems = filteredProblems.slice(
    (safeCatalogPage - 1) * PROBLEMS_PER_PAGE,
    safeCatalogPage * PROBLEMS_PER_PAGE
  );

  const handleSelectProblem = (problemId: string) => {
    const found = problems.find((p) => p.id === problemId);
    setSelectedProblemId(problemId);
    setExecutionReport(null);
    if (found?.categoryMode === 'algorithm') {
      if (activeSection !== 'algorithms' && activeSection !== 'practice') {
        setActiveSection('algorithms');
      }
    } else if (activeSection !== 'practice' && activeSection !== 'algorithms') {
      setActiveSection('practice');
    }
  };

  const handleChangeCode = (nextCode: string) => {
    setEditorCodeMap((prev) => {
      const updated = { ...prev, [selectedProblem.id]: nextCode };
      const nextProgress: UserProgressState = {
        ...progress,
        savedCodeByProblem: updated,
      };
      saveLocalProgress(nextProgress);
      return updated;
    });
  };

  const handleRunAndGrade = async () => {
    const report = executeAndGrade(selectedProblem, currentCode);
    setExecutionReport(report);

    const alreadySolved = progress.solvedIds.includes(selectedProblem.id);
    const nextSolvedIds =
      report.passedAll && !alreadySolved
        ? [...progress.solvedIds, selectedProblem.id].slice(0, 500)
        : progress.solvedIds;

    const xpEarned =
      report.passedAll && !alreadySolved ? selectedProblem.xpReward : 0;

    const newSubmission: SubmissionItem = {
      submissionId: `sub_${Date.now()}`,
      userId: firebaseUser ? firebaseUser.uid : progress.userId,
      problemId: selectedProblem.id,
      problemTitle: selectedProblem.title,
      language: selectedProblem.language,
      difficulty: selectedProblem.difficulty,
      code: currentCode,
      passed: report.passedAll,
      score: report.score,
      createdAtIso: new Date().toISOString(),
    };

    const nextProgress: UserProgressState = {
      ...progress,
      xp: progress.xp + xpEarned,
      solvedIds: nextSolvedIds,
      solvedCount: nextSolvedIds.length,
      lastSyncedIso: new Date().toISOString(),
      submissions: [newSubmission, ...progress.submissions].slice(0, 35),
      savedCodeByProblem: {
        ...editorCodeMap,
        [selectedProblem.id]: currentCode,
      },
    };

    setProgress(nextProgress);
    saveLocalProgress(nextProgress);

    if (firebaseUser) {
      try {
        await recordCloudSubmission(
          firebaseUser.uid,
          newSubmission,
          nextProgress
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCompleteExam = async (
    exam: MockExam,
    result: ExamGradingResult,
    durationSec: number
  ) => {
    const attempt: ExamAttemptItem = {
      attemptId: `att_${Date.now()}`,
      userId: firebaseUser ? firebaseUser.uid : progress.userId,
      examId: exam.id,
      examTitle: exam.title,
      totalScore: result.totalScore,
      maxScore: result.maxScore,
      durationSeconds: durationSec,
      createdAtIso: new Date().toISOString(),
    };

    const bonusXp = Math.round(result.totalScore * 20);
    const nextProgress: UserProgressState = {
      ...progress,
      xp: progress.xp + bonusXp,
      examCount: progress.examCount + 1,
      lastSyncedIso: new Date().toISOString(),
      examAttempts: [attempt, ...progress.examAttempts].slice(0, 20),
    };

    setProgress(nextProgress);
    saveLocalProgress(nextProgress);

    if (firebaseUser) {
      try {
        await recordCloudExamAttempt(firebaseUser.uid, attempt, nextProgress);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsSyncing(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setSyncStatusMessage(
        err instanceof Error
          ? `Thông báo đăng nhập: ${err.message}`
          : 'Không thể mở cửa sổ đăng nhập Google.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setSyncStatusMessage(
      'Đã đăng xuất khỏi đám mây. Tiến trình vẫn được bảo toàn trên thiết bị.'
    );
  };

  const handleManualCloudSync = async () => {
    if (!firebaseUser) return;
    setIsSyncing(true);
    try {
      const synced = await syncProgressWithCloud(firebaseUser.uid, progress);
      setProgress(synced);
      setSyncStatusMessage(
        `Đồng bộ hoàn tất lúc ${new Date().toLocaleTimeString('vi-VN')}.`
      );
    } catch (err) {
      setSyncStatusMessage(
        err instanceof Error ? err.message : 'Lỗi khi đồng bộ dữ liệu.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateProfileMeta = async (
    displayName: string,
    schoolName: string,
    className: string,
    targetUniversity: string
  ) => {
    const nextProgress: UserProgressState = {
      ...progress,
      displayName,
      schoolName,
      className,
      targetUniversity,
      profileCompleted: true,
      lastSyncedIso: new Date().toISOString(),
    };
    setProgress(nextProgress);
    saveLocalProgress(nextProgress);
    if (firebaseUser) {
      try {
        await syncProgressWithCloud(firebaseUser.uid, nextProgress);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName.trim() || !setupSchool.trim() || !setupClass.trim()) {
      setSetupError(
        'Vui lòng điền đầy đủ Họ và tên, Trường THPT và Lớp trước khi vào học!'
      );
      return;
    }
    setSetupError('');
    await handleUpdateProfileMeta(
      setupName.trim(),
      setupSchool.trim(),
      setupClass.trim(),
      ''
    );
  };

  const solvedSet = useMemo(
    () => new Set(progress.solvedIds),
    [progress.solvedIds]
  );

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      {/* Mandatory Empty Account Setup Gate Before Entering Workspace */}
      {!progress.profileCompleted && (
        <div
          data-testid="account-setup-gate"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-slide"
        >
          <div className="w-full max-w-xl bg-white border-2 border-black p-4 sm:p-8 space-y-4 sm:space-y-5 shadow-[6px_6px_0px_0px_#000] min-w-0 overflow-hidden">
            <div className="border-b-2 border-black pb-3 flex items-start sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-zinc-600 uppercase">
                  THPT QT-Tin THPT · Chương Trình GDPT 2018
                </div>
                <h2 className="text-base sm:text-xl font-bold text-black flex items-center gap-2 mt-0.5 leading-snug">
                  <UserCheck className="w-5 h-5 text-black shrink-0" />
                  <span>Thiết Lập Tài Khoản Học Sinh Trước Khi Vào Học</span>
                </h2>
              </div>
              <span className="px-2 py-1 text-[11px] font-bold bg-black text-white whitespace-nowrap shrink-0">
                Bắt buộc
              </span>
            </div>

            <p className="text-xs text-zinc-700 leading-relaxed">
              Vui lòng điền thông tin học sinh bên dưới để hệ thống khởi tạo sổ theo dõi tiến trình học tập (400 bài code Python · HTML · SQL · Thuật Toán & 100 Đề thi thử THPT Quốc gia).
            </p>

            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="onboard-name"
                  className="block text-xs font-bold text-black mb-1"
                >
                  Họ và tên học sinh *
                </label>
                <input
                  id="onboard-name"
                  data-testid="onboard-name-input"
                  type="text"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="Nhập họ và tên của bạn..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-100 border border-zinc-900 text-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="onboard-school"
                    className="block text-xs font-bold text-black mb-1"
                  >
                    Trường THPT đang theo học *
                  </label>
                  <input
                    id="onboard-school"
                    data-testid="onboard-school-input"
                    type="text"
                    value={setupSchool}
                    onChange={(e) => setSetupSchool(e.target.value)}
                    placeholder="Nhập tên trường THPT..."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-100 border border-zinc-900 text-black focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="onboard-class"
                    className="block text-xs font-bold text-black mb-1"
                  >
                    Lớp / Khối (10, 11, 12) *
                  </label>
                  <input
                    id="onboard-class"
                    data-testid="onboard-class-input"
                    type="text"
                    value={setupClass}
                    onChange={(e) => setSetupClass(e.target.value)}
                    placeholder="VD: 12A1..."
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-100 border border-zinc-900 text-black focus:outline-none"
                  />
                </div>
              </div>

              {setupError && (
                <div className="p-2.5 bg-zinc-100 border border-black text-xs font-bold text-black">
                  [!] {setupError}
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                <button
                  type="submit"
                  data-testid="onboard-submit-btn"
                  className="coder-btn w-full sm:w-auto px-3.5 py-2.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors text-center cursor-pointer"
                >
                  Hoàn Tất Thiết Lập & Bắt Đầu Học →
                </button>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="coder-btn w-full sm:w-auto px-3.5 py-2.5 text-xs font-bold text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-900 transition-colors flex items-center justify-center gap-1.5 text-center cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span>Đăng nhập bằng Google</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive Top Navigation Bar — Monochrome Coder Style */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6 px-3.5 sm:px-6 py-3 sm:py-4 border-b-2 border-black bg-white sticky top-0 z-30">
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#practice"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('practice');
              setModeFilter('ALL');
            }}
            className="text-base sm:text-xl font-bold tracking-tight text-black whitespace-nowrap shrink-0"
          >
            THPT QT-Tin THPT
          </a>

          {/* Mobile Profile Button */}
          <button
            type="button"
            onClick={() => setActiveSection('progress')}
            className="md:hidden coder-btn px-2.5 py-1.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors max-w-[175px] truncate cursor-pointer"
          >
            {progress.displayName
              ? `${progress.displayName} · ${progress.xp} XP`
              : `Hồ Sơ (${progress.xp} XP)`}
          </button>
        </div>

        {/* Zone 2: 4 concise navigation links (2x2 grid on mobile, row on desktop) */}
        <nav
          aria-label="Điều hướng chính"
          className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-6 text-[11px] sm:text-sm font-semibold text-zinc-600"
        >
          <a
            href="#practice"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('practice');
              if (modeFilter === 'algorithm') setModeFilter('ALL');
              setCatalogPage(1);
            }}
            className={`px-1 py-1.5 sm:px-0 sm:py-1 text-center sm:text-left tracking-tighter sm:tracking-normal border sm:border-0 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'practice'
                ? 'bg-black text-white sm:bg-transparent sm:text-black font-bold border-black sm:border-b-2 sm:border-black'
                : 'bg-zinc-100 sm:bg-transparent border-zinc-300 hover:text-black'
            }`}
          >
            Luyện Tập Code (300)
          </a>
          <a
            href="#algorithms"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('algorithms');
              setCatalogPage(1);
              const firstAlgo = problems.find((p) => p.categoryMode === 'algorithm');
              if (firstAlgo && selectedProblem.categoryMode !== 'algorithm') {
                setSelectedProblemId(firstAlgo.id);
                setExecutionReport(null);
              }
            }}
            className={`px-1 py-1.5 sm:px-0 sm:py-1 text-center sm:text-left tracking-tighter sm:tracking-normal border sm:border-0 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'algorithms'
                ? 'bg-black text-white sm:bg-transparent sm:text-black font-bold border-black sm:border-b-2 sm:border-black'
                : 'bg-zinc-100 sm:bg-transparent border-zinc-300 hover:text-black'
            }`}
          >
            Luyện Thuật Toán (100)
          </a>
          <a
            href="#exams"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('exams');
            }}
            className={`px-1 py-1.5 sm:px-0 sm:py-1 text-center sm:text-left tracking-tighter sm:tracking-normal border sm:border-0 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'exams'
                ? 'bg-black text-white sm:bg-transparent sm:text-black font-bold border-black sm:border-b-2 sm:border-black'
                : 'bg-zinc-100 sm:bg-transparent border-zinc-300 hover:text-black'
            }`}
          >
            Đề Thi Thử (100)
          </a>
          <a
            href="#progress"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('progress');
            }}
            className={`px-1 py-1.5 sm:px-0 sm:py-1 text-center sm:text-left tracking-tighter sm:tracking-normal border sm:border-0 transition-colors whitespace-nowrap shrink-0 ${
              activeSection === 'progress'
                ? 'bg-black text-white sm:bg-transparent sm:text-black font-bold border-black sm:border-b-2 sm:border-black'
                : 'bg-zinc-100 sm:bg-transparent border-zinc-300 hover:text-black'
            }`}
          >
            Tiến Trình
          </a>
        </nav>

        {/* Zone 3: Desktop primary action */}
        <div className="hidden md:flex items-center shrink-0">
          <button
            type="button"
            onClick={() => setActiveSection('progress')}
            className="coder-btn px-4 py-2 text-sm font-bold text-white bg-black hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {progress.displayName
              ? `${progress.displayName} · ${progress.xp} XP`
              : `Hồ Sơ & Đồng Bộ (${progress.xp} XP)`}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
        {/* SECTION 1 & 2: PRACTICE WORKSPACE & ALGORITHM TRAINING (400 Pre-loaded Problems) */}
        {(activeSection === 'practice' || activeSection === 'algorithms') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
            {/* Left Column (4 cols): Filter Controls & 400 Pre-loaded Problem Catalog */}
            <aside className="lg:col-span-4 min-w-0 bg-zinc-100 border-2 border-zinc-900 p-3.5 sm:p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-300 pb-2.5 gap-2">
                <h2 className="text-sm sm:text-base font-bold text-black flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-black shrink-0" />
                  {activeSection === 'algorithms'
                    ? `Kho Thuật Toán (${filteredProblems.length})`
                    : `Mục Lục Bài Tập (${filteredProblems.length})`}
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-black text-white tabular-nums shrink-0">
                  Trang {safeCatalogPage}/{totalCatalogPages}
                </span>
              </div>

              {/* Mode Segmented Control (100 problems per mode) */}
              {activeSection === 'practice' ? (
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-zinc-700">
                    Chế độ & Ngôn ngữ (100 bài/chế độ):
                  </span>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 p-1.5 bg-white border border-zinc-900">
                    {(
                      [
                        { id: 'ALL', label: 'Tất cả (400)' },
                        { id: 'python', label: 'Python (100)' },
                        { id: 'html', label: 'HTML (100)' },
                        { id: 'sql', label: 'SQL (100)' },
                        { id: 'algorithm', label: 'Thuật Toán (100)' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`mode-btn-${item.id}`}
                        onClick={() => {
                          setModeFilter(item.id);
                          setCatalogPage(1);
                          if (item.id !== 'ALL' && selectedProblem.categoryMode !== item.id) {
                            const firstMatch = problems.find(
                              (p) => p.categoryMode === item.id
                            );
                            if (firstMatch) {
                              handleSelectProblem(firstMatch.id);
                            }
                          }
                        }}
                        className={`coder-btn flex-1 px-2.5 py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          modeFilter === item.id
                            ? 'bg-black text-white'
                            : 'bg-zinc-100 sm:bg-transparent text-zinc-800 hover:text-black'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold text-zinc-700">
                    Nhóm chuyên đề thuật toán (Từ Dễ đến Cao):
                  </span>
                  <select
                    value={algoGroupFilter}
                    onChange={(e) => {
                      setAlgoGroupFilter(e.target.value);
                      setCatalogPage(1);
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-zinc-900 text-black focus:outline-none"
                  >
                    <option value="ALL">Tất cả chuyên đề thuật toán (100 bài)</option>
                    <option value="Tìm Kiếm Tuần Tự (Linear Search)">
                      Cấp I (Dễ): Tìm Kiếm Tuần Tự & Duyệt Mảng (25 bài)
                    </option>
                    <option value="Tìm Kiếm Nhị Phân & Chia Để Trị">
                      Cấp II (TB): Tìm Kiếm Nhị Phân & Sắp Xếp (25 bài)
                    </option>
                    <option value="Hai Con Trỏ & Cửa Sổ Trượt (Sliding Window)">
                      Cấp III (Khó): Hai Con Trỏ & Cửa Sổ Trượt (25 bài)
                    </option>
                    <option value="Quy Hoạch Động (Dynamic Programming)">
                      Cấp IV (Cao): Quy Hoạch Động Dynamic Programming (25 bài)
                    </option>
                  </select>
                </div>
              )}

              {/* Difficulty Segmented Filter */}
              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-zinc-700">
                  Cấp độ nhận thức:
                </span>
                <div className="grid grid-cols-5 gap-1 p-1 bg-white border border-zinc-900">
                  {(
                    [
                      { id: 'ALL', label: 'Tất cả' },
                      { id: 'easy', label: 'Dễ' },
                      { id: 'medium', label: 'TB' },
                      { id: 'hard', label: 'Khó' },
                      { id: 'advanced', label: 'Cao' },
                    ] as const
                  ).map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setDiffFilter(d.id);
                        setCatalogPage(1);
                      }}
                      className={`coder-btn py-1.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        diffFilter === d.id
                          ? 'bg-black text-white'
                          : 'text-zinc-700 hover:text-black'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source ("Tất cả") & Search Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label htmlFor="source-filter" className="sr-only">
                    Nguồn bài tập
                  </label>
                  <select
                    id="source-filter"
                    value={sourceFilter}
                    onChange={(e) => {
                      setSourceFilter(e.target.value);
                      setCatalogPage(1);
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-zinc-900 text-black focus:outline-none"
                  >
                    <option value="ALL">Tất cả</option>
                    <option value="Genopy">Genopy (Python & Thuật toán)</option>
                    <option value="HackerRank">HackerRank (Chuẩn quốc tế)</option>
                    <option value="Bộ GD&ĐT">Bộ GD&ĐT (GDPT 2018)</option>
                    <option value="LeetCode">LeetCode (Algorithms & SQL)</option>
                    <option value="Codeforces">Codeforces (Thi đấu)</option>
                    <option value="VNOI">VNOI (HSG Tin học)</option>
                    <option value="CSES">CSES Problem Set</option>
                    <option value="W3Schools">W3Schools (HTML5 & CSS3)</option>
                    <option value="Đề Sở GD&ĐT">Đề Sở GD&ĐT Các Tỉnh</option>
                  </select>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    aria-label="Tìm kiếm bài tập"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCatalogPage(1);
                    }}
                    placeholder="Tìm tên, mã bài..."
                    className="w-full pl-8 pr-2.5 py-2 text-xs sm:text-sm bg-white border border-zinc-900 text-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Scrollable Problem List (Compact on Mobile, Tall on Desktop) */}
              <div className="space-y-2 max-h-[280px] lg:max-h-[580px] overflow-y-auto pr-1">
                {pagedProblems.map((prob) => {
                  const isSelected = prob.id === selectedProblem.id;
                  const isSolved = solvedSet.has(prob.id);
                  return (
                    <button
                      key={prob.id}
                      type="button"
                      data-testid={`problem-card-${prob.id}`}
                      onClick={() => handleSelectProblem(prob.id)}
                      className={`coder-card w-full text-left p-3.5 border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-black border-zinc-400 hover:border-black'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between gap-2 text-xs ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-600'
                        }`}
                      >
                        <span>
                          {prob.codeNumber} ·{' '}
                          {prob.isAlgorithm
                            ? 'THUẬT TOÁN'
                            : prob.language.toUpperCase()}{' '}
                          · {DIFFICULTY_META[prob.difficulty].rank}
                        </span>
                        {isSolved ? (
                          <span
                            className={`font-bold flex items-center gap-0.5 ${
                              isSelected ? 'text-emerald-300' : 'text-black'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Đạt
                          </span>
                        ) : (
                          <span className="tabular-nums">+{prob.xpReward} XP</span>
                        )}
                      </div>
                      <div
                        className={`text-sm font-bold mt-1 leading-snug ${
                          isSelected ? 'text-white' : 'text-black'
                        }`}
                      >
                        {prob.title}
                      </div>
                      <div
                        className={`text-xs mt-1 ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-500'
                        }`}
                      >
                        Nguồn: {prob.source} · {prob.topic}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination Controls for the 400 Pre-loaded Problems */}
              <div className="pt-2 border-t border-zinc-300 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={safeCatalogPage <= 1}
                  onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}
                  className="coder-btn px-3 py-1.5 text-xs font-bold bg-white border border-zinc-900 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Trước
                </button>
                <span className="text-xs font-bold text-zinc-700 tabular-nums">
                  {safeCatalogPage} / {totalCatalogPages} ({filteredProblems.length} bài)
                </span>
                <button
                  type="button"
                  disabled={safeCatalogPage >= totalCatalogPages}
                  onClick={() =>
                    setCatalogPage((p) => Math.min(totalCatalogPages, p + 1))
                  }
                  className="coder-btn px-3 py-1.5 text-xs font-bold bg-black text-white border border-black disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  Tiếp
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </aside>

            {/* Right Column (8 cols): Clean Problem Statement + Color Code Editor + Execution Console */}
            <section className="lg:col-span-8 min-w-0 space-y-5 sm:space-y-6">
              {/* Problem Specification Sheet (Problem Only, No Structure Guide) */}
              <article
                data-testid="problem-statement-card"
                className="p-4 sm:p-6 bg-white border-2 border-zinc-900 space-y-4 animate-fade-slide min-w-0 overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-300 pb-3">
                  <div className="text-xs sm:text-sm text-zinc-700 flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-black text-white font-mono-tabular font-bold">
                      {selectedProblem.codeNumber}
                    </span>
                    <span className="font-medium">
                      {DIFFICULTY_META[selectedProblem.difficulty].label}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-bold text-black">
                      Nguồn: {selectedProblem.source}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedProblem.gradeTag}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-black tabular-nums">
                    <span>+{selectedProblem.xpReward} XP</span>
                  </div>
                </div>

                <h1 className="text-xl sm:text-2xl md:text-[26px] font-bold text-black leading-tight">
                  {selectedProblem.title}
                </h1>

                <p className="text-sm sm:text-base text-zinc-900 leading-relaxed">
                  {selectedProblem.description}
                </p>

                {/* Technical I/O & Constraints Box */}
                <div className="p-4 bg-zinc-100 border border-zinc-900 space-y-2">
                  <div className="text-sm font-bold text-black">
                    Đặc tả Kỹ thuật (Input / Output) & Ràng buộc:
                  </div>
                  <p className="text-sm text-zinc-800 leading-relaxed">
                    {selectedProblem.taskSpecification}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {selectedProblem.constraints.map((c, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white border border-zinc-500 text-xs font-mono-tabular text-zinc-800"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Language-Specific Reference Context: Python Sample I/O OR SQL Relational Schema */}
                {selectedProblem.language === 'python' &&
                  selectedProblem.pythonTests && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {selectedProblem.pythonTests
                        .filter((tc) => !tc.isHidden)
                        .map((tc, i) => (
                          <div
                            key={tc.id}
                            className="p-3.5 bg-zinc-100 border border-zinc-900 text-xs sm:text-sm font-mono-tabular space-y-1.5"
                          >
                            <div className="font-bold text-zinc-800">
                              Ví dụ mẫu #{i + 1}:
                            </div>
                            <div>
                              <span className="text-zinc-600">Đầu vào (stdin):</span>{' '}
                              <code className="text-black font-bold">
                                {tc.input}
                              </code>
                            </div>
                            <div>
                              <span className="text-zinc-600">Đầu ra (stdout):</span>{' '}
                              <code className="text-black font-bold">
                                {tc.expectedOutput}
                              </code>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                {selectedProblem.language === 'sql' && (
                  <SqlSandboxRunner
                    problem={selectedProblem}
                    currentQuery={currentCode}
                  />
                )}
              </article>

              {/* Coder IDE Editor (Starts Empty + Color Syntax Highlighting + Smooth Sliding Caret + Live Output Bar) */}
              <ClassicalIdeEditor
                problem={selectedProblem}
                code={currentCode}
                onChangeCode={handleChangeCode}
                onRunAndGrade={handleRunAndGrade}
                onResetStarter={() => handleChangeCode('')}
              />

              {/* Isolated Sandboxed Live HTML5 & CSS3 Preview (Prevents h1 / style leaking to parent page) */}
              {selectedProblem.language === 'html' && (
                <div className="coder-card p-4 sm:p-5 bg-white border-2 border-zinc-900 space-y-3 animate-fade-slide">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-300 pb-2">
                    <h3 className="text-sm sm:text-base font-bold text-black flex items-center gap-2">
                      <FileCode2 className="w-4 h-4 text-black shrink-0" />
                      Khung Xem Trước Trang Web Cô Lập (HTML Preview)
                    </h3>
                    <span className="text-xs text-zinc-600">
                      Cô lập hoàn toàn trong iframe
                    </span>
                  </div>
                  <iframe
                    data-testid="html-preview-iframe"
                    title="HTML5 & CSS3 Sandboxed Preview"
                    sandbox="allow-same-origin"
                    srcDoc={`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;margin:12px;color:#09090B;background:#fff;}</style></head><body>${currentCode}</body></html>`}
                    className="w-full min-h-[180px] bg-white border border-zinc-400"
                  />
                </div>
              )}

              {/* Execution & Automated Grading Output Panel */}
              {executionReport && (
                <div className="p-5 sm:p-6 bg-white border-2 border-black space-y-4 animate-fade-slide">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-300 pb-3">
                    <div className="flex items-center gap-2">
                      {executionReport.passedAll ? (
                        <CheckCircle2 className="w-6 h-6 text-black shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-black shrink-0" />
                      )}
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-black">
                          {executionReport.passedAll
                            ? '[ACCEPTED] CHẤM ĐIỂM THÀNH CÔNG: ĐẠT TẤT CẢ KIỂM THỬ'
                            : '[!] CHƯA ĐẠT TOÀN BỘ KIỂM THỬ — HÃY KIỂM TRA CHI TIẾT BÊN DƯỚI'}
                        </h3>
                        <div className="text-xs text-zinc-600 tabular-nums">
                          Vượt qua {executionReport.passedCount}/
                          {executionReport.totalCount} tiêu chí · Điểm bài:{' '}
                          {executionReport.score}/{executionReport.maxScore} XP ·
                          Thời gian: {executionReport.executionTimeMs}ms
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Gentle Hint Shown ONLY When Student Fails Grading */}
                  {!executionReport.passedAll && selectedProblem.hints.length > 0 && (
                    <div
                      data-testid="gentle-failure-hint"
                      className="p-3.5 bg-zinc-100 border-l-4 border-black text-xs sm:text-sm text-zinc-900 space-y-1"
                    >
                      <div className="font-bold text-black">
                        💡 Gợi ý nhẹ để bạn kiểm tra lại bài làm:
                      </div>
                      <p className="text-zinc-800 leading-relaxed">
                        {selectedProblem.hints[0]}
                      </p>
                    </div>
                  )}

                  {/* Console Output / SQL Result Set */}
                  <div className="p-3 bg-zinc-950 text-white font-mono-tabular text-xs border border-zinc-900 space-y-1">
                    <div className="text-zinc-400 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Kết quả đầu ra chuẩn (Standard Output):</span>
                    </div>
                    <pre className="whitespace-pre-wrap text-emerald-400">
                      {executionReport.stdout}
                    </pre>
                  </div>

                  {executionReport.sqlResultTable &&
                    executionReport.sqlResultTable.rows.length > 0 && (
                      <div className="overflow-x-auto border border-zinc-900 p-3 bg-zinc-100">
                        <div className="text-xs font-bold text-black mb-2">
                          Bảng kết quả truy vấn SQL của bạn:
                        </div>
                        <table className="w-full border-collapse text-xs font-mono-tabular">
                          <thead>
                            <tr className="border-b border-zinc-900 text-left text-zinc-600">
                              {executionReport.sqlResultTable.columns.map(
                                (col) => (
                                  <th key={col} className="py-1.5 pr-3">
                                    {col}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {executionReport.sqlResultTable.rows.map(
                              (row, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b border-zinc-300"
                                >
                                  {executionReport.sqlResultTable!.columns.map(
                                    (col) => (
                                      <td key={col} className="py-1.5 pr-3">
                                        {String(row[col] ?? '')}
                                      </td>
                                    )
                                  )}
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                  {/* Per-TestCase Breakdown */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold text-black">
                      Chi tiết từng bộ kiểm thử (Test Cases):
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {executionReport.testResults.map((tr) => (
                        <div
                          key={tr.id}
                          className={`p-3 border text-xs space-y-1 ${
                            tr.passed
                              ? 'bg-zinc-100 border-black'
                              : 'bg-white border-2 border-black'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-black">
                            <span>{tr.label}</span>
                            <span>
                              {tr.passed ? '✓ ĐẠT' : '! SAI KẾT QUẢ'}
                            </span>
                          </div>
                          <div className="font-mono-tabular text-[11px] text-zinc-700">
                            <div>Đầu vào: {tr.inputSummary}</div>
                            <div>Kỳ vọng: {tr.expectedSummary}</div>
                            <div>Thực tế: {tr.actualSummary}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* SECTION 3: 100 MOCK EXAMS (THPT QUỐC GIA GDPT 2018) */}
        {activeSection === 'exams' && (
          <ExamArenaView
            exams={exams}
            allProblems={problems}
            onCompleteExam={handleCompleteExam}
            onOpenCodingProblem={handleSelectProblem}
          />
        )}

        {/* SECTION 4: PROGRESS & CLOUD / CROSS-DEVICE SYNC */}
        {activeSection === 'progress' && (
          <ProgressSyncView
            progress={progress}
            allProblems={problems}
            firebaseUser={firebaseUser}
            isSyncing={isSyncing}
            syncStatusMessage={syncStatusMessage}
            onGoogleSignIn={handleGoogleSignIn}
            onSignOut={handleSignOut}
            onManualCloudSync={handleManualCloudSync}
            onUpdateProfileMeta={handleUpdateProfileMeta}
            onImportProgressState={(next) => setProgress(next)}
            onSelectProblem={handleSelectProblem}
          />
        )}
      </main>

      {/* Bottom Bar: @TommyCloud Copyright reserved */}
      <footer className="border-t-2 border-black bg-zinc-100 px-6 py-4 mt-12">
        <div className="max-w-[1440px] mx-auto flex items-center justify-center text-xs font-bold text-black">
          @TommyCloud Copyright reserved
        </div>
      </footer>
    </div>
  );
}
