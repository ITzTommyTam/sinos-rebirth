import React from 'react';
import { Language } from '../types/academic';

const PYTHON_KEYWORDS = new Set([
  'def',
  'return',
  'if',
  'elif',
  'else',
  'for',
  'while',
  'in',
  'not',
  'and',
  'or',
  'True',
  'False',
  'None',
  'import',
  'from',
  'as',
  'break',
  'continue',
  'pass',
  'class',
  'lambda',
  'try',
  'except',
]);

const PYTHON_BUILTINS = new Set([
  'print',
  'input',
  'int',
  'float',
  'str',
  'list',
  'map',
  'len',
  'sum',
  'max',
  'min',
  'sorted',
  'range',
  'abs',
  'round',
  'set',
  'dict',
  'enumerate',
  'zip',
  'append',
  'split',
  'strip',
  'join',
]);

const SQL_KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'INNER',
  'LEFT',
  'RIGHT',
  'JOIN',
  'ON',
  'GROUP',
  'BY',
  'HAVING',
  'ORDER',
  'ASC',
  'DESC',
  'LIMIT',
  'DISTINCT',
  'AS',
  'AND',
  'OR',
  'NOT',
  'IN',
  'BETWEEN',
  'LIKE',
  'IS',
  'NULL',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'CREATE',
  'TABLE',
]);

const SQL_FUNCTIONS = new Set([
  'COUNT',
  'SUM',
  'AVG',
  'MAX',
  'MIN',
  'ROUND',
  'UPPER',
  'LOWER',
]);

interface TokenSpan {
  text: string;
  className: string;
}

export function tokenizeCodeLine(line: string, language: Language): TokenSpan[] {
  if (!line) return [{ text: '', className: 'text-zinc-100' }];

  if (language === 'python') {
    const commentIdx = line.indexOf('#');
    const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';

    const spans: TokenSpan[] = [];
    const regex = /('[^']*'|"[^"]*"|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_]\w*\b|[+\-*/%=<>!:]+|\s+|.)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(codePart)) !== null) {
      const tok = match[0];
      if ((tok.startsWith("'") && tok.endsWith("'")) || (tok.startsWith('"') && tok.endsWith('"'))) {
        spans.push({ text: tok, className: 'text-emerald-400' });
      } else if (/^\d/.test(tok)) {
        spans.push({ text: tok, className: 'text-orange-400' });
      } else if (PYTHON_KEYWORDS.has(tok)) {
        spans.push({ text: tok, className: 'text-sky-400 font-semibold' });
      } else if (PYTHON_BUILTINS.has(tok)) {
        spans.push({ text: tok, className: 'text-amber-300' });
      } else if (/^[+\-*/%=<>!:]+$/.test(tok)) {
        spans.push({ text: tok, className: 'text-purple-300' });
      } else {
        spans.push({ text: tok, className: 'text-zinc-100' });
      }
    }

    if (commentPart) {
      spans.push({ text: commentPart, className: 'text-slate-400 italic' });
    }
    return spans;
  }

  if (language === 'sql') {
    const commentIdx = line.indexOf('--');
    const codePart = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    const commentPart = commentIdx >= 0 ? line.slice(commentIdx) : '';

    const spans: TokenSpan[] = [];
    const regex = /('[^']*'|"[^"]*"|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_]\w*\b|[=<>!*+,;()]|\s+|.)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(codePart)) !== null) {
      const tok = match[0];
      const upper = tok.toUpperCase();
      if ((tok.startsWith("'") && tok.endsWith("'")) || (tok.startsWith('"') && tok.endsWith('"'))) {
        spans.push({ text: tok, className: 'text-emerald-400' });
      } else if (/^\d/.test(tok)) {
        spans.push({ text: tok, className: 'text-orange-400' });
      } else if (SQL_KEYWORDS.has(upper)) {
        spans.push({ text: tok, className: 'text-sky-400 font-semibold' });
      } else if (SQL_FUNCTIONS.has(upper)) {
        spans.push({ text: tok, className: 'text-amber-300 font-semibold' });
      } else if (/^[=<>!*+,;()]+$/.test(tok)) {
        spans.push({ text: tok, className: 'text-purple-300' });
      } else {
        spans.push({ text: tok, className: 'text-zinc-100' });
      }
    }

    if (commentPart) {
      spans.push({ text: commentPart, className: 'text-slate-400 italic' });
    }
    return spans;
  }

  // HTML & CSS highlighting
  const spans: TokenSpan[] = [];
  const htmlRegex = /(<!--[\s\S]*?-->|<\/?[a-zA-Z0-9-]+|\s+[a-zA-Z-]+(?==)|"[^"]*"|'[^']*'|\/?>|\b(?:padding|margin|border|border-collapse|width|background-color|color|font-weight|text-align|display)\b|\s+|.)/g;
  let match: RegExpExecArray | null;
  while ((match = htmlRegex.exec(line)) !== null) {
    const tok = match[0];
    if (tok.startsWith('<!--')) {
      spans.push({ text: tok, className: 'text-slate-400 italic' });
    } else if (/^<\/?[a-zA-Z0-9-]+/.test(tok) || tok === '>' || tok === '/>') {
      spans.push({ text: tok, className: 'text-sky-400 font-semibold' });
    } else if (/^\s+[a-zA-Z-]+$/.test(tok)) {
      spans.push({ text: tok, className: 'text-amber-300' });
    } else if ((tok.startsWith('"') && tok.endsWith('"')) || (tok.startsWith("'") && tok.endsWith("'"))) {
      spans.push({ text: tok, className: 'text-emerald-400' });
    } else if (/^(padding|margin|border|border-collapse|width|background-color|color|font-weight|text-align|display)$/.test(tok)) {
      spans.push({ text: tok, className: 'text-purple-300' });
    } else {
      spans.push({ text: tok, className: 'text-zinc-100' });
    }
  }
  return spans;
}

interface SyntaxHighlightedCodeProps {
  code: string;
  language: Language;
  className?: string;
}

export const SyntaxHighlightedCode: React.FC<SyntaxHighlightedCodeProps> = ({
  code,
  language,
  className = '',
}) => {
  const lines = code.split('\n');
  return (
    <pre
      className={`p-3.5 bg-zinc-950 text-zinc-100 font-mono-tabular text-xs leading-6 border border-zinc-900 overflow-x-auto ${className}`}
    >
      <code>
        {lines.map((line, lineIdx) => {
          const tokens = tokenizeCodeLine(line, language);
          return (
            <div key={lineIdx} className="min-h-[1.5rem] whitespace-pre">
              {tokens.map((t, tIdx) => (
                <span key={tIdx} className={t.className}>
                  {t.text}
                </span>
              ))}
            </div>
          );
        })}
      </code>
    </pre>
  );
};
