import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
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
  autoUppercaseSql,
  getAutocompleteSuggestions,
  getDefaultEditorCode,
  getLiveCommandOutput,
} from '../utils/codeEngine';

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

const MONACO_LANGUAGE_MAP: Record<Language, string> = {
  python: 'python',
  html: 'html',
  sql: 'sql',
};

export const ClassicalIdeEditor: React.FC<ClassicalIdeEditorProps> = ({
  problem,
  code,
  onChangeCode,
  onRunAndGrade,
  onResetStarter,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoEditorRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoInstanceRef = useRef<any>(null);
  const runCallbackRef = useRef(onRunAndGrade);
  runCallbackRef.current = onRunAndGrade;
  const lastTrustedCodeRef = useRef<string>(code);
  lastTrustedCodeRef.current = code;
  const pasteBlockedUntilRef = useRef<number>(0);

  const [cursorOffset, setCursorOffset] = useState<number>(code.length);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Track device viewport width passively for smooth responsive Monaco Editor layout
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setIsCompactViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Defer heavy syntax analysis & live code execution so typing stays 60fps across all devices
  const deferredCode = useDeferredValue(code);
  const deferredCursorOffset = useDeferredValue(cursorOffset);

  const diagnostics: SyntaxDiagnostic[] = useMemo(
    () => analyzeSyntax(deferredCode, problem.language),
    [deferredCode, problem.language]
  );

  const liveCommandInfo = useMemo(
    () => getLiveCommandOutput(problem, deferredCode, deferredCursorOffset),
    [problem, deferredCode, deferredCursorOffset]
  );

  const lines = useMemo(
    () => (deferredCode ? deferredCode.split('\n') : ['']),
    [deferredCode]
  );

  // Sync syntax diagnostics into Visual Studio Code (Monaco) squiggly underlines
  useEffect(() => {
    const monaco = monacoInstanceRef.current;
    const editor = monacoEditorRef.current;
    if (!monaco || !editor) return;
    const model = editor.getModel();
    if (!model) return;

    const markers = diagnostics.map((d) => ({
      startLineNumber: Math.max(1, d.line),
      startColumn: Math.max(1, d.column || 1),
      endLineNumber: Math.max(1, d.line),
      endColumn: Math.max(2, (lines[d.line - 1]?.length || 10) + 1),
      message: `${d.message}${d.suggestion ? `\nGợi ý: ${d.suggestion}` : ''}`,
      severity:
        d.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : monaco.MarkerSeverity.Warning,
    }));

    monaco.editor.setModelMarkers(model, 'vscode-syntax-Diagnostics', markers);
  }, [diagnostics, lines, problem.language]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    monacoEditorRef.current = editor;
    monacoInstanceRef.current = monaco;

    const collapseEditorSelection = () => {
      const pos = editor.getPosition();
      if (pos) {
        editor.setSelection(
          new monaco.Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column)
        );
      }
    };

    const markPasteAttemptBlocked = () => {
      pasteBlockedUntilRef.current = Date.now() + 250;
      collapseEditorSelection();
    };

    // Bind Ctrl + Enter / Cmd + Enter to Run & Grade inside VS Code editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      runCallbackRef.current();
    });

    // Block all Copy, Cut, Paste combinations on macOS (Cmd & Ctrl) and Windows/Linux
    const blockedKeybindings = [
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX,
      monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyC,
      monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyV,
      monaco.KeyMod.WinCtrl | monaco.KeyCode.KeyX,
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC,
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyV,
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyX,
      monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyC,
      monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyV,
      monaco.KeyMod.WinCtrl | monaco.KeyMod.Shift | monaco.KeyCode.KeyX,
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Insert,
      monaco.KeyMod.WinCtrl | monaco.KeyCode.Insert,
      monaco.KeyMod.Shift | monaco.KeyCode.Insert,
    ];
    blockedKeybindings.forEach((kb) => {
      editor.addCommand(kb, () => {
        markPasteAttemptBlocked();
      });
    });

    // Make Tab key strictly indent/outdent and block Copy/Cut/Paste keydowns inside Monaco
    editor.onKeyDown((e) => {
      const upperBrowserKey = (e.browserEvent?.key || '').toUpperCase();
      const upperBrowserCode = (e.browserEvent?.code || '').toUpperCase();
      const isCopyCutPasteKey =
        e.keyCode === monaco.KeyCode.KeyC ||
        e.keyCode === monaco.KeyCode.KeyV ||
        e.keyCode === monaco.KeyCode.KeyX ||
        e.keyCode === monaco.KeyCode.Insert ||
        upperBrowserKey === 'C' ||
        upperBrowserKey === 'V' ||
        upperBrowserKey === 'X' ||
        upperBrowserKey === 'INSERT' ||
        upperBrowserCode === 'KEYC' ||
        upperBrowserCode === 'KEYV' ||
        upperBrowserCode === 'KEYX' ||
        upperBrowserCode === 'INSERT';

      if (((e.ctrlKey || e.metaKey) && !e.altKey && isCopyCutPasteKey) || (e.shiftKey && e.keyCode === monaco.KeyCode.Insert)) {
        markPasteAttemptBlocked();
        e.preventDefault();
        e.stopPropagation();
        if (e.browserEvent) {
          e.browserEvent.preventDefault();
          e.browserEvent.stopPropagation();
        }
        return;
      }
      if (e.keyCode === monaco.KeyCode.Tab && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        editor.trigger('keyboard', 'hideSuggestWidget', {});
        editor.trigger('keyboard', e.shiftKey ? 'outdent' : 'tab', {});
      }
    });

    const blockClipboardDomEvent = (ev: Event) => {
      markPasteAttemptBlocked();
      const clipEv = ev as ClipboardEvent;
      if (clipEv.clipboardData) {
        try {
          clipEv.clipboardData.setData('text/plain', '');
          clipEv.clipboardData.setData('text/html', '');
          clipEv.clipboardData.clearData();
        } catch {
          // ignore
        }
      }
      ev.preventDefault();
      ev.stopPropagation();
      if (typeof ev.stopImmediatePropagation === 'function') {
        ev.stopImmediatePropagation();
      }
    };

    const blockBeforeInputDomEvent = (ev: Event) => {
      const inputEv = ev as InputEvent;
      const inputType = String(inputEv.inputType || '');
      if (
        inputType === 'insertFromPaste' ||
        inputType === 'insertFromPasteAsQuotation' ||
        inputType === 'insertFromDrop' ||
        inputType === 'insertFromYank' ||
        inputType === 'deleteByCut' ||
        inputType === 'deleteByDrag'
      ) {
        markPasteAttemptBlocked();
        ev.preventDefault();
        ev.stopPropagation();
        if (typeof ev.stopImmediatePropagation === 'function') {
          ev.stopImmediatePropagation();
        }
      }
    };

    const domNode = editor.getDomNode();
    if (domNode) {
      (['copy', 'cut', 'paste', 'drop', 'dragstart'] as const).forEach((evtName) => {
        domNode.addEventListener(evtName, blockClipboardDomEvent, { capture: true });
      });
      domNode.addEventListener('beforeinput', blockBeforeInputDomEvent, { capture: true });

      const internalInputs = domNode.querySelectorAll('textarea, .inputarea, .native-edit-context');
      internalInputs.forEach((el) => {
        (['copy', 'cut', 'paste', 'drop', 'dragstart'] as const).forEach((evtName) => {
          el.addEventListener(evtName, blockClipboardDomEvent, { capture: true });
        });
        el.addEventListener('beforeinput', blockBeforeInputDomEvent, { capture: true });
      });
    }

    // Update cursor offset for the live statement output bar
    editor.onDidChangeCursorPosition((e) => {
      const model = editor.getModel();
      if (model) {
        setCursorOffset(model.getOffsetAt(e.position));
      }
    });

    // Register atomic keyword suggestions (SELECT, INNER, FROM, def, print, etc.) once per Monaco instance
    const monacoWithFlag = monaco as unknown as { __atomicProvidersRegistered?: boolean };
    if (!monacoWithFlag.__atomicProvidersRegistered) {
      monacoWithFlag.__atomicProvidersRegistered = true;
      (['python', 'html', 'sql'] as const).forEach((lang) => {
        monaco.languages.registerCompletionItemProvider(lang, {
          provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            if (!word.word) {
              return { suggestions: [] };
            }
            const fullText = model.getValue();
            const offset = model.getOffsetAt(position);
            const items = getAutocompleteSuggestions(fullText, offset, lang);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };
            return {
              suggestions: items.map((s) => ({
                label: s.label,
                kind:
                  s.kind === 'function'
                    ? monaco.languages.CompletionItemKind.Function
                    : monaco.languages.CompletionItemKind.Keyword,
                insertText: s.insertText,
                detail: s.detail,
                range,
              })),
            };
          },
        });
      });
    }
  };

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter((d) => d.severity === 'warning').length;

  return (
    <div
      onCopy={(e) => {
        if (e.clipboardData) {
          try {
            e.clipboardData.setData('text/plain', '');
            e.clipboardData.setData('text/html', '');
          } catch {
            // ignore
          }
        }
        e.preventDefault();
        e.stopPropagation();
      }}
      onCut={(e) => {
        if (e.clipboardData) {
          try {
            e.clipboardData.setData('text/plain', '');
            e.clipboardData.setData('text/html', '');
          } catch {
            // ignore
          }
        }
        e.preventDefault();
        e.stopPropagation();
      }}
      onPaste={(e) => {
        pasteBlockedUntilRef.current = Date.now() + 250;
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        pasteBlockedUntilRef.current = Date.now() + 250;
        e.preventDefault();
        e.stopPropagation();
      }}
      className="flex flex-col border-2 border-zinc-900 bg-zinc-950 text-white rounded-none overflow-hidden min-w-0"
    >
      {/* Editor Top Utility Strip — Original UI Shell */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 bg-black border-b border-zinc-800">
        <div className="flex flex-wrap items-center gap-2 text-base sm:text-lg text-zinc-300 min-w-0">
          <Code2 className="w-5 h-5 text-sky-400 shrink-0" />
          <span
            data-testid="editor-language-label"
            className="font-bold text-white tracking-tight"
          >
            {LANGUAGE_LABELS[problem.language]}
          </span>
          {problem.language === 'sql' && (
            <span className="text-xs font-mono text-emerald-400">
              · Tự động IN HOA tên hàm SQL
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              const resetVal = getDefaultEditorCode(problem);
              pasteBlockedUntilRef.current = 0;
              lastTrustedCodeRef.current = resetVal;
              onResetStarter();
              setCursorOffset(resetVal.length);
              if (monacoEditorRef.current) {
                monacoEditorRef.current.setValue(resetVal);
              }
            }}
            className="px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>
              {problem.language === 'html' ? 'Khôi phục khung HTML' : 'Xóa trắng'}
            </span>
          </button>

          <button
            type="button"
            data-testid="run-grade-btn"
            onClick={onRunAndGrade}
            className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-black bg-emerald-400 hover:bg-emerald-300 border border-emerald-300 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current shrink-0" />
            <span>Chạy thử & Chấm điểm</span>
          </button>
        </div>
      </div>

      {/* Code Editing Surface — Visual Studio Code (Monaco Editor vs-dark) */}
      <div className="relative w-full h-[320px] sm:h-[400px] lg:h-[420px] bg-[#1e1e1e]">
        <Editor
          height="100%"
          language={MONACO_LANGUAGE_MAP[problem.language]}
          theme="vs-dark"
          value={code}
          onMount={handleEditorDidMount}
          onChange={(val) => {
            const raw = val ?? '';
            if (Date.now() < pasteBlockedUntilRef.current) {
              const safePrev = lastTrustedCodeRef.current;
              if (monacoEditorRef.current) {
                const model = monacoEditorRef.current.getModel();
                if (model && model.getValue() !== safePrev) {
                  model.setValue(safePrev);
                }
              }
              return;
            }
            const next =
              problem.language === 'sql' ? autoUppercaseSql(raw) : raw;
            if (
              problem.language === 'sql' &&
              next !== raw &&
              monacoEditorRef.current
            ) {
              const editor = monacoEditorRef.current;
              const model = editor.getModel();
              const currentSelection = editor.getSelection();
              const scrollTop = editor.getScrollTop();
              if (model && model.getValue() !== next) {
                model.setValue(next);
                if (currentSelection) {
                  editor.setSelection(currentSelection);
                }
                editor.setScrollTop(scrollTop);
              }
            }
            lastTrustedCodeRef.current = next;
            onChangeCode(next);
          }}
          options={{
            fontSize: isCompactViewport ? 15 : 17,
            lineHeight: isCompactViewport ? 24 : 28,
            fontFamily:
              "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
            fontLigatures: !isCompactViewport,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            contextmenu: false,
            copyWithSyntaxHighlighting: false,
            emptySelectionClipboard: false,
            selectionClipboard: false,
            editContext: false,
            dropIntoEditor: { enabled: false },
            minimap: { enabled: !isCompactViewport },
            folding: !isCompactViewport,
            lineNumbersMinChars: isCompactViewport ? 3 : 4,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            renderLineHighlight: 'all',
            tabCompletion: 'off',
            acceptSuggestionOnCommitCharacter: false,
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: 'none',
            wordBasedSuggestions: 'off',
            suggestOnTriggerCharacters: false,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            suggest: {
              showSnippets: false,
              showWords: false,
              showKeywords: true,
              showFunctions: true,
            },
            tabSize: 4,
            insertSpaces: true,
            formatOnPaste: false,
            formatOnType: true,
          }}
          loading={
            <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-xs font-mono text-zinc-400">
              Đang tải trình soạn thảo Visual Studio Code...
            </div>
          }
        />

        {/* Synchronized hidden textarea for accessibility & instant state sync */}
        <textarea
          data-testid="code-editor-textarea"
          aria-label={`Trình soạn thảo mã ${LANGUAGE_LABELS[problem.language]}`}
          value={code}
          onCopy={(e) => {
            if (e.clipboardData) {
              try {
                e.clipboardData.setData('text/plain', '');
                e.clipboardData.setData('text/html', '');
              } catch {
                // ignore
              }
            }
            e.preventDefault();
            e.stopPropagation();
          }}
          onCut={(e) => {
            if (e.clipboardData) {
              try {
                e.clipboardData.setData('text/plain', '');
                e.clipboardData.setData('text/html', '');
              } catch {
                // ignore
              }
            }
            e.preventDefault();
            e.stopPropagation();
          }}
          onPaste={(e) => {
            pasteBlockedUntilRef.current = Date.now() + 250;
            e.preventDefault();
            e.stopPropagation();
          }}
          onChange={(e) => {
            if (Date.now() < pasteBlockedUntilRef.current) {
              return;
            }
            const raw = e.target.value;
            const next =
              problem.language === 'sql' ? autoUppercaseSql(raw) : raw;
            lastTrustedCodeRef.current = next;
            onChangeCode(next);
            setCursorOffset(e.target.selectionStart ?? next.length);
            if (
              monacoEditorRef.current &&
              monacoEditorRef.current.getValue() !== next
            ) {
              monacoEditorRef.current.setValue(next);
            }
          }}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      {/* Dedicated Live Current Statement Output Bar — Original UI Shell */}
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

      {/* Real-time Syntax & Linter Status Footer */}
      <div className="px-4 py-3 bg-black border-t border-zinc-800 text-xs sm:text-sm space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {diagnostics.length === 0 ? (
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              [OK] Kiểm tra cú pháp thời gian thực: HỢP LỆ (0 lỗi cú pháp, sẵn sàng chấm điểm)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              [!] Phát hiện {errorCount} lỗi cú pháp · {warningCount} cảnh báo theo thời gian thực:
            </span>
          )}
        </div>

        {diagnostics.length > 0 && (
          <div className="space-y-2">
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

