import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Lightbulb,
  Play,
  RotateCcw,
  Terminal,
} from 'lucide-react';
import {
  Language,
  Problem,
  SyntaxDiagnostic,
} from '../types/academic';
import {
  analyzeSyntax,
  getLiveCommandOutput,
} from '../utils/codeEngine';
import { tokenizeCodeLine } from './SyntaxHighlightedCode';

interface ClassicalIdeEditorProps {
  problem: Problem;
  code: string;
  onChangeCode: (nextCode: string) => void;
  onRunAndGrade: () => void;
  onResetStarter: () => void;
  onLoadSolution?: () => void;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  python: 'Python 3.11',
  html: 'HTML',
  sql: 'SQL',
};

export const ClassicalIdeEditor: React.FC<ClassicalIdeEditorProps> = ({
  problem,
  code,
  onChangeCode,
  onRunAndGrade,
  onResetStarter,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightRef = useRef<HTMLPreElement | null>(null);
  const measureSpanRef = useRef<HTMLSpanElement | null>(null);

  const [cursorOffset, setCursorOffset] = useState<number>(code.length);
  const [scrollPos, setScrollPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [caretX, setCaretX] = useState<number>(14);
  const [isTypingActive, setIsTypingActive] = useState<boolean>(false);

  const diagnostics: SyntaxDiagnostic[] = useMemo(
    () => analyzeSyntax(code, problem.language),
    [code, problem.language]
  );

  const liveCommandInfo = useMemo(
    () => getLiveCommandOutput(problem, code, cursorOffset),
    [problem, code, cursorOffset]
  );

  const lines = code ? code.split('\n') : [''];

  const { activeLineIndex, currentLineBeforeCursor } = useMemo(() => {
    const safeOffset = Math.min(Math.max(0, cursorOffset), code.length);
    const before = code.slice(0, safeOffset);
    const splitLines = before.split('\n');
    const rowIdx = Math.max(0, splitLines.length - 1);
    const linePrefix = splitLines[rowIdx] ?? '';
    return {
      activeLineIndex: rowIdx,
      currentLineBeforeCursor: linePrefix,
    };
  }, [code, cursorOffset]);

  useEffect(() => {
    if (measureSpanRef.current) {
      const width = measureSpanRef.current.getBoundingClientRect().width;
      setCaretX(Math.max(14, Math.round(14 + width - scrollPos.left)));
    } else {
      setCaretX(Math.max(14, Math.round(14 + currentLineBeforeCursor.length * 9.2 - scrollPos.left)));
    }
  }, [currentLineBeforeCursor, scrollPos.left, problem.id]);

  useEffect(() => {
    if (!isTypingActive) return;
    const timer = window.setTimeout(() => {
      setIsTypingActive(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [isTypingActive, code, cursorOffset]);

  const caretY = Math.max(6, Math.round(17 + activeLineIndex * 28 - scrollPos.top));
  const activeLineY = Math.max(0, Math.round(14 + activeLineIndex * 28 - scrollPos.top));

  const errorLinesMap = useMemo(() => {
    const map = new Map<number, SyntaxDiagnostic>();
    for (const d of diagnostics) {
      if (!map.has(d.line) || d.severity === 'error') {
        map.set(d.line, d);
      }
    }
    return map;
  }, [diagnostics]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const next = code.slice(0, start) + '    ' + code.slice(end);
      onChangeCode(next);
      setIsTypingActive(true);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(start + 4, start + 4);
          setCursorOffset(start + 4);
        }
      });
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRunAndGrade();
    }
  };

  const handleScrollSync = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const top = e.currentTarget.scrollTop;
    const left = e.currentTarget.scrollLeft;
    setScrollPos({ top, left });
    if (highlightRef.current) {
      highlightRef.current.scrollTop = top;
      highlightRef.current.scrollLeft = left;
    }
  };

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  return (
    <div className="flex flex-col border-2 border-zinc-900 bg-zinc-950 text-white rounded-none overflow-hidden min-w-0">
      {/* Editor Top Utility Strip — Clean Language Label & Essential Run/Clear Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 bg-black border-b border-zinc-800">
        <div className="flex items-center gap-2 text-sm sm:text-base text-zinc-300 shrink-0">
          <Code2 className="w-4 h-4 text-sky-400 shrink-0" />
          <span
            data-testid="editor-language-label"
            className="font-bold text-white tracking-tight"
          >
            {LANGUAGE_LABELS[problem.language]}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              onResetStarter();
              setCursorOffset(0);
            }}
            className="px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            <span>Xóa trắng</span>
          </button>

          <button
            type="button"
            onClick={onRunAndGrade}
            className="flex-1 sm:flex-initial px-3 py-1.5 text-xs font-bold text-black bg-white hover:bg-zinc-200 border border-white transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span>Chạy thử & Chấm điểm</span>
          </button>
        </div>
      </div>

      {/* Code Editing Surface with Line Numbers, Color Syntax Highlighting & Smooth Sliding Caret */}
      <div className="relative flex min-h-[290px] max-h-[450px] overflow-y-auto bg-zinc-950">
        {/* Hidden Monospace Measurement Span for Exact Sliding Caret Coordinates */}
        <span
          ref={measureSpanRef}
          aria-hidden="true"
          className="pointer-events-none invisible fixed top-0 left-0 font-mono-tabular text-[15px] sm:text-base whitespace-pre select-none"
        >
          {currentLineBeforeCursor}
        </span>

        {/* Line Numbers Gutter */}
        <div
          aria-hidden="true"
          className="select-none py-3.5 px-2.5 bg-black border-r border-zinc-800 text-right font-mono-tabular text-sm leading-7 text-zinc-500 min-w-[48px] shrink-0 z-10"
        >
          {lines.map((_, i) => {
            const lineNum = i + 1;
            const diag = errorLinesMap.get(lineNum);
            const isCurrentLine = i === activeLineIndex;
            return (
              <div
                key={lineNum}
                className={`px-1 flex items-center justify-end gap-1 transition-colors ${
                  diag?.severity === 'error'
                    ? 'text-white font-bold bg-red-600'
                    : diag?.severity === 'warning'
                      ? 'text-black font-bold bg-amber-300'
                      : isCurrentLine
                        ? 'text-sky-400 font-bold'
                        : ''
                }`}
                title={diag ? `${diag.message} (${diag.suggestion})` : undefined}
              >
                {diag && (
                  <span className="text-[10px]">
                    {diag.severity === 'error' ? '!' : '?'}
                  </span>
                )}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Synchronized Color Syntax Highlight Backdrop + Smooth Sliding Caret Overlay + Editable Textarea */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          {/* SVG Overlay for Smooth Sliding Active Line & Smooth Sliding Blinking Caret Bar */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-full h-full z-20 overflow-hidden"
          >
            <rect
              x="0"
              y={activeLineY}
              width="100%"
              height="28"
              className="fill-sky-500/10 smooth-sliding-line"
            />
            <rect
              data-testid="sliding-editor-caret"
              x={caretX}
              y={caretY}
              width="2.5"
              height="21"
              rx="1"
              className={`fill-sky-400 smooth-sliding-caret ${
                isTypingActive ? 'opacity-100' : 'animate-caret-blink'
              }`}
            />
          </svg>

          <pre
            ref={highlightRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 m-0 p-3.5 font-mono-tabular text-[15px] sm:text-base leading-7 whitespace-pre overflow-hidden select-none z-10"
          >
            {code ? (
              lines.map((line, lIdx) => {
                const tokens = tokenizeCodeLine(line, problem.language);
                return (
                  <div key={lIdx} className="min-h-[1.75rem]">
                    {tokens.map((tok, tIdx) => (
                      <span key={tIdx} className={tok.className}>
                        {tok.text}
                      </span>
                    ))}
                  </div>
                );
              })
            ) : (
              <span className="text-zinc-600 whitespace-normal block text-sm sm:text-[15px] pl-1">
                {`Nhập mã nguồn ${LANGUAGE_LABELS[problem.language]} của bạn tại đây...`}
              </span>
            )}
          </pre>

          <textarea
            ref={textareaRef}
            data-testid="code-editor-textarea"
            aria-label={`Trình soạn thảo mã ${LANGUAGE_LABELS[problem.language]}`}
            value={code}
            wrap="off"
            onChange={(e) => {
              onChangeCode(e.target.value);
              setCursorOffset(e.target.selectionStart ?? e.target.value.length);
              setIsTypingActive(true);
            }}
            onScroll={handleScrollSync}
            onClick={(e) => setCursorOffset(e.currentTarget.selectionStart ?? 0)}
            onKeyUp={(e) => setCursorOffset(e.currentTarget.selectionStart ?? 0)}
            onSelect={(e) => setCursorOffset(e.currentTarget.selectionStart ?? 0)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            className="code-input relative z-30 w-full p-3.5 bg-transparent text-transparent caret-transparent selection:bg-sky-500/30 font-mono-tabular text-[15px] sm:text-base leading-7 whitespace-pre focus:outline-none resize-none overflow-x-auto"
            rows={Math.max(11, lines.length + 2)}
          />
        </div>
      </div>

      {/* Dedicated Live Current Statement Output Bar */}
      <div
        data-testid="live-output-bar"
        className="px-3.5 sm:px-4 py-2.5 bg-zinc-900 border-t border-zinc-700 text-xs sm:text-sm font-mono-tabular flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0"
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-zinc-400 shrink-0">Dòng lệnh hiện tại:</span>
          <code className="px-2 py-0.5 bg-black border border-zinc-700 text-sky-300 break-all sm:truncate sm:max-w-[320px]">
            {liveCommandInfo.currentStatement}
          </code>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="text-zinc-400 shrink-0">Dòng Output:</span>
          <span className="font-bold text-emerald-400 break-words">
            {liveCommandInfo.liveOutput}
          </span>
        </div>
      </div>

      {/* Real-time Syntax & Linter Status Footer (Gentle Hint Shown Only When Error Occurs) */}
      <div className="px-4 py-2.5 bg-black border-t border-zinc-800 text-xs sm:text-sm">
        {diagnostics.length === 0 ? (
          <div className="flex items-center justify-between text-white gap-2">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              [OK] Kiểm tra cú pháp thời gian thực: HỢP LỆ (0 lỗi cú pháp, sẵn sàng chấm điểm)
            </span>
            <span className="text-zinc-400 hidden md:inline shrink-0">
              Phím tắt: Ctrl + Enter để chạy thử
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-amber-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                [!] Phát hiện {errorCount} lỗi cú pháp · {warningCount} cảnh báo theo thời gian thực:
              </span>
            </div>
            <ul className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {diagnostics.map((d, index) => (
                <li
                  key={`${d.line}-${index}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 text-xs bg-zinc-900 px-2.5 py-1.5 border border-zinc-700"
                >
                  <div>
                    <span
                      className={`font-mono-tabular font-bold ${
                        d.severity === 'error' ? 'text-red-400' : 'text-amber-300'
                      }`}
                    >
                      [Dòng {d.line}] {d.severity === 'error' ? '! LỖI:' : '? CẢNH BÁO:'}
                    </span>{' '}
                    <span className="text-zinc-200">{d.message}</span>
                  </div>
                  <span className="text-sky-300 italic">Gợi ý nhẹ: {d.suggestion}</span>
                </li>
              ))}
            </ul>
            {errorCount > 0 && problem.hints.length > 0 && (
              <div className="px-2.5 py-1.5 bg-zinc-900/80 border border-zinc-700 text-xs text-amber-200 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>
                  <strong>Gợi ý nhẹ hướng giải:</strong> {problem.hints[0]}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
