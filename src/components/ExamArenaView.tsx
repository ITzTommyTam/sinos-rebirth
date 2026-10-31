import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  Search,
  XCircle,
} from 'lucide-react';
import { MockExam, Problem } from '../types/academic';
import { ExamGradingResult, gradeMockExam } from '../utils/examCatalog';
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode';

interface ExamArenaViewProps {
  exams: MockExam[];
  allProblems: Problem[];
  onCompleteExam: (exam: MockExam, result: ExamGradingResult, durationSec: number) => void;
  onOpenCodingProblem: (problemId: string) => void;
}

const EXAMS_PER_PAGE = 12;

export const ExamArenaView: React.FC<ExamArenaViewProps> = ({
  exams,
  allProblems,
  onCompleteExam,
  onOpenCodingProblem,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeExam, setActiveExam] = useState<MockExam | null>(null);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [tfAnswers, setTfAnswers] = useState<
    Record<string, Record<'a' | 'b' | 'c' | 'd', boolean | undefined>>
  >({});
  const [gradingResult, setGradingResult] = useState<ExamGradingResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (!activeExam || gradingResult) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeExam, gradingResult]);

  const handleStartExam = (exam: MockExam) => {
    setActiveExam(exam);
    setMcqAnswers({});
    setTfAnswers({});
    setGradingResult(null);
    setElapsedSeconds(0);
  };

  const handleSubmitExam = () => {
    if (!activeExam) return;
    const result = gradeMockExam(activeExam, mcqAnswers, tfAnswers);
    setGradingResult(result);
    onCompleteExam(activeExam, result, elapsedSeconds);
  };

  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (selectedCategory !== 'ALL' && e.category !== selectedCategory) return false;
      if (selectedYear !== 'ALL' && String(e.examYear) !== selectedYear) return false;
      if (
        searchQuery.trim() &&
        !e.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !e.institution.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !e.code.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [exams, selectedCategory, selectedYear, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredExams.length / EXAMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedExams = filteredExams.slice(
    (safePage - 1) * EXAMS_PER_PAGE,
    safePage * EXAMS_PER_PAGE
  );

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (activeExam) {
    return (
      <div className="space-y-6">
        {/* Exam Header Bar */}
        <div className="p-6 bg-zinc-100 border border-zinc-900 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-zinc-600 flex items-center gap-2">
              <span>Mã đề: {activeExam.code}</span>
              <span aria-hidden="true">·</span>
              <span>Năm: {activeExam.examYear}</span>
              <span aria-hidden="true">·</span>
              <span>{activeExam.institution}</span>
              <span aria-hidden="true">·</span>
              <span>Thời lượng chuẩn: {activeExam.durationMinutes} phút</span>
            </div>
            <h2 className="text-xl font-bold text-black mt-1">
              {activeExam.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="px-3 py-1.5 bg-white border border-zinc-900 text-xs sm:text-sm font-mono-tabular text-black flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-black shrink-0" />
              <span>Thời gian: {formatTimer(elapsedSeconds)}</span>
            </div>

            {!gradingResult ? (
              <button
                type="button"
                onClick={handleSubmitExam}
                className="px-3.5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Nộp Bài & Chấm Điểm
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStartExam(activeExam)}
                className="px-3.5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Làm Lại Đề Này
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveExam(null)}
              className="px-3 py-2 text-xs font-medium text-black bg-white hover:bg-zinc-200 border border-zinc-900 transition-colors cursor-pointer"
            >
              Quay lại kho 100 đề
            </button>
          </div>
        </div>

        {/* Grading Result Banner */}
        {gradingResult && (
          <div className="p-4 sm:p-6 bg-white border-2 border-black space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-black text-lg sm:text-xl font-bold">
                <Award className="w-6 h-6 shrink-0" />
                <span>
                  [KẾT QUẢ]: {gradingResult.totalScore} / {gradingResult.maxScore} điểm lý thuyết
                </span>
              </div>
              <div className="text-xs text-zinc-600">
                Đã lưu vào lịch sử thi thử & đồng bộ đám mây
              </div>
            </div>
            <p className="text-xs text-zinc-700">
              Quy tắc tính điểm Phần II (Đúng/Sai 4 ý a, b, c, d theo chuẩn Bộ GD&ĐT Chương trình 2018): Đúng 1 ý được 0.1đ · Đúng 2 ý được 0.25đ · Đúng 3 ý được 0.5đ · Đúng cả 4 ý được 1.0đ.
            </p>
          </div>
        )}

        {/* Exam Questions List */}
        <div className="space-y-6">
          {activeExam.questions.map((q, idx) => {
            const breakdown = gradingResult?.questionBreakdown.find(
              (b) => b.questionId === q.id
            );

            return (
              <article
                key={q.id}
                className="p-4 sm:p-6 bg-white border border-zinc-900 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-300 pb-3">
                  <div className="text-xs text-zinc-600 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-black">
                      Câu {idx + 1}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {q.part === 'part1_mcq'
                        ? 'Phần I: Trắc nghiệm 4 lựa chọn (0.25 điểm)'
                        : 'Phần II: Trắc nghiệm Đúng/Sai 4 mệnh đề (Tối đa 1.0 điểm)'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{q.topic}</span>
                  </div>

                  {breakdown && (
                    <div className="text-xs font-bold text-black flex items-center gap-1">
                      {breakdown.isFullyCorrect ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span className="tabular-nums">
                        {breakdown.isFullyCorrect ? '✓' : '!'} Đạt {breakdown.earnedScore} / {breakdown.maxQuestionScore} điểm
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-base sm:text-lg text-black font-medium leading-relaxed">
                  {q.prompt}
                </p>

                {q.codeSnippet && (
                  <SyntaxHighlightedCode
                    code={q.codeSnippet}
                    language={q.language}
                  />
                )}

                {/* Part 1: 4 options */}
                {q.part === 'part1_mcq' && q.options && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = mcqAnswers[q.id] === opt.id;
                      const isCorrectOption =
                        gradingResult && q.correctOption === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={Boolean(gradingResult)}
                          onClick={() =>
                            setMcqAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                          }
                          className={`p-3.5 text-left text-sm sm:text-base border transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                            isCorrectOption
                              ? 'bg-black border-black text-white font-bold'
                              : isSelected
                                ? 'bg-zinc-900 border-black text-white font-bold'
                                : 'bg-zinc-100 border-zinc-400 text-black hover:bg-zinc-200'
                          }`}
                        >
                          <span>
                            <strong className="font-mono-tabular mr-2">
                              {opt.id}.
                            </strong>
                            {opt.text}
                          </span>
                          {isCorrectOption && (
                            <span className="text-xs sm:text-sm font-bold">✓ Đáp án đúng</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Part 2: True/False 4 statements */}
                {q.part === 'part2_true_false' && q.statements && (
                  <div className="border border-zinc-900 divide-y divide-zinc-300">
                    {q.statements.map((st) => {
                      const currentVal = tfAnswers[q.id]?.[st.id];
                      return (
                        <div
                          key={st.id}
                          className="p-3 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="text-sm sm:text-base text-black flex-1">
                            <strong className="font-mono-tabular mr-1.5">
                              {st.id})
                            </strong>
                            {st.text}
                            {gradingResult && (
                              <span className="ml-2 text-xs sm:text-sm font-bold underline">
                                [Đáp án chuẩn: {st.isTrue ? 'ĐÚNG' : 'SAI'}]
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={Boolean(gradingResult)}
                              onClick={() =>
                                setTfAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: { ...(prev[q.id] || {}), [st.id]: true },
                                }))
                              }
                              className={`px-3 py-1 text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                currentVal === true
                                  ? 'bg-black text-white border-black'
                                  : 'bg-white text-black border-zinc-500 hover:bg-zinc-200'
                              }`}
                            >
                              Đúng
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(gradingResult)}
                              onClick={() =>
                                setTfAnswers((prev) => ({
                                  ...prev,
                                  [q.id]: { ...(prev[q.id] || {}), [st.id]: false },
                                }))
                              }
                              className={`px-3 py-1 text-xs font-bold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                currentVal === false
                                  ? 'bg-black text-white border-black'
                                  : 'bg-white text-black border-zinc-500 hover:bg-zinc-200'
                              }`}
                            >
                              Sai
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {breakdown && (
                  <div className="p-3 bg-zinc-100 border border-zinc-900 text-xs text-zinc-800">
                    <strong className="text-black">Giải thích chi tiết:</strong>{' '}
                    {breakdown.explanation}
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {/* Part III: Practical Coding Exercises Linked to this Exam */}
        <div className="p-4 sm:p-6 bg-zinc-100 border border-zinc-900 space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-black">
              Phần III — Bài Tập Thực Hành Viết Code Trực Tiếp Trong Đề Thi
            </h3>
            <p className="text-xs text-zinc-700 mt-0.5">
              Nhấn vào từng bài tập bên dưới để mở trực tiếp trong Trình Viết Code và chấm điểm tự động bằng bộ test chuẩn.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeExam.codingProblemIds.map((pid) => {
              const prob = allProblems.find((p) => p.id === pid);
              if (!prob) return null;
              return (
                <div
                  key={prob.id}
                  className="p-4 bg-white border border-zinc-900 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="text-xs text-zinc-600">
                      <span>{prob.codeNumber}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{prob.language.toUpperCase()}</span>
                      <span aria-hidden="true"> · </span>
                      <span>+{prob.xpReward} XP</span>
                    </div>
                    <h4 className="text-sm font-bold text-black mt-1">
                      {prob.title}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCodingProblem(prob.id)}
                    className="px-3 py-1.5 text-xs font-bold text-black border border-black hover:bg-black hover:text-white transition-colors self-start cursor-pointer"
                  >
                    Mở trong Trình Viết Code →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 overflow-hidden">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 bg-zinc-100 border border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="max-w-3xl">
          <div className="text-xs text-zinc-600">
            Ngân hàng 100 Đề Thi Tốt Nghiệp THPT Quốc Gia · Chương Trình GDPT 2018 (2023 – 2026)
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-black mt-1">
            Kho 100 Đề Thi Thử Tốt Nghiệp THPT Quốc Gia Môn Tin Học (Chuẩn 2018)
          </h2>
          <p className="text-xs text-zinc-700 mt-1">
            Tổng hợp 100 đề thi chính thức, đề minh họa Bộ GD&ĐT, đề khảo sát Sở GD&ĐT 63 tỉnh thành và đề thi thử các trường THPT Chuyên từ các năm trước đến nay theo chuẩn Chương trình GDPT 2018 (Định hướng Khoa học máy tính CS & Tin học ứng dụng ICT).
          </p>
        </div>

        <div className="px-4 py-3 bg-white border border-zinc-900 text-left sm:text-right shrink-0">
          <div className="text-[11px] text-zinc-600">Tổng số đề có sẵn</div>
          <div className="text-xl font-bold text-black tabular-nums">
            {exams.length} ĐỀ CHUẨN
          </div>
        </div>
      </div>

      {/* Category Filter + Year Filter + Search Bar */}
      <div className="p-3.5 sm:p-4 bg-zinc-100 border border-zinc-900 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: `Tất cả (${exams.length} đề)` },
            { id: 'Đề Chính Thức & Minh Họa Bộ GD&ĐT', label: 'Bộ GD&ĐT Chính Thức & Minh Họa (25)' },
            { id: 'Đề Thi Thử Sở GD&ĐT Các Tỉnh', label: 'Đề Sở GD&ĐT Các Tỉnh/Thành (25)' },
            { id: 'Đề Thi Thử Trường THPT Chuyên', label: 'Đề Trường THPT Chuyên (25)' },
            { id: 'Đề Tổng Ôn Định Hướng CS & ICT', label: 'Tổng Ôn Định Hướng CS & ICT (25)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSelectedCategory(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-bold transition-colors text-left cursor-pointer ${
                selectedCategory === tab.id
                  ? 'bg-black text-white'
                  : 'bg-white text-zinc-700 border border-zinc-400 hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-zinc-700 mr-1">Năm thi:</span>
            {['ALL', '2026', '2025', '2024', '2023'].map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => {
                  setSelectedYear(yr);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                  selectedYear === yr
                    ? 'bg-black text-white'
                    : 'bg-white text-zinc-700 border border-zinc-400 hover:text-black'
                }`}
              >
                {yr === 'ALL' ? 'Tất cả' : `Năm ${yr}`}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm mã đề, Sở GD&ĐT, trường Chuyên..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-900 text-black focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Exam Cards Catalog (Paginated 12 per page) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {pagedExams.map((exam) => (
          <article
            key={exam.id}
            className="p-5 bg-white border border-zinc-900 flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="text-xs text-zinc-600 flex flex-wrap items-center gap-2">
                <span className="font-mono-tabular font-bold text-black">
                  {exam.code}
                </span>
                <span aria-hidden="true">·</span>
                <span>Năm {exam.examYear}</span>
                <span aria-hidden="true">·</span>
                <span>{exam.institution}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{exam.durationMinutes} phút</span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-black">
                {exam.title}
              </h3>

              <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
                {exam.description}
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-300 flex items-center justify-between gap-4">
              <div className="text-xs text-zinc-600 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-black" />
                <span className="tabular-nums">
                  {exam.questions.length} câu hỏi chuẩn 2018 + {exam.codingProblemIds.length} bài code
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleStartExam(exam)}
                className="px-4 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Bắt Đầu Làm Đề
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Pagination Bar for 100 Exams */}
      {totalPages > 1 && (
        <div className="p-4 bg-zinc-100 border border-zinc-900 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-zinc-700">
            Hiển thị <strong>{pagedExams.length}</strong> / <strong>{filteredExams.length}</strong> đề thi thử THPT Quốc gia (Trang {safePage}/{totalPages})
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-bold bg-white border border-zinc-900 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Trang trước
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-xs font-bold bg-black text-white border border-black disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              Trang tiếp
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
