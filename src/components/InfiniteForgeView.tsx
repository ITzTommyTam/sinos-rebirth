import React, { useState } from 'react';
import { CheckCircle2, Layers, PlusCircle, Sparkles } from 'lucide-react';
import { Difficulty, Language, Problem } from '../types/academic';

interface InfiniteForgeViewProps {
  allProblems: Problem[];
  solvedIds: string[];
  onGenerateBatch: (lang: Language, diff: Difficulty, count: number) => Problem[];
  onOpenProblemInEditor: (problemId: string) => void;
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Cấp độ 1: Dễ (Nhận biết)',
  medium: 'Cấp độ 2: Trung bình (Thông hiểu)',
  hard: 'Cấp độ 3: Khó (Vận dụng)',
  advanced: 'Cấp độ 4: Cao hơn (Vận dụng cao)',
};

export const InfiniteForgeView: React.FC<InfiniteForgeViewProps> = ({
  allProblems,
  solvedIds,
  onGenerateBatch,
  onOpenProblemInEditor,
}) => {
  const [selectedLang, setSelectedLang] = useState<Language>('python');
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>('medium');
  const [batchSize, setBatchSize] = useState<number>(3);
  const [lastGeneratedIds, setLastGeneratedIds] = useState<string[]>([]);

  const solvedSet = new Set(solvedIds);
  const generatedList = allProblems.filter((p) => p.isGenerated);

  const handleCreateNow = (openImmediately: boolean) => {
    const created = onGenerateBatch(
      selectedLang,
      selectedDiff,
      openImmediately ? 1 : batchSize
    );
    setLastGeneratedIds(created.map((c) => c.id));
    if (openImmediately && created.length > 0) {
      onOpenProblemInEditor(created[0].id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Forge Control Deck */}
      <div className="p-6 bg-zinc-100 border border-zinc-900 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-300 pb-4">
          <div className="max-w-2xl">
            <div className="text-xs text-zinc-600">
              Hệ thống sinh bài tập tham số hóa tự động · Không giới hạn số lượng
            </div>
            <h2 className="text-2xl font-bold text-black mt-1">
              Kho Bài Tập Vô Hạn (Python · HTML · SQL)
            </h2>
            <p className="text-xs text-zinc-700 mt-1">
              Mỗi lần nhấn sinh bài tập, hệ thống tự động kiến tạo đề bài mới với bộ tham số, dữ liệu kiểm thử (test cases), bảng CSDL và lời giải chuẩn riêng biệt theo đúng cấu trúc Bộ GD&ĐT, Genopy, HackerRank và ĐGNL Đại học.
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-600">Tổng bài tập hiện có trong kho</div>
            <div className="text-2xl font-bold text-black tabular-nums">
              {allProblems.length} bài tập
            </div>
          </div>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-black mb-1.5">
              1. Chọn ngôn ngữ lập trình / truy vấn
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-white border border-zinc-900">
              {(['python', 'html', 'sql'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  className={`py-1.5 text-xs font-bold transition-colors uppercase cursor-pointer ${
                    selectedLang === lang
                      ? 'bg-black text-white'
                      : 'text-zinc-700 hover:text-black'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="forge-diff-select"
              className="block text-xs font-bold text-black mb-1.5"
            >
              2. Chọn cấp độ khó
            </label>
            <select
              id="forge-diff-select"
              value={selectedDiff}
              onChange={(e) => setSelectedDiff(e.target.value as Difficulty)}
              className="w-full px-3 py-2 text-xs font-bold bg-white border border-zinc-900 text-black focus:outline-none"
            >
              <option value="easy">{DIFFICULTY_LABELS.easy}</option>
              <option value="medium">{DIFFICULTY_LABELS.medium}</option>
              <option value="hard">{DIFFICULTY_LABELS.hard}</option>
              <option value="advanced">{DIFFICULTY_LABELS.advanced}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="forge-batch-select"
              className="block text-xs font-bold text-black mb-1.5"
            >
              3. Số lượng bài sinh mỗi lượt
            </label>
            <select
              id="forge-batch-select"
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-bold bg-white border border-zinc-900 text-black focus:outline-none"
            >
              <option value={3}>Sinh 3 bài tập mới</option>
              <option value={6}>Sinh 6 bài tập mới</option>
              <option value={12}>Sinh 12 bài tập mới</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleCreateNow(false)}
            className="px-4 py-2.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Sinh Thêm {batchSize} Bài Tập ({selectedLang.toUpperCase()}) Vào Kho
          </button>

          <button
            type="button"
            onClick={() => handleCreateNow(true)}
            className="px-4 py-2.5 text-xs font-bold text-black bg-white hover:bg-zinc-200 border border-zinc-900 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-black" />
            Sinh 1 Bài Mới & Mở Trình Viết Code Ngay
          </button>
        </div>
      </div>

      {/* Generated Problems Catalog */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
          <h3 className="text-xl font-bold text-black flex items-center gap-2">
            <Layers className="w-5 h-5 text-black" />
            Danh Mục Bài Tập Đã Khởi Tạo ({allProblems.length} bài tập)
          </h3>
          <span className="text-xs text-zinc-600">
            {generatedList.length} bài sinh tự động · {allProblems.length - generatedList.length} bài chuẩn gốc
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allProblems.map((prob) => {
            const isSolved = solvedSet.has(prob.id);
            const isNewlyCreated = lastGeneratedIds.includes(prob.id);
            return (
              <article
                key={prob.id}
                className={`p-5 bg-white border flex flex-col justify-between gap-4 ${
                  isNewlyCreated ? 'border-2 border-black' : 'border-zinc-900'
                }`}
              >
                <div className="space-y-2">
                  <div className="text-xs text-zinc-600 flex items-center justify-between gap-2">
                    <span>
                      {prob.codeNumber} · {prob.language.toUpperCase()} · {prob.source}
                    </span>
                    {isSolved ? (
                      <span className="text-black font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Đã giải
                      </span>
                    ) : isNewlyCreated ? (
                      <span className="text-black font-bold underline">[Mới sinh]</span>
                    ) : null}
                  </div>

                  <h4 className="text-base font-bold text-black">
                    {prob.title}
                  </h4>

                  <p className="text-xs text-zinc-700 line-clamp-2">
                    {prob.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-300 flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-600 tabular-nums">
                    Thưởng: +{prob.xpReward} XP
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenProblemInEditor(prob.id)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Làm bài này →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
