import {
  AutocompleteSuggestion,
  ExecutionReport,
  HtmlRequirement,
  Language,
  Problem,
  SqlTableSchema,
  SyntaxDiagnostic,
  TestCaseResult,
} from '../types/academic';

// Prevent browser native window.print() (macOS/Windows Print Dialog) from ever being triggered by user Python print() code
if (typeof window !== 'undefined') {
  window.print = () => {};
}

/**
 * Sanitizes user-authored HTML5/CSS3 code before rendering inside the sandboxed preview iframe.
 * Strips executable <script>, nested <iframe>/<object>/<embed>, inline on* event handlers, and javascript: URIs
 * while preserving all valid high-school HTML5 tags (table, form, input, style, ul, ol, h1..h6, p, a, img, etc.).
 */
export function sanitizeHtmlForPreview(rawHtml: string): string {
  if (!rawHtml) return '';
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<\/?(?:script|iframe|frame|frameset|object|embed|applet|base|meta)\b[^>]*>/gi, '')
    .replace(/\son[a-z0-9_]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(?:href|src|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"]*"|'\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^']*')/gi, 'href="#"');
}

export interface ShortcutEventLike {
  key?: string;
  code?: string;
  keyCode?: number;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/**
 * Pure helper that detects whether a keyboard event matches F12 or browser Developer Tools / View Source shortcuts:
 * - F12 (key === 'F12', code === 'F12', or keyCode === 123)
 * - Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C / Ctrl+Shift+K (Windows/Linux DevTools & Console/Inspector)
 * - Cmd+Option+I / Cmd+Option+J / Cmd+Option+C / Cmd+Option+K / Cmd+Option+U (macOS DevTools & View Source)
 * - Ctrl+U (View Page Source)
 */
export function isBlockedDevToolsShortcut(e: ShortcutEventLike): boolean {
  if (!e) return false;
  const upperKey = (e.key || '').toUpperCase();
  const upperCode = (e.code || '').toUpperCase();

  if (upperKey === 'F12' || upperCode === 'F12' || e.keyCode === 123) {
    return true;
  }

  if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'K'].includes(upperKey)) {
    return true;
  }

  if (e.metaKey && e.altKey && ['I', 'J', 'C', 'K', 'U'].includes(upperKey)) {
    return true;
  }

  if (e.ctrlKey && !e.shiftKey && !e.altKey && upperKey === 'U') {
    return true;
  }

  return false;
}

const SQL_KEYWORDS_AND_FUNCTIONS = new Set([
  // SQL Functions (Aggregate, Scalar, String, Date, Math, Null-handling)
  'COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'ROUND', 'ABS', 'CEIL', 'CEILING', 'FLOOR',
  'MOD', 'POWER', 'SQRT', 'UPPER', 'LOWER', 'LENGTH', 'CHAR_LENGTH', 'SUBSTR',
  'SUBSTRING', 'TRIM', 'LTRIM', 'RTRIM', 'REPLACE', 'CONCAT', 'COALESCE', 'IFNULL',
  'NULLIF', 'CAST', 'DATE', 'TIME', 'DATETIME', 'YEAR', 'MONTH', 'DAY', 'NOW',
  'STRFTIME', 'JULIANDAY', 'TOTAL', 'GROUP_CONCAT', 'IIF', 'TYPEOF', 'RANDOM',
  // SQL Clauses, Commands & Operators
  'SELECT', 'FROM', 'WHERE', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS',
  'JOIN', 'ON', 'USING', 'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT',
  'OFFSET', 'DISTINCT', 'ALL', 'AS', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE',
  'GLOB', 'IS', 'NULL', 'TRUE', 'FALSE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'UNION', 'INTERSECT', 'EXCEPT', 'EXISTS', 'INSERT', 'INTO', 'VALUES', 'UPDATE',
  'SET', 'DELETE', 'CREATE', 'TABLE', 'TEMP', 'TEMPORARY', 'IF', 'ALTER', 'ADD',
  'COLUMN', 'RENAME', 'TO', 'DROP', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
  'UNIQUE', 'CHECK', 'DEFAULT', 'INDEX', 'VIEW', 'WITH', 'RECURSIVE', 'OVER',
  'PARTITION', 'ROW_NUMBER', 'RANK', 'DENSE_RANK',
]);

/**
 * Automatically uppercases SQL function names and SQL keywords outside of string literals ('...' or "..."),
 * while keeping table names, column names, and string literals in the student's original casing.
 * Preserves exact string length, line breaks, and cursor offsets (1-to-1 character mapping).
 */
export function autoUppercaseSql(sql: string): string {
  if (!sql) return '';
  let result = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      result += ch;
      i++;
    } else if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      result += ch;
      i++;
    } else if (!inSingleQuote && !inDoubleQuote && /[a-zA-Z_]/.test(ch)) {
      let end = i + 1;
      while (end < sql.length && /[a-zA-Z0-9_]/.test(sql[end])) {
        end++;
      }
      const token = sql.slice(i, end);
      const upperToken = token.toUpperCase();

      if (SQL_KEYWORDS_AND_FUNCTIONS.has(upperToken)) {
        result += upperToken;
      } else {
        // If user typed a keyword/function (which got auto-uppercased) and continued typing
        // a longer identifier or snake_case column name (e.g. MIN -> MIN_diem or IN -> INner),
        // revert the auto-uppercased prefix back to lowercase seamlessly.
        const prefixMatch = token.match(/^([A-Z]+)([a-z_][a-zA-Z0-9_]*)$/);
        if (prefixMatch && SQL_KEYWORDS_AND_FUNCTIONS.has(prefixMatch[1])) {
          result += prefixMatch[1].toLowerCase() + prefixMatch[2];
        } else {
          result += token;
        }
      }
      i = end;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}

/**
 * Returns the default initial code for a problem:
 * - For HTML problems: pre-populates only the bare HTML skeleton (no <title>, no <style>, no comments).
 * - For Python & SQL problems: starts empty ('').
 */
export function getDefaultEditorCode(problem: Problem): string {
  if (problem.language === 'html') {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
</head>
<body>
  
</body>
</html>`;
  }
  return '';
}


const PYTHON_SUGGESTIONS: AutocompleteSuggestion[] = [
  { label: 'def', insertText: 'def ', kind: 'keyword', detail: 'Từ khóa khai báo hàm' },
  { label: 'for', insertText: 'for ', kind: 'keyword', detail: 'Từ khóa vòng lặp for' },
  { label: 'while', insertText: 'while ', kind: 'keyword', detail: 'Từ khóa vòng lặp while' },
  { label: 'if', insertText: 'if ', kind: 'keyword', detail: 'Từ khóa điều kiện if' },
  { label: 'elif', insertText: 'elif ', kind: 'keyword', detail: 'Từ khóa nhánh elif' },
  { label: 'else', insertText: 'else:', kind: 'keyword', detail: 'Từ khóa nhánh else' },
  { label: 'return', insertText: 'return ', kind: 'keyword', detail: 'Từ khóa trả về giá trị' },
  { label: 'in', insertText: 'in ', kind: 'keyword', detail: 'Toán tử kiểm tra / duyệt phần tử' },
  { label: 'and', insertText: 'and ', kind: 'keyword', detail: 'Toán tử logic VÀ' },
  { label: 'or', insertText: 'or ', kind: 'keyword', detail: 'Toán tử logic HOẶC' },
  { label: 'not', insertText: 'not ', kind: 'keyword', detail: 'Toán tử phủ định' },
  { label: 'True', insertText: 'True', kind: 'keyword', detail: 'Giá trị logic đúng' },
  { label: 'False', insertText: 'False', kind: 'keyword', detail: 'Giá trị logic sai' },
  { label: 'print', insertText: 'print', kind: 'function', detail: 'Hàm in kết quả chuẩn' },
  { label: 'input', insertText: 'input', kind: 'function', detail: 'Hàm đọc dữ liệu đầu vào' },
  { label: 'range', insertText: 'range', kind: 'function', detail: 'Hàm tạo dãy số lặp' },
  { label: 'len', insertText: 'len', kind: 'function', detail: 'Hàm lấy độ dài' },
  { label: 'sum', insertText: 'sum', kind: 'function', detail: 'Hàm tính tổng' },
  { label: 'max', insertText: 'max', kind: 'function', detail: 'Hàm tìm giá trị lớn nhất' },
  { label: 'min', insertText: 'min', kind: 'function', detail: 'Hàm tìm giá trị nhỏ nhất' },
  { label: 'sorted', insertText: 'sorted', kind: 'function', detail: 'Hàm sắp xếp danh sách' },
  { label: 'int', insertText: 'int', kind: 'function', detail: 'Ép kiểu số nguyên' },
  { label: 'float', insertText: 'float', kind: 'function', detail: 'Ép kiểu số thực' },
  { label: 'str', insertText: 'str', kind: 'function', detail: 'Ép kiểu chuỗi ký tự' },
  { label: 'list', insertText: 'list', kind: 'function', detail: 'Khởi tạo danh sách' },
  { label: 'map', insertText: 'map', kind: 'function', detail: 'Ánh xạ hàm lên danh sách' },
  { label: 'append', insertText: 'append', kind: 'function', detail: 'Phương thức thêm phần tử cuối list' },
  { label: 'split', insertText: 'split', kind: 'function', detail: 'Phương thức tách chuỗi' },
  { label: 'strip', insertText: 'strip', kind: 'function', detail: 'Phương thức cắt khoảng trắng' },
];

const HTML_SUGGESTIONS: AutocompleteSuggestion[] = [
  { label: 'table', insertText: 'table', kind: 'tag', detail: 'Thẻ bảng dữ liệu HTML' },
  { label: 'thead', insertText: 'thead', kind: 'tag', detail: 'Phần đầu bảng' },
  { label: 'tbody', insertText: 'tbody', kind: 'tag', detail: 'Phần thân bảng' },
  { label: 'tr', insertText: 'tr', kind: 'tag', detail: 'Hàng trong bảng' },
  { label: 'th', insertText: 'th', kind: 'tag', detail: 'Ô tiêu đề bảng' },
  { label: 'td', insertText: 'td', kind: 'tag', detail: 'Ô dữ liệu bảng' },
  { label: 'form', insertText: 'form', kind: 'tag', detail: 'Thẻ biểu mẫu HTML' },
  { label: 'input', insertText: 'input', kind: 'tag', detail: 'Thẻ ô nhập liệu' },
  { label: 'label', insertText: 'label', kind: 'tag', detail: 'Thẻ nhãn biểu mẫu' },
  { label: 'select', insertText: 'select', kind: 'tag', detail: 'Danh sách thả xuống' },
  { label: 'option', insertText: 'option', kind: 'tag', detail: 'Lựa chọn trong select' },
  { label: 'button', insertText: 'button', kind: 'tag', detail: 'Nút bấm' },
  { label: 'ul', insertText: 'ul', kind: 'tag', detail: 'Danh sách không thứ tự' },
  { label: 'ol', insertText: 'ol', kind: 'tag', detail: 'Danh sách có thứ tự' },
  { label: 'li', insertText: 'li', kind: 'tag', detail: 'Mục danh sách' },
  { label: 'h1', insertText: 'h1', kind: 'tag', detail: 'Tiêu đề cấp 1' },
  { label: 'h2', insertText: 'h2', kind: 'tag', detail: 'Tiêu đề cấp 2' },
  { label: 'p', insertText: 'p', kind: 'tag', detail: 'Đoạn văn bản' },
  { label: 'a', insertText: 'a', kind: 'tag', detail: 'Thẻ liên kết' },
  { label: 'img', insertText: 'img', kind: 'tag', detail: 'Thẻ hình ảnh' },
  { label: 'div', insertText: 'div', kind: 'tag', detail: 'Khối chứa phần tử' },
  { label: 'span', insertText: 'span', kind: 'tag', detail: 'Phần tử nội tuyến' },
  { label: 'style', insertText: 'style', kind: 'tag', detail: 'Thẻ khai báo CSS' },
];

const SQL_SUGGESTIONS: AutocompleteSuggestion[] = [
  { label: 'SELECT', insertText: 'SELECT ', kind: 'keyword', detail: 'Từ khóa truy vấn cột dữ liệu' },
  { label: 'FROM', insertText: 'FROM ', kind: 'keyword', detail: 'Từ khóa chỉ định bảng dữ liệu' },
  { label: 'WHERE', insertText: 'WHERE ', kind: 'keyword', detail: 'Từ khóa lọc điều kiện bản ghi' },
  { label: 'INNER', insertText: 'INNER ', kind: 'keyword', detail: 'Từ khóa kết nối trong (INNER JOIN)' },
  { label: 'JOIN', insertText: 'JOIN ', kind: 'keyword', detail: 'Từ khóa kết nối bảng' },
  { label: 'LEFT', insertText: 'LEFT ', kind: 'keyword', detail: 'Từ khóa kết nối trái (LEFT JOIN)' },
  { label: 'ON', insertText: 'ON ', kind: 'keyword', detail: 'Từ khóa điều kiện kết nối khóa' },
  { label: 'GROUP BY', insertText: 'GROUP BY ', kind: 'keyword', detail: 'Mệnh đề gom nhóm dữ liệu' },
  { label: 'HAVING', insertText: 'HAVING ', kind: 'keyword', detail: 'Mệnh đề lọc nhóm sau GROUP BY' },
  { label: 'ORDER BY', insertText: 'ORDER BY ', kind: 'keyword', detail: 'Mệnh đề sắp xếp kết quả' },
  { label: 'ASC', insertText: 'ASC', kind: 'keyword', detail: 'Sắp xếp tăng dần' },
  { label: 'DESC', insertText: 'DESC', kind: 'keyword', detail: 'Sắp xếp giảm dần' },
  { label: 'DISTINCT', insertText: 'DISTINCT ', kind: 'keyword', detail: 'Loại bỏ bản ghi trùng lặp' },
  { label: 'AS', insertText: 'AS ', kind: 'keyword', detail: 'Đặt bí danh cột hoặc bảng' },
  { label: 'AND', insertText: 'AND ', kind: 'keyword', detail: 'Toán tử kết hợp điều kiện VÀ' },
  { label: 'OR', insertText: 'OR ', kind: 'keyword', detail: 'Toán tử kết hợp điều kiện HOẶC' },
  { label: 'BETWEEN', insertText: 'BETWEEN ', kind: 'keyword', detail: 'Toán tử kiểm tra khoảng giá trị' },
  { label: 'LIKE', insertText: 'LIKE ', kind: 'keyword', detail: 'Toán tử so khớp mẫu chuỗi' },
  { label: 'LIMIT', insertText: 'LIMIT ', kind: 'keyword', detail: 'Giới hạn số lượng bản ghi' },
  { label: 'COUNT', insertText: 'COUNT', kind: 'function', detail: 'Hàm đếm số bản ghi' },
  { label: 'SUM', insertText: 'SUM', kind: 'function', detail: 'Hàm tính tổng giá trị' },
  { label: 'AVG', insertText: 'AVG', kind: 'function', detail: 'Hàm tính trung bình cộng' },
  { label: 'MAX', insertText: 'MAX', kind: 'function', detail: 'Hàm tìm giá trị lớn nhất' },
  { label: 'MIN', insertText: 'MIN', kind: 'function', detail: 'Hàm tìm giá trị nhỏ nhất' },
];

export function getAutocompleteSuggestions(
  code: string,
  cursorOffset: number,
  language: Language,
  _problem?: Problem
): AutocompleteSuggestion[] {
  const beforeCursor = code.slice(0, cursorOffset);
  const match = beforeCursor.match(/([a-zA-Z0-9_<]+)$/);
  const prefix = match ? match[1].toLowerCase() : '';

  let pool: AutocompleteSuggestion[] = [];
  if (language === 'python') {
    pool = [...PYTHON_SUGGESTIONS];
  } else if (language === 'html') {
    pool = [...HTML_SUGGESTIONS];
  } else {
    pool = [...SQL_SUGGESTIONS];
  }

  if (!prefix) {
    return pool.slice(0, 8);
  }

  return pool
    .filter(
      (item) =>
        item.label.toLowerCase().startsWith(prefix) ||
        item.insertText.toLowerCase().startsWith(prefix)
    )
    .slice(0, 8);
}

/**
 * Real-time syntax & static error checker for Python, HTML, and SQL.
 */
export function analyzeSyntax(code: string, language: Language): SyntaxDiagnostic[] {
  const diagnostics: SyntaxDiagnostic[] = [];
  const lines = code.split('\n');

  if (!code.trim()) {
    diagnostics.push({
      line: 1,
      column: 1,
      severity: 'warning',
      message: 'Trình soạn thảo đang trống. Hãy nhập mã nguồn hoặc chọn gợi ý cú pháp.',
      suggestion: 'Viết mã giải quyết yêu cầu đề bài.',
    });
    return diagnostics;
  }

  if (language === 'python') {
    let openParens = 0;
    let openBrackets = 0;
    let expectIndentNext = false;

    lines.forEach((rawLine, idx) => {
      const lineNum = idx + 1;
      const commentIdx = rawLine.indexOf('#');
      const cleanLine = (commentIdx >= 0 ? rawLine.slice(0, commentIdx) : rawLine).trimEnd();
      const trimmed = cleanLine.trim();

      if (!trimmed) return;

      const indent = cleanLine.length - cleanLine.trimStart().length;

      if (expectIndentNext && indent === 0) {
        diagnostics.push({
          line: lineNum,
          column: 1,
          severity: 'error',
          message: 'IndentationError: Thiếu thụt lề (4 dấu cách) sau câu lệnh kết thúc bằng dấu hai chấm (:).',
          suggestion: 'Thụt lề dòng này vào 4 khoảng trắng.',
        });
      }
      expectIndentNext = false;

      if (rawLine.includes('\t')) {
        diagnostics.push({
          line: lineNum,
          column: rawLine.indexOf('\t') + 1,
          severity: 'warning',
          message: 'TabError: Nên sử dụng 4 dấu cách (spaces) thay vì ký tự Tab theo chuẩn PEP-8 Bộ GD&ĐT.',
          suggestion: 'Thay ký tự Tab bằng 4 dấu cách.',
        });
      }

      // Check block statements missing ':'
      const blockMatch = trimmed.match(/^(def\s+\w+\(.*\)|if\s+.+|elif\s+.+|else|for\s+.+\s+in\s+.+|while\s+.+)$/);
      if (blockMatch && !trimmed.endsWith(':') && !trimmed.includes(':')) {
        diagnostics.push({
          line: lineNum,
          column: cleanLine.length,
          severity: 'error',
          message: `SyntaxError: Thiếu dấu hai chấm ':' ở cuối câu lệnh cấu trúc '${trimmed.split(/\s+/)[0]}'.`,
          suggestion: `Thêm dấu ':' vào cuối dòng ${lineNum}.`,
        });
      }

      // Check assignment '=' inside 'if' condition (not '==', '!=', '<=', '>=')
      if (/^(if|elif|while)\s+/.test(trimmed)) {
        const conditionPart = trimmed.replace(/^(if|elif|while)\s+/, '').split(':')[0];
        if (/(?<![=!<>])=(?!=)/.test(conditionPart)) {
          diagnostics.push({
            line: lineNum,
            column: rawLine.indexOf('=') + 1,
            severity: 'error',
            message: 'SyntaxError: Sử dụng phép gán "=" thay vì phép so sánh bằng "==" trong biểu thức điều kiện.',
            suggestion: 'Đổi "=" thành "==" để so sánh giá trị.',
          });
        }
      }

      // Check Python 2 print or bare print without parentheses
      if (trimmed === 'print' || /^print\s+[^(]/.test(trimmed)) {
        const argHint = trimmed === 'print' ? '' : trimmed.replace(/^print\s+/, '');
        diagnostics.push({
          line: lineNum,
          column: 1,
          severity: 'error',
          message: 'SyntaxError: Trong Python 3, hàm print() bắt buộc phải có dấu ngoặc tròn.',
          suggestion: `Sửa thành print(${argHint})`,
        });
      }

      // Common typo checks
      if (/\b(pritn|pirnt)\s*\(/.test(trimmed)) {
        diagnostics.push({
          line: lineNum,
          column: 1,
          severity: 'error',
          message: 'NameError: Viết sai tên hàm chuẩn "print()".',
          suggestion: 'Đổi thành print(...).',
        });
      }
      if (/\braneg\s*\(/.test(trimmed)) {
        diagnostics.push({
          line: lineNum,
          column: 1,
          severity: 'error',
          message: 'NameError: Viết sai tên hàm chuẩn "range()".',
          suggestion: 'Đổi thành range(...).',
        });
      }

      if (trimmed.endsWith(':') && indent === 0) {
        expectIndentNext = true;
      }

      // Count parens and brackets outside strings
      let inSingle = false;
      let inDouble = false;
      for (let i = 0; i < cleanLine.length; i++) {
        const ch = cleanLine[i];
        if (ch === "'" && !inDouble) inSingle = !inSingle;
        else if (ch === '"' && !inSingle) inDouble = !inDouble;
        else if (!inSingle && !inDouble) {
          if (ch === '(') openParens++;
          else if (ch === ')') openParens--;
          else if (ch === '[') openBrackets++;
          else if (ch === ']') openBrackets--;
        }
      }
      if (inSingle || inDouble) {
        diagnostics.push({
          line: lineNum,
          column: cleanLine.length,
          severity: 'error',
          message: 'SyntaxError: Chuỗi ký tự chưa được đóng dấu nháy trên dòng này.',
          suggestion: 'Thêm dấu nháy đóng chuỗi (\' hoặc ").',
        });
      }
    });

    if (openParens !== 0) {
      diagnostics.push({
        line: lines.length,
        column: 1,
        severity: 'error',
        message: 'SyntaxError: Số lượng dấu ngoặc tròn "(" và ")" không cân bằng.',
        suggestion: 'Kiểm tra lại các lời gọi hàm print(), int(), range().',
      });
    }
    if (openBrackets !== 0) {
      diagnostics.push({
        line: lines.length,
        column: 1,
        severity: 'error',
        message: 'SyntaxError: Số lượng dấu ngoặc vuông "[" và "]" không cân bằng.',
        suggestion: 'Kiểm tra lại cú pháp truy cập chỉ số danh sách (list).',
      });
    }
  } else if (language === 'html') {
    const voidTags = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'source']);
    const stack: { tag: string; line: number }[] = [];

    lines.forEach((rawLine, idx) => {
      const lineNum = idx + 1;
      const tagRegex = /<\/?([a-zA-Z0-9]+)([^>]*)>/g;
      let match: RegExpExecArray | null;
      while ((match = tagRegex.exec(rawLine)) !== null) {
        const fullMatch = match[0];
        const tagName = match[1].toLowerCase();
        const attrs = match[2] || '';
        const isClosing = fullMatch.startsWith('</');
        const isSelfClosing = fullMatch.endsWith('/>') || voidTags.has(tagName);

        if (tagName === 'img' && !/\balt\s*=/.test(attrs)) {
          diagnostics.push({
            line: lineNum,
            column: match.index + 1,
            severity: 'warning',
            message: 'Cảnh báo chuẩn HTML5: Thẻ <img> nên có thuộc tính alt="..." để mô tả ảnh.',
            suggestion: 'Thêm thuộc tính alt="Mô tả ảnh" vào thẻ <img>.',
          });
        }

        if (!isClosing && !isSelfClosing) {
          stack.push({ tag: tagName, line: lineNum });
        } else if (isClosing && !voidTags.has(tagName)) {
          if (stack.length === 0) {
            diagnostics.push({
              line: lineNum,
              column: match.index + 1,
              severity: 'error',
              message: `Lỗi cấu trúc HTML: Thẻ đóng </${tagName}> dư thừa không có thẻ mở tương ứng.`,
              suggestion: `Xóa </${tagName}> hoặc bổ sung thẻ mở <${tagName}>.`,
            });
          } else {
            const top = stack[stack.length - 1];
            if (top.tag === tagName) {
              stack.pop();
            } else {
              diagnostics.push({
                line: lineNum,
                column: match.index + 1,
                severity: 'error',
                message: `Lỗi lồng thẻ HTML: Đang mở <${top.tag}> (dòng ${top.line}) nhưng lại gặp thẻ đóng </${tagName}>.`,
                suggestion: `Đóng </${top.tag}> trước khi đóng </${tagName}>.`,
              });
              stack.pop();
            }
          }
        }
      }
    });

    stack.forEach((unclosed) => {
      diagnostics.push({
        line: unclosed.line,
        column: 1,
        severity: 'error',
        message: `Lỗi cú pháp HTML: Thẻ <${unclosed.tag}> mở tại dòng ${unclosed.line} chưa được đóng.`,
        suggestion: `Thêm thẻ đóng </${unclosed.tag}>.`,
      });
    });
  } else if (language === 'sql') {
    const cleaned = code
      .replace(/--.*$/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
    const upper = cleaned.toUpperCase();

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      if (/\b(SELCET|SLEECT)\b/i.test(line)) {
        diagnostics.push({
          line: lineNum,
          column: 1,
          severity: 'error',
          message: 'SQL Syntax Error: Viết sai từ khóa "SELECT".',
          suggestion: 'Đổi thành SELECT.',
        });
      }
      if (/\bFORM\b/i.test(line) && !/\bNORMAL\s+FORM\b/i.test(line)) {
        diagnostics.push({
          line: lineNum,
          column: 1,
          severity: 'error',
          message: 'SQL Syntax Error: Viết sai từ khóa "FROM" thành "FORM".',
          suggestion: 'Đổi FORM thành FROM.',
        });
      }
      if (/\b(WHRE|WEHRE)\b/i.test(line)) {
        diagnostics.push({
          line: lineNum,
          column: 1,
          severity: 'error',
          message: 'SQL Syntax Error: Viết sai từ khóa "WHERE".',
          suggestion: 'Đổi thành WHERE.',
        });
      }
    });

    if (upper.startsWith('SELECT') && !/\bFROM\b/.test(upper)) {
      diagnostics.push({
        line: 1,
        column: 1,
        severity: 'error',
        message: 'SQL Syntax Error: Câu lệnh SELECT thiếu mệnh đề FROM chỉ định bảng dữ liệu.',
        suggestion: 'Thêm mệnh đề FROM <tên_bảng> vào câu truy vấn.',
      });
    }

    if (/\bHAVING\b/.test(upper) && !/\bGROUP\s+BY\b/.test(upper)) {
      diagnostics.push({
        line: 1,
        column: 1,
        severity: 'warning',
        message: 'Cảnh báo SQL: Mệnh đề HAVING thường đi kèm với mệnh đề GROUP BY để lọc nhóm.',
        suggestion: 'Thêm GROUP BY trước HAVING hoặc dùng WHERE nếu lọc từng dòng.',
      });
    }

    if (/,\s*FROM\b/i.test(cleaned)) {
      diagnostics.push({
        line: 1,
        column: 1,
        severity: 'error',
        message: 'SQL Syntax Error: Dư dấu phẩy "," ngay trước từ khóa FROM.',
        suggestion: 'Xóa dấu phẩy cuối cùng trong danh sách cột SELECT.',
      });
    }
  }

  return diagnostics;
}

/**
 * Safe deterministic Python subset interpreter for high school algorithm problems.
 * Supports variables, lists, dicts, loops, conditionals, functions, recursion,
 * comprehensions, string methods, input(), and print().
 */
export function runPythonCode(code: string, rawInput: string): { stdout: string; error?: string } {
  const inputLines = rawInput.replace(/\r\n/g, '\n').split('\n');
  let inputIndex = 0;
  const outputChunks: string[] = [];

  // Transpile Python subset to safe JS function body with loop guard and strict sandbox check
  try {
    // Strip string literals & comments first to inspect code identifiers for sandbox escape attempts
    const codeWithoutStringsAndComments = code
      .replace(/#.*$/gm, '')
      .replace(/"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');

    const forbiddenSandboxPattern =
      /\b(?:window|document|localStorage|sessionStorage|indexedDB|caches|cookieStore|fetch|XMLHttpRequest|WebSocket|Worker|SharedWorker|ServiceWorker|Function|eval|globalThis|self|top|parent|frames|navigator|location|history|process|__proto__|prototype|constructor|importScripts)\b/;

    if (forbiddenSandboxPattern.test(codeWithoutStringsAndComments)) {
      return {
        stdout: '',
        error:
          'SecurityError: Mã nguồn chứa từ khóa truy cập trình duyệt/hệ thống bị chặn bởi tường lửa bảo mật Sandbox.',
      };
    }

    const rawPyLines = code.replace(/\r\n/g, '\n').split('\n');

    // Pre-process lines: strip comments, split ';' statements outside quotes, and expand single-line blocks
    const pyLines: string[] = [];
    for (const raw of rawPyLines) {
      let clean = '';
      let inS = false;
      let inD = false;
      for (let c = 0; c < raw.length; c++) {
        if (raw[c] === "'" && !inD) inS = !inS;
        else if (raw[c] === '"' && !inS) inD = !inD;
        else if (raw[c] === '#' && !inS && !inD) break;
        clean += raw[c];
      }
      if (!clean.trim()) continue;

      const baseIndent = clean.slice(0, clean.length - clean.trimStart().length);
      const trimmedLine = clean.trim();

      // Check single-line block: if/elif/else/for/while ... : stmt
      const singleLineBlock = trimmedLine.match(
        /^(if\s+.+|elif\s+.+|else|for\s+.+\s+in\s+.+|while\s+.+?):\s*(.+)$/
      );
      if (
        singleLineBlock &&
        !trimmedLine.startsWith('def ') &&
        !singleLineBlock[1].includes('[')
      ) {
        pyLines.push(`${baseIndent}${singleLineBlock[1]}:`);
        const bodyParts = singleLineBlock[2]
          .split(';')
          .map((s) => s.trim())
          .filter(Boolean);
        for (const bp of bodyParts) {
          pyLines.push(`${baseIndent}    ${bp}`);
        }
        continue;
      }

      // Split multiple statements separated by ';' outside quotes
      const semiParts: string[] = [];
      let curPart = '';
      let sQuote = false;
      let dQuote = false;
      for (let c = 0; c < trimmedLine.length; c++) {
        const ch = trimmedLine[c];
        if (ch === "'" && !dQuote) sQuote = !sQuote;
        else if (ch === '"' && !sQuote) dQuote = !dQuote;
        else if (ch === ';' && !sQuote && !dQuote) {
          if (curPart.trim()) semiParts.push(curPart.trim());
          curPart = '';
          continue;
        }
        curPart += ch;
      }
      if (curPart.trim()) semiParts.push(curPart.trim());

      for (const part of semiParts) {
        pyLines.push(`${baseIndent}${part}`);
      }
    }

    const jsLines: string[] = [
      'let __steps = 0;',
      'const __guard = () => { if (++__steps > 150000) throw new Error("TimeLimitExceeded: Vòng lặp vượt quá giới hạn thời gian (kiểm tra điều kiện dừng while/for)."); };',
    ];

    const indentStack: number[] = [0];

    const transformExpr = (expr: string): string => {
      let e = expr.trim();

      // Handle Python f-strings: f"..." or f'...'
      e = e.replace(/\bf"([^"]*)"/g, (_, inner) => {
        return '`' + inner.replace(/\{([^}]+)\}/g, '${__str($1)}') + '`';
      });
      e = e.replace(/\bf'([^']*)'/g, (_, inner) => {
        return '`' + inner.replace(/\{([^}]+)\}/g, '${__str($1)}') + '`';
      });

      // Handle list comprehension: [expr for var in iterable if cond] or [expr for var in iterable]
      const listCompIf = e.match(/^\[\s*(.+?)\s+for\s+([a-zA-Z_]\w*)\s+in\s+(.+?)\s+if\s+(.+?)\s*\]$/);
      if (listCompIf) {
        const [, itemExpr, iterVar, iterSource, condExpr] = listCompIf;
        return `Array.from(${transformExpr(iterSource)}).filter((${iterVar}) => (${transformExpr(condExpr)})).map((${iterVar}) => (${transformExpr(itemExpr)}))`;
      }
      const listComp = e.match(/^\[\s*(.+?)\s+for\s+([a-zA-Z_]\w*)\s+in\s+(.+?)\s*\]$/);
      if (listComp) {
        const [, itemExpr, iterVar, iterSource] = listComp;
        return `Array.from(${transformExpr(iterSource)}).map((${iterVar}) => (${transformExpr(itemExpr)}))`;
      }
      e = e.replace(
        /\[\s*([^\[\]]+?)\s+for\s+([a-zA-Z_]\w*)\s+in\s+([^\[\]]+?)\s+if\s+([^\[\]]+?)\s*\]/g,
        (_, itemExpr, iterVar, iterSource, condExpr) =>
          `Array.from(${transformExpr(iterSource)}).filter((${iterVar}) => (${transformExpr(condExpr)})).map((${iterVar}) => (${transformExpr(itemExpr)}))`
      );
      e = e.replace(
        /\[\s*([^\[\]]+?)\s+for\s+([a-zA-Z_]\w*)\s+in\s+([^\[\]]+?)\s*\]/g,
        (_, itemExpr, iterVar, iterSource) =>
          `Array.from(${transformExpr(iterSource)}).map((${iterVar}) => (${transformExpr(itemExpr)}))`
      );

      // Handle generator inside sum/max/min: sum(expr for var in iterable)
      const genMatch = e.match(/^(sum|max|min)\(\s*(.+?)\s+for\s+([a-zA-Z_]\w*)\s+in\s+(.+?)\s*\)$/);
      if (genMatch) {
        const [, fnName, itemExpr, iterVar, iterSource] = genMatch;
        return `__${fnName}(Array.from(${transformExpr(iterSource)}).map((${iterVar}) => (${transformExpr(itemExpr)})))`;
      }

      // Handle Python inline ternary expression: A if COND else B (when not a list comprehension)
      if (!e.startsWith('[')) {
        const ternaryMatch = e.match(/^(.+?)\s+if\s+(.+?)\s+else\s+(.+)$/);
        if (ternaryMatch) {
          const [, trueExpr, condExpr, falseExpr] = ternaryMatch;
          return `((${transformExpr(condExpr)}) ? (${transformExpr(trueExpr)}) : (${transformExpr(falseExpr)}))`;
        }
      }

      // Handle string/list reverse slice [::-1] and standard slices [:b], [a:b], [a:]
      e = e.replace(/([a-zA-Z_]\w*|\([^)]+\))\[::-1\]/g, '__reverse($1)');
      e = e.replace(/([a-zA-Z_]\w*)\[\s*:\s*([^\]:]+)\]/g, '$1.slice(0, $2)');
      e = e.replace(/([a-zA-Z_]\w*)\[\s*([^\]:]+)\s*:\s*([^\]:]+)\]/g, '$1.slice($2, $3)');
      e = e.replace(/([a-zA-Z_]\w*)\[\s*([^\]:]+)\s*:\s*\]/g, '$1.slice($2)');

      // Replace integer division // safely including function calls and parenthesized expressions
      while (e.includes('//')) {
        const nextE = e.replace(
          /([a-zA-Z0-9_.]+\([^()]*\)|\([^()]*\)|[a-zA-Z0-9_.]+(?:\[[^\]]+\])*)\s*\/\/\s*([a-zA-Z0-9_.]+\([^()]*\)|\([^()]*\)|-?[a-zA-Z0-9_.]+(?:\[[^\]]+\])*)/,
          'Math.floor(($1) / ($2))'
        );
        if (nextE === e) {
          e = e.replace(/\/\//g, '/');
          break;
        }
        e = nextE;
      }
      // Replace power **
      e = e.replace(/\*\*/g, '**');

      // Handle print keyword arguments sep= and end= and sorted reverse=
      e = e
        .replace(/\bsep\s*=\s*([^,)]+)/g, '{ __py_sep: $1 }')
        .replace(/\bend\s*=\s*([^,)]+)/g, '{ __py_end: $1 }')
        .replace(/\breverse\s*=\s*(True|False|true|false)/g, (_, v) =>
          v === 'True' || v === 'true' ? 'true' : 'false'
        );

      // Replace Python booleans and logical operators outside strings
      e = e
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null')
        .replace(/\band\b/g, '&&')
        .replace(/\bor\b/g, '||')
        .replace(/\bnot\s+/g, '!');

      // Replace common methods & built-ins (including print -> __print so window.print is never called)
      e = e
        .replace(/\bprint\s*\(/g, '__print(')
        .replace(/\binput\s*\(\s*\)/g, '__input()')
        .replace(/\binput\s*\(/g, '__input(')
        .replace(/\blen\s*\(/g, '__len(')
        .replace(/\bsum\s*\(/g, '__sum(')
        .replace(/\bmax\s*\(/g, '__max(')
        .replace(/\bmin\s*\(/g, '__min(')
        .replace(/\bsorted\s*\(/g, '__sorted(')
        .replace(/\brange\s*\(/g, '__range(')
        .replace(/\bint\s*\(/g, '__int(')
        .replace(/\bfloat\s*\(/g, '__float(')
        .replace(/\bstr\s*\(/g, '__str(')
        .replace(/\bord\s*\(/g, '__ord(')
        .replace(/\bchr\s*\(/g, '__chr(')
        .replace(/\babs\s*\(/g, 'Math.abs(')
        .replace(/\bround\s*\(/g, '__round(')
        .replace(/\blist\s*\(/g, '__list(')
        .replace(/\bset\s*\(/g, '__set(')
        .replace(/\benumerate\s*\(/g, '__enumerate(')
        .replace(/\bmap\s*\(\s*int\s*,/g, '__mapInt(')
        .replace(/\bmap\s*\(\s*float\s*,/g, '__mapFloat(')
        .replace(/\.append\s*\(/g, '.push(')
        .replace(/\.strip\s*\(\s*\)/g, '.trim()')
        .replace(/\.upper\s*\(\s*\)/g, '.toUpperCase()')
        .replace(/\.lower\s*\(\s*\)/g, '.toLowerCase()')
        .replace(/\.split\s*\(\s*\)/g, '.__pySplit()');

      return e;
    };

    const declaredVars = new Set<string>();
    const fnArgVars = new Set<string>();

    for (let i = 0; i < pyLines.length; i++) {
      const clean = pyLines[i];
      if (!clean.trim()) continue;

      const indent = clean.length - clean.trimStart().length;
      const trimmed = clean.trim();

      while (indent < indentStack[indentStack.length - 1]) {
        indentStack.pop();
        jsLines.push('}');
      }

      if (trimmed === 'pass') {
        jsLines.push('/* pass */');
        continue;
      }

      if (trimmed === 'print' || /^print\s+[^(]/.test(trimmed)) {
        throw new Error('SyntaxError: Trong Python 3, hàm print() bắt buộc phải có dấu ngoặc tròn, ví dụ: print(ket_qua).');
      }

      // elif
      if (trimmed.startsWith('elif ') && trimmed.endsWith(':')) {
        if (jsLines[jsLines.length - 1] === '}') {
          jsLines.pop();
        }
        const cond = transformExpr(trimmed.slice(5, -1));
        jsLines.push(`} else if (${cond}) {`);
        indentStack.push(indent + 4);
        continue;
      }

      // else:
      if (trimmed === 'else:') {
        if (jsLines[jsLines.length - 1] === '}') {
          jsLines.pop();
        }
        jsLines.push('} else {');
        indentStack.push(indent + 4);
        continue;
      }

      // if ...:
      if (trimmed.startsWith('if ') && trimmed.endsWith(':')) {
        const cond = transformExpr(trimmed.slice(3, -1));
        jsLines.push(`if (${cond}) {`);
        indentStack.push(indent + 4);
        continue;
      }

      // def func(args):
      const defMatch = trimmed.match(/^def\s+([a-zA-Z_]\w*)\s*\((.*)\)\s*:$/);
      if (defMatch) {
        const [, fnName, args] = defMatch;
        fnArgVars.add(fnName);
        args
          .split(',')
          .map((a) => a.trim().split('=')[0].trim())
          .filter(Boolean)
          .forEach((a) => fnArgVars.add(a));
        jsLines.push(`function ${fnName}(${args}) { __guard();`);
        indentStack.push(indent + 4);
        continue;
      }

      // for x, y in ...: or for x in ...:
      const forTupleMatch = trimmed.match(/^for\s+([a-zA-Z_]\w*)\s*,\s*([a-zA-Z_]\w*)\s+in\s+(.+)\s*:$/);
      if (forTupleMatch) {
        const [, v1, v2, iterExpr] = forTupleMatch;
        declaredVars.add(v1);
        declaredVars.add(v2);
        jsLines.push(`for ([${v1}, ${v2}] of ${transformExpr(iterExpr)}) { __guard();`);
        indentStack.push(indent + 4);
        continue;
      }

      const forMatch = trimmed.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+(.+)\s*:$/);
      if (forMatch) {
        const [, vName, iterExpr] = forMatch;
        declaredVars.add(vName);
        jsLines.push(`for (${vName} of ${transformExpr(iterExpr)}) { __guard();`);
        indentStack.push(indent + 4);
        continue;
      }

      // while ...:
      if (trimmed.startsWith('while ') && trimmed.endsWith(':')) {
        const cond = transformExpr(trimmed.slice(6, -1));
        jsLines.push(`while (${cond}) { __guard();`);
        indentStack.push(indent + 4);
        continue;
      }

      // return
      if (trimmed === 'return' || trimmed.startsWith('return ')) {
        const retExpr = trimmed === 'return' ? '' : transformExpr(trimmed.slice(7));
        jsLines.push(`return ${retExpr};`);
        continue;
      }

      // Tuple / multiple assignment: a, b = ...
      const multiAssign = trimmed.match(/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)+)\s*=\s*(.+)$/);
      if (multiAssign) {
        const [, lhs, rhs] = multiAssign;
        const vars = lhs.split(',').map((v) => v.trim());
        const rhsParts = rhs.split(',').map((p) => p.trim());
        if (vars.length === rhsParts.length && !rhs.includes('(')) {
          jsLines.push(`[${vars.join(', ')}] = [${rhsParts.map(transformExpr).join(', ')}];`);
        } else {
          jsLines.push(`[${vars.join(', ')}] = Array.from(${transformExpr(rhs)});`);
        }
        vars.forEach((v) => {
          if (!fnArgVars.has(v)) declaredVars.add(v);
        });
        continue;
      }

      // Simple variable assignment: x = ...
      const simpleAssign = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*(?!=)(.+)$/);
      if (simpleAssign) {
        const [, varName, rhs] = simpleAssign;
        if (!fnArgVars.has(varName)) {
          declaredVars.add(varName);
        }
        jsLines.push(`${varName} = ${transformExpr(rhs)};`);
        continue;
      }

      // Augmented assignment: x += ...
      const augAssign = trimmed.match(/^([a-zA-Z_]\w*(?:\[[^\]]+\])?)\s*(\+=|-=|\*=|\/\/=|\/=|%=)\s*(.+)$/);
      if (augAssign) {
        const [, lhs, op, rhs] = augAssign;
        if (op === '//=') {
          jsLines.push(`${transformExpr(lhs)} = Math.floor((${transformExpr(lhs)}) / (${transformExpr(rhs)}));`);
        } else {
          jsLines.push(`${transformExpr(lhs)} ${op} ${transformExpr(rhs)};`);
        }
        continue;
      }

      // Fallback statement/expression
      jsLines.push(`${transformExpr(trimmed)};`);
    }

    while (indentStack.length > 1) {
      indentStack.pop();
      jsLines.push('}');
    }

    if (declaredVars.size > 0) {
      jsLines.unshift(`let ${Array.from(declaredVars).join(', ')};`);
    }

    const __printFn = (...args: unknown[]) => {
      let sep = ' ';
      let end = '\n';
      const values: unknown[] = [];

      for (const arg of args) {
        if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
          const obj = arg as { __py_sep?: unknown; __py_end?: unknown };
          if ('__py_sep' in obj) {
            sep = String(obj.__py_sep ?? ' ');
            continue;
          }
          if ('__py_end' in obj) {
            end = String(obj.__py_end ?? '\n');
            continue;
          }
        }
        values.push(arg);
      }

      const formatted = values
        .map((a) => {
          if (typeof a === 'boolean') return a ? 'True' : 'False';
          if (a === null || a === undefined) return 'None';
          if (Array.isArray(a)) return `[${a.map((x) => (typeof x === 'string' ? `'${x}'` : String(x))).join(', ')}]`;
          return String(a);
        })
        .join(sep);

      outputChunks.push(formatted + end);
    };

    // Attach helper methods and explicitly shadow 'print' and browser dialog globals
    const helpers = {
      __input: () => {
        if (inputIndex < inputLines.length) {
          return inputLines[inputIndex++];
        }
        return '';
      },
      __print: __printFn,
      print: __printFn,
      window: undefined,
      document: undefined,
      localStorage: undefined,
      sessionStorage: undefined,
      indexedDB: undefined,
      fetch: undefined,
      XMLHttpRequest: undefined,
      WebSocket: undefined,
      Worker: undefined,
      globalThis: undefined,
      self: undefined,
      top: undefined,
      parent: undefined,
      frames: undefined,
      navigator: undefined,
      location: undefined,
      history: undefined,
      alert: __printFn,
      confirm: () => false,
      prompt: () => (inputIndex < inputLines.length ? inputLines[inputIndex++] : ''),
      open: () => null,
      __len: (x: unknown) => {
        if (typeof x === 'string' || Array.isArray(x)) return x.length;
        if (x && typeof x === 'object') return Object.keys(x).length;
        return 0;
      },
      __sum: (arr: number[]) => Array.from(arr).reduce((a, b) => a + Number(b), 0),
      __max: (...args: unknown[]) => {
        const list = Array.isArray(args[0]) ? (args[0] as number[]) : (args as number[]);
        return Math.max(...list);
      },
      __min: (...args: unknown[]) => {
        const list = Array.isArray(args[0]) ? (args[0] as number[]) : (args as number[]);
        return Math.min(...list);
      },
      __sorted: (arr: unknown[], reverse = false) => {
        const copy = [...(arr as (number | string)[])].sort((a, b) =>
          typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))
        );
        return reverse ? copy.reverse() : copy;
      },
      __range: (a: number, b?: number, step = 1) => {
        const start = b === undefined ? 0 : a;
        const stop = b === undefined ? a : b;
        const res: number[] = [];
        if (step > 0) {
          for (let i = start; i < stop; i += step) res.push(i);
        } else if (step < 0) {
          for (let i = start; i > stop; i += step) res.push(i);
        }
        return res;
      },
      __int: (x: unknown) => parseInt(String(x).trim(), 10),
      __float: (x: unknown) => parseFloat(String(x).trim()),
      __str: (x: unknown) => {
        if (typeof x === 'boolean') return x ? 'True' : 'False';
        return String(x);
      },
      __ord: (x: unknown) => String(x).charCodeAt(0),
      __chr: (x: unknown) => String.fromCharCode(Number(x)),
      __round: (num: number, digits = 0) => {
        const factor = Math.pow(10, digits);
        return Math.round(num * factor) / factor;
      },
      __list: (x: unknown) => (typeof x === 'string' ? x.split('') : Array.from(x as Iterable<unknown>)),
      __set: (x: unknown) => Array.from(new Set(x as Iterable<unknown>)),
      __enumerate: (arr: unknown[]) => Array.from(arr).map((v, idx) => [idx, v]),
      __mapInt: (arr: string[]) => Array.from(arr).filter((s) => String(s).trim() !== '').map((s) => parseInt(String(s).trim(), 10)),
      __mapFloat: (arr: string[]) => Array.from(arr).filter((s) => String(s).trim() !== '').map((s) => parseFloat(String(s).trim())),
      __reverse: (x: string | unknown[]) =>
        typeof x === 'string' ? x.split('').reverse().join('') : [...x].reverse(),
    };

    // Temporarily add __pySplit to String.prototype
    const strProto = String.prototype as unknown as { __pySplit?: (sep?: string) => string[] };
    strProto.__pySplit = function (this: string, sep?: string) {
      const trimmedStr = this.trim();
      if (!trimmedStr) return [];
      return sep ? this.split(sep) : trimmedStr.split(/\s+/);
    };

    const runner = new Function(
      ...Object.keys(helpers),
      jsLines.join('\n')
    );

    const originalWindowPrint = typeof window !== 'undefined' ? window.print : undefined;
    if (typeof window !== 'undefined') {
      window.print = (...args: unknown[]) => {
        __printFn(...args);
      };
    }

    try {
      runner(...Object.values(helpers));
    } finally {
      if (typeof window !== 'undefined' && originalWindowPrint) {
        window.print = originalWindowPrint;
      }
    }

    return { stdout: outputChunks.join('').trim() };
  } catch (err) {
    return {
      stdout: outputChunks.join('').trim(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * In-memory Relational SQL Query Engine for high school & university exam SQL problems.
 */
export function runSqlQuery(
  query: string,
  tables: SqlTableSchema[]
): {
  columns: string[];
  rows: Record<string, string | number>[];
  error?: string;
} {
  try {
    const cleanQuery = query
      .replace(/--.*$/gm, '')
      .replace(/;+\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanQuery) {
      return { columns: [], rows: [], error: 'Câu truy vấn SQL đang trống.' };
    }

    const selectMatch = cleanQuery.match(
      /^SELECT\s+(DISTINCT\s+)?(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(.*)$/i
    );
    if (!selectMatch) {
      return {
        columns: [],
        rows: [],
        error: 'Cú pháp SQL không hợp lệ. Câu truy vấn cần bắt đầu bằng SELECT <cột> FROM <bảng>.',
      };
    }

    const isDistinct = Boolean(selectMatch[1]);
    const selectClause = selectMatch[2].trim();
    const baseTableName = selectMatch[3].toUpperCase();
    const restClause = (selectMatch[4] || '').trim();

    const findTable = (name: string) =>
      tables.find((t) => t.tableName.toUpperCase() === name.toUpperCase());

    const baseTable = findTable(baseTableName);
    if (!baseTable) {
      return {
        columns: [],
        rows: [],
        error: `Không tìm thấy bảng '${baseTableName}'. Các bảng hiện có: ${tables.map((t) => t.tableName).join(', ')}.`,
      };
    }

    // Build working rows with both bare column names and TABLE.col keys
    let workingRows: Record<string, string | number>[] = baseTable.rows.map((r) => {
      const rowObj: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(r)) {
        rowObj[k.toLowerCase()] = v;
        rowObj[`${baseTable.tableName.toLowerCase()}.${k.toLowerCase()}`] = v;
      }
      return rowObj;
    });

    // Extract clauses in order: JOIN -> WHERE -> GROUP BY -> HAVING -> ORDER BY -> LIMIT
    let remaining = restClause;

    // 1. Parse JOINs
    const joinRegex =
      /^(?:(INNER|LEFT)\s+)?JOIN\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?\s+ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+)\s*(.*)$/i;
    while (true) {
      const jm = remaining.match(joinRegex);
      if (!jm) break;
      const joinType = (jm[1] || 'INNER').toUpperCase();
      const joinTableName = jm[2];
      const leftKey = jm[4].toLowerCase();
      const rightKey = jm[5].toLowerCase();
      remaining = jm[6].trim();

      const joinTable = findTable(joinTableName);
      if (!joinTable) {
        return {
          columns: [],
          rows: [],
          error: `Không tìm thấy bảng JOIN '${joinTableName}'.`,
        };
      }

      const nextRows: Record<string, string | number>[] = [];
      for (const leftRow of workingRows) {
        let matched = false;
        for (const rawRight of joinTable.rows) {
          const rightRow: Record<string, string | number> = {};
          for (const [k, v] of Object.entries(rawRight)) {
            rightRow[k.toLowerCase()] = v;
            rightRow[`${joinTable.tableName.toLowerCase()}.${k.toLowerCase()}`] = v;
          }
          const combined = { ...rightRow, ...leftRow };
          const lVal =
            combined[leftKey] ??
            combined[leftKey.split('.').pop() || ''];
          const rVal =
            rightRow[rightKey] ??
            rightRow[rightKey.split('.').pop() || ''] ??
            combined[rightKey];
          if (lVal !== undefined && rVal !== undefined && String(lVal) === String(rVal)) {
            matched = true;
            nextRows.push({ ...leftRow, ...rightRow });
          }
        }
        if (!matched && joinType === 'LEFT') {
          nextRows.push({ ...leftRow });
        }
      }
      workingRows = nextRows;
    }

    // Helper to resolve value from a row
    const resolveVal = (row: Record<string, string | number>, token: string): string | number => {
      const t = token.trim();
      if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
        return t.slice(1, -1);
      }
      if (!isNaN(Number(t)) && t !== '') {
        return Number(t);
      }
      const lower = t.toLowerCase();
      if (lower in row) return row[lower];
      const shortKey = lower.split('.').pop() || lower;
      if (shortKey in row) return row[shortKey];
      return '';
    };

    // Helper to evaluate condition string against a row
    const evalCondition = (row: Record<string, string | number>, condStr: string): boolean => {
      const orParts = condStr.split(/\s+OR\s+/i);
      if (orParts.length > 1) {
        return orParts.some((part) => evalCondition(row, part));
      }
      const andParts = condStr.split(/\s+AND\s+/i);
      if (andParts.length > 1) {
        return andParts.every((part) => evalCondition(row, part));
      }

      const c = condStr.trim().replace(/^\(|\)$/g, '').trim();

      // BETWEEN
      const betweenMatch = c.match(/^([a-zA-Z0-9_.()]+)\s+BETWEEN\s+(.+?)\s+AND\s+(.+)$/i);
      if (betweenMatch) {
        const val = Number(resolveVal(row, betweenMatch[1]));
        const low = Number(resolveVal(row, betweenMatch[2]));
        const high = Number(resolveVal(row, betweenMatch[3]));
        return val >= low && val <= high;
      }

      // LIKE
      const likeMatch = c.match(/^([a-zA-Z0-9_.]+)\s+LIKE\s+'([^']*)'$/i);
      if (likeMatch) {
        const val = String(resolveVal(row, likeMatch[1]));
        const pattern = '^' + likeMatch[2].replace(/%/g, '.*').replace(/_/g, '.') + '$';
        return new RegExp(pattern, 'i').test(val);
      }

      // Comparison operators
      const compMatch = c.match(/^([a-zA-Z0-9_.(*)']+)\s*(>=|<=|<>|!=|=|>|<)\s*(.+)$/);
      if (compMatch) {
        const lhs = resolveVal(row, compMatch[1]);
        const op = compMatch[2];
        const rhs = resolveVal(row, compMatch[3]);
        const numL = Number(lhs);
        const numR = Number(rhs);
        const bothNum = !isNaN(numL) && !isNaN(numR) && String(lhs) !== '' && String(rhs) !== '';

        if (op === '=') return bothNum ? numL === numR : String(lhs).toLowerCase() === String(rhs).toLowerCase();
        if (op === '!=' || op === '<>') return bothNum ? numL !== numR : String(lhs).toLowerCase() !== String(rhs).toLowerCase();
        if (op === '>') return bothNum ? numL > numR : String(lhs) > String(rhs);
        if (op === '<') return bothNum ? numL < numR : String(lhs) < String(rhs);
        if (op === '>=') return bothNum ? numL >= numR : String(lhs) >= String(rhs);
        if (op === '<=') return bothNum ? numL <= numR : String(lhs) <= String(rhs);
      }
      return true;
    };

    // Extract LIMIT, ORDER BY, HAVING, GROUP BY, WHERE from remaining
    let limitCount: number | null = null;
    let orderByClause = '';
    let havingClause = '';
    let groupByClause = '';
    let whereClause = '';

    const limitMatch = remaining.match(/^(.*?)\bLIMIT\s+(\d+)\s*$/i);
    if (limitMatch) {
      remaining = limitMatch[1].trim();
      limitCount = parseInt(limitMatch[2], 10);
    }

    const orderMatch = remaining.match(/^(.*?)\bORDER\s+BY\s+(.+)$/i);
    if (orderMatch) {
      remaining = orderMatch[1].trim();
      orderByClause = orderMatch[2].trim();
    }

    const havingMatch = remaining.match(/^(.*?)\bHAVING\s+(.+)$/i);
    if (havingMatch) {
      remaining = havingMatch[1].trim();
      havingClause = havingMatch[2].trim();
    }

    const groupMatch = remaining.match(/^(.*?)\bGROUP\s+BY\s+(.+)$/i);
    if (groupMatch) {
      remaining = groupMatch[1].trim();
      groupByClause = groupMatch[2].trim();
    }

    const whereMatch = remaining.match(/^WHERE\s+(.+)$/i);
    if (whereMatch) {
      whereClause = whereMatch[1].trim();
    }

    if (whereClause) {
      workingRows = workingRows.filter((r) => evalCondition(r, whereClause));
    }

    // Parse SELECT items
    const selectItems = selectClause.split(',').map((s) => s.trim());
    const hasAggregates = /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(selectClause);

    let resultRows: Record<string, string | number>[] = [];
    let outputColumns: string[] = [];

    const computeAggregate = (
      fnName: string,
      argCol: string,
      groupRows: Record<string, string | number>[]
    ): number => {
      const upperFn = fnName.toUpperCase();
      if (upperFn === 'COUNT') {
        if (argCol === '*') return groupRows.length;
        return groupRows.filter((r) => resolveVal(r, argCol) !== '').length;
      }
      const nums = groupRows
        .map((r) => Number(resolveVal(r, argCol)))
        .filter((n) => !isNaN(n));
      if (nums.length === 0) return 0;
      if (upperFn === 'SUM') return Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
      if (upperFn === 'AVG') return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
      if (upperFn === 'MAX') return Math.max(...nums);
      if (upperFn === 'MIN') return Math.min(...nums);
      return 0;
    };

    if (groupByClause || hasAggregates) {
      const groupCols = groupByClause
        ? groupByClause.split(',').map((c) => c.trim().toLowerCase())
        : [];
      const groups = new Map<string, Record<string, string | number>[]>();

      if (groupCols.length === 0) {
        groups.set('__all__', workingRows);
      } else {
        for (const row of workingRows) {
          const key = groupCols.map((col) => String(resolveVal(row, col))).join('||');
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(row);
        }
      }

      for (const [, grpRows] of groups.entries()) {
        const sampleRow = grpRows[0] || {};
        const outRow: Record<string, string | number> = {};

        // Compute standard aggregates for HAVING evaluation as well
        const havingEnv: Record<string, string | number> = { ...sampleRow };
        havingEnv['count(*)'] = grpRows.length;

        for (const item of selectItems) {
          const asMatch = item.match(/^(.+?)\s+AS\s+([a-zA-Z0-9_]+)$/i);
          const expr = asMatch ? asMatch[1].trim() : item;
          const alias = (asMatch ? asMatch[2].trim() : expr.split('.').pop() || expr).toLowerCase();

          if (!outputColumns.includes(alias)) outputColumns.push(alias);

          const aggMatch = expr.match(/^(COUNT|SUM|AVG|MAX|MIN)\s*\(\s*([^)]+)\s*\)$/i);
          if (aggMatch) {
            const val = computeAggregate(aggMatch[1], aggMatch[2].trim(), grpRows);
            outRow[alias] = val;
            havingEnv[expr.toLowerCase().replace(/\s+/g, '')] = val;
            havingEnv[alias] = val;
          } else {
            const val = resolveVal(sampleRow, expr);
            outRow[alias] = val;
            havingEnv[alias] = val;
          }
        }

        if (havingClause) {
          // Evaluate any aggregate inside havingClause
          const normalizedHaving = havingClause.replace(
            /(COUNT|SUM|AVG|MAX|MIN)\s*\(\s*([^)]+)\s*\)/gi,
            (_, fn, col) => String(computeAggregate(fn, col.trim(), grpRows))
          );
          if (!evalCondition(havingEnv, normalizedHaving)) {
            continue;
          }
        }

        resultRows.push(outRow);
      }
    } else {
      if (selectItems.length === 1 && selectItems[0] === '*') {
        outputColumns = baseTable.columns.map((c) => c.name.toLowerCase());
        resultRows = workingRows.map((r) => {
          const obj: Record<string, string | number> = {};
          for (const col of outputColumns) {
            obj[col] = r[col];
          }
          return obj;
        });
      } else {
        outputColumns = selectItems.map((item) => {
          const asMatch = item.match(/^(.+?)\s+AS\s+([a-zA-Z0-9_]+)$/i);
          const rawName = asMatch ? asMatch[2].trim() : item.split('.').pop() || item;
          return rawName.toLowerCase();
        });

        resultRows = workingRows.map((r) => {
          const obj: Record<string, string | number> = {};
          selectItems.forEach((item, idx) => {
            const asMatch = item.match(/^(.+?)\s+AS\s+([a-zA-Z0-9_]+)$/i);
            const expr = asMatch ? asMatch[1].trim() : item;
            const colName = outputColumns[idx];
            obj[colName] = resolveVal(r, expr);
          });
          return obj;
        });
      }
    }

    if (isDistinct) {
      const seen = new Set<string>();
      resultRows = resultRows.filter((r) => {
        const sig = outputColumns.map((c) => String(r[c])).join('||');
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
    }

    if (orderByClause) {
      const orderSpecs = orderByClause.split(',').map((s) => {
        const parts = s.trim().split(/\s+/);
        return {
          col: (parts[0].split('.').pop() || parts[0]).toLowerCase(),
          desc: parts[1]?.toUpperCase() === 'DESC',
        };
      });

      resultRows.sort((a, b) => {
        for (const spec of orderSpecs) {
          const va = a[spec.col];
          const vb = b[spec.col];
          if (va === vb) continue;
          const na = Number(va);
          const nb = Number(vb);
          const cmp =
            !isNaN(na) && !isNaN(nb)
              ? na - nb
              : String(va).localeCompare(String(vb));
          return spec.desc ? -cmp : cmp;
        }
        return 0;
      });
    }

    if (limitCount !== null) {
      resultRows = resultRows.slice(0, limitCount);
    }

    return { columns: outputColumns, rows: resultRows };
  } catch (err) {
    return {
      columns: [],
      rows: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Evaluates HTML/CSS source code against structural & styling requirements.
 */
export function evaluateHtmlRequirements(
  code: string,
  requirements: HtmlRequirement[]
): TestCaseResult[] {
  const lowerCode = code.toLowerCase();

  return requirements.map((req) => {
    const tag = req.selector.toLowerCase();
    let passed = true;
    let actualSummary = 'Đạt yêu cầu cấu trúc phần tử';

    // Count occurrences of selector tag
    const tagRegex = new RegExp(`<${tag}(\\s|>|/)`, 'gi');
    const matches = code.match(tagRegex) || [];
    const minRequired = req.minCount ?? 1;

    if (matches.length < minRequired) {
      passed = false;
      actualSummary = `Tìm thấy ${matches.length}/${minRequired} thẻ <${tag}>`;
    }

    if (passed && req.attribute) {
      const attrRegex = new RegExp(
        `<${tag}[^>]*\\b${req.attribute}\\s*=\\s*["']?([^"'>\\s]+)["']?`,
        'i'
      );
      const attrMatch = code.match(attrRegex);
      if (!attrMatch) {
        passed = false;
        actualSummary = `Thẻ <${tag}> thiếu thuộc tính ${req.attribute}`;
      } else if (
        req.expectedValue &&
        attrMatch[1].toLowerCase() !== req.expectedValue.toLowerCase()
      ) {
        passed = false;
        actualSummary = `${req.attribute}="${attrMatch[1]}" (cần "${req.expectedValue}")`;
      }
    }

    if (passed && req.textIncludes) {
      if (!lowerCode.includes(req.textIncludes.toLowerCase())) {
        passed = false;
        actualSummary = `Chưa chứa nội dung văn bản "${req.textIncludes}"`;
      }
    }

    if (passed && req.cssRuleIncludes) {
      if (!lowerCode.replace(/\s+/g, '').includes(req.cssRuleIncludes.toLowerCase().replace(/\s+/g, ''))) {
        passed = false;
        actualSummary = `Chưa có thuộc tính CSS "${req.cssRuleIncludes}"`;
      }
    }

    return {
      id: req.id,
      label: req.description,
      passed,
      inputSummary: `Kiểm tra phần tử <${req.selector}>`,
      expectedSummary: req.description,
      actualSummary,
    };
  });
}

/**
 * Master entry point: runs syntax analysis, executes code in the target language engine,
 * grades against all test cases, and returns a structured ExecutionReport.
 */
export function executeAndGrade(problem: Problem, userCode: string): ExecutionReport {
  const startTime = performance.now();
  const diagnostics = analyzeSyntax(userCode, problem.language);
  const fatalErrors = diagnostics.filter((d) => d.severity === 'error');

  if (problem.language === 'python') {
    const tests = problem.pythonTests || [];
    const testResults: TestCaseResult[] = [];
    let combinedStdout = '';

    for (let i = 0; i < tests.length; i++) {
      const tc = tests[i];
      if (fatalErrors.length > 0) {
        testResults.push({
          id: tc.id,
          label: `Test case #${i + 1}${tc.isHidden ? ' (Ẩn - Chấm tự động)' : ''}`,
          passed: false,
          inputSummary: tc.input,
          expectedSummary: tc.expectedOutput,
          actualSummary: `Dừng do lỗi cú pháp dòng ${fatalErrors[0].line}: ${fatalErrors[0].message}`,
        });
        continue;
      }

      const { stdout, error } = runPythonCode(userCode, tc.input);
      if (i === 0) {
        combinedStdout = error ? `${stdout}\n[Lỗi thực thi]: ${error}`.trim() : stdout;
      }
      const passed = !error && stdout.trim() === tc.expectedOutput.trim();
      testResults.push({
        id: tc.id,
        label: `Test case #${i + 1}${tc.isHidden ? ' (Ẩn - Chấm tự động)' : ''}`,
        passed,
        inputSummary: tc.input,
        expectedSummary: tc.expectedOutput,
        actualSummary: error ? `Lỗi: ${error}` : stdout || '(Không có dữ liệu in ra)',
      });
    }

    const passedCount = testResults.filter((r) => r.passed).length;
    const totalCount = testResults.length || 1;
    const passedAll = passedCount === totalCount && totalCount > 0;
    const score = Math.round((passedCount / totalCount) * problem.xpReward);

    return {
      passedAll,
      passedCount,
      totalCount,
      score,
      maxScore: problem.xpReward,
      executionTimeMs: Math.max(1, Math.round(performance.now() - startTime)),
      stdout: combinedStdout || (passedAll ? 'Thực thi hoàn tất chính xác.' : 'Chưa khớp đầu ra kỳ vọng.'),
      diagnostics,
      testResults,
    };
  }

  if (problem.language === 'sql') {
    const tables = problem.sqlTables || [];
    const expectedRows = problem.sqlExpectedRows || [];
    const { columns, rows, error } = runSqlQuery(userCode, tables);

    const testResults: TestCaseResult[] = [];
    if (error || fatalErrors.length > 0) {
      const errMsg = error || fatalErrors[0].message;
      testResults.push({
        id: 'sql-syntax',
        label: 'Kiểm tra thực thi truy vấn CSDL quan hệ',
        passed: false,
        inputSummary: `Bảng: ${tables.map((t) => t.tableName).join(', ')}`,
        expectedSummary: `Trả về ${expectedRows.length} bản ghi đúng chuẩn`,
        actualSummary: errMsg,
      });
    } else {
      const rowCountMatch = rows.length === expectedRows.length;
      testResults.push({
        id: 'sql-count',
        label: 'Kiểm tra số lượng bản ghi kết quả',
        passed: rowCountMatch,
        inputSummary: 'Số dòng trả về (Row count)',
        expectedSummary: `${expectedRows.length} bản ghi`,
        actualSummary: `${rows.length} bản ghi`,
      });

      // Compare values row by row (order-aware or value-set comparison)
      const serializeRow = (r: Record<string, string | number>) =>
        Object.values(r)
          .map((v) => String(v).trim().toLowerCase())
          .join(' | ');

      const actualSigs = rows.map(serializeRow);
      const expectedSigs = expectedRows.map(serializeRow);
      const valuesMatch =
        rowCountMatch &&
        expectedSigs.every((sig, idx) => actualSigs[idx] === sig);

      testResults.push({
        id: 'sql-records',
        label: 'Đối chiếu dữ liệu các trường & thứ tự bản ghi',
        passed: valuesMatch,
        inputSummary: 'Tập kết quả truy vấn',
        expectedSummary: expectedSigs.slice(0, 3).join('; ') || '(Rỗng)',
        actualSummary: actualSigs.slice(0, 3).join('; ') || '(Rỗng)',
      });
    }

    const passedCount = testResults.filter((r) => r.passed).length;
    const totalCount = testResults.length;
    const passedAll = passedCount === totalCount && totalCount > 0;

    return {
      passedAll,
      passedCount,
      totalCount,
      score: passedAll ? problem.xpReward : Math.round((passedCount / totalCount) * problem.xpReward),
      maxScore: problem.xpReward,
      executionTimeMs: Math.max(1, Math.round(performance.now() - startTime)),
      stdout: error
        ? `Lỗi SQL: ${error}`
        : `Truy vấn trả về ${rows.length} dòng (${columns.join(', ')}).`,
      diagnostics,
      testResults,
      sqlResultTable: { columns, rows },
    };
  }

  // HTML / CSS evaluation
  const reqs = problem.htmlRequirements || [];
  const testResults = evaluateHtmlRequirements(userCode, reqs);
  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length || 1;
  const passedAll = passedCount === totalCount && fatalErrors.length === 0;

  return {
    passedAll,
    passedCount,
    totalCount,
    score: passedAll ? problem.xpReward : Math.round((passedCount / totalCount) * problem.xpReward),
    maxScore: problem.xpReward,
    executionTimeMs: Math.max(1, Math.round(performance.now() - startTime)),
    stdout: `Đã kiểm tra ${passedCount}/${totalCount} tiêu chí DOM & CSS.`,
    diagnostics,
    testResults,
    htmlRenderedPreview: userCode,
  };
}

/**
 * Computes real-time output preview for the current statement / code in the editor.
 */
export function getLiveCommandOutput(
  problem: Problem,
  code: string,
  cursorOffset: number
): { currentStatement: string; liveOutput: string } {
  const lines = code.split('\n');
  const beforeCursor = code.slice(0, cursorOffset);
  const currentLineIndex = Math.max(0, beforeCursor.split('\n').length - 1);
  const rawActiveLine = (lines[currentLineIndex] || '').trim();
  const nonEmptyLines = lines.map((l) => l.trim()).filter(Boolean);
  const currentStatement =
    rawActiveLine || nonEmptyLines[nonEmptyLines.length - 1] || '(Chưa nhập câu lệnh)';

  if (!code.trim()) {
    return {
      currentStatement: '(Trống)',
      liveOutput: 'Chờ nhập câu lệnh... (Hãy gõ code để xem kết quả đầu ra trực tiếp)',
    };
  }

  const diagnostics = analyzeSyntax(code, problem.language);
  const firstError = diagnostics.find((d) => d.severity === 'error');
  if (firstError) {
    return {
      currentStatement,
      liveOutput: `[Lỗi dòng ${firstError.line}]: ${firstError.message}`,
    };
  }

  if (problem.language === 'python') {
    const sampleInput = problem.pythonTests?.[0]?.input || '';
    const { stdout, error } = runPythonCode(code, sampleInput);
    if (error) {
      return {
        currentStatement,
        liveOutput: `[Lỗi thực thi]: ${error}`,
      };
    }
    const singleLineOut = stdout ? stdout.replace(/\n/g, ' ↵ ') : '(Đã thực thi — chưa có lệnh print() xuất ra màn hình)';
    return {
      currentStatement,
      liveOutput: sampleInput
        ? `[Input mẫu: "${sampleInput.replace(/\n/g, ', ')}"] → Output: ${singleLineOut}`
        : `Output: ${singleLineOut}`,
    };
  }

  if (problem.language === 'sql') {
    const tables = problem.sqlTables || [];
    const { columns, rows, error } = runSqlQuery(code, tables);
    if (error) {
      return {
        currentStatement,
        liveOutput: `[Lỗi SQL]: ${error}`,
      };
    }
    if (rows.length === 0) {
      return {
        currentStatement,
        liveOutput: '0 bản ghi trả về.',
      };
    }
    const firstRowPreview = columns.map((c) => `${c}: ${rows[0][c]}`).join(', ');
    return {
      currentStatement,
      liveOutput: `Trả về ${rows.length} dòng · Dòng 1: { ${firstRowPreview} }`,
    };
  }

  // HTML live command output
  const textPreview = code
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    currentStatement,
    liveOutput: textPreview
      ? `Kết xuất DOM: "${textPreview.slice(0, 120)}"`
      : 'Đã nhận diện cấu trúc thẻ HTML/CSS.',
  };
}

