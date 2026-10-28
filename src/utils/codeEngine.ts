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

const PYTHON_SUGGESTIONS: AutocompleteSuggestion[] = [
  { label: 'def ten_ham(tham_so):', insertText: 'def ten_ham(n):\n    return n', kind: 'snippet', detail: 'Khai báo hàm Python (Chủ đề F Lớp 10)' },
  { label: 'for i in range(n):', insertText: 'for i in range(n):\n    ', kind: 'snippet', detail: 'Vòng lặp for với range()' },
  { label: 'while dieu_kien:', insertText: 'while n > 0:\n    ', kind: 'snippet', detail: 'Vòng lặp while có điều kiện' },
  { label: 'if ... elif ... else:', insertText: 'if dieu_kien:\n    pass\nelse:\n    pass', kind: 'snippet', detail: 'Cấu trúc rẽ nhánh' },
  { label: 'input().strip()', insertText: 'input().strip()', kind: 'function', detail: 'Đọc 1 dòng dữ liệu chuẩn từ bàn phím' },
  { label: 'map(int, input().split())', insertText: 'map(int, input().split())', kind: 'snippet', detail: 'Đọc nhiều số nguyên trên 1 dòng' },
  { label: 'list(map(int, input().split()))', insertText: 'list(map(int, input().split()))', kind: 'snippet', detail: 'Đọc danh sách số nguyên (HackerRank / Bộ GD&ĐT)' },
  { label: 'print()', insertText: 'print()', kind: 'function', detail: 'Xuất kết quả ra màn hình chuẩn' },
  { label: 'range(start, stop, step)', insertText: 'range(', kind: 'function', detail: 'Tạo dãy số nguyên lặp' },
  { label: 'len(danh_sach)', insertText: 'len(', kind: 'function', detail: 'Trả về độ dài danh sách hoặc xâu' },
  { label: 'sum(danh_sach)', insertText: 'sum(', kind: 'function', detail: 'Tính tổng các phần tử trong danh sách' },
  { label: 'max(danh_sach)', insertText: 'max(', kind: 'function', detail: 'Tìm giá trị lớn nhất' },
  { label: 'min(danh_sach)', insertText: 'min(', kind: 'function', detail: 'Tìm giá trị nhỏ nhất' },
  { label: 'sorted(danh_sach)', insertText: 'sorted(', kind: 'function', detail: 'Sắp xếp danh sách tăng dần' },
  { label: 'append(phan_tu)', insertText: 'append(', kind: 'function', detail: 'Thêm phần tử vào cuối list' },
  { label: 'return', insertText: 'return ', kind: 'keyword', detail: 'Trả về giá trị từ hàm' },
];

const HTML_SUGGESTIONS: AutocompleteSuggestion[] = [
  { label: '<table>...</table>', insertText: '<table border="1">\n  <thead>\n    <tr>\n      <th>Cột 1</th>\n      <th>Cột 2</th>\n    </tr>\n  </thead>\n  <tbody>\n    <tr>\n      <td>Dữ liệu 1</td>\n      <td>Dữ liệu 2</td>\n    </tr>\n  </tbody>\n</table>', kind: 'snippet', detail: 'Bảng biểu dữ liệu chuẩn HTML5 (Lớp 12)' },
  { label: '<form>...</form>', insertText: '<form action="#" method="post">\n  <label for="ho_ten">Họ và tên:</label>\n  <input type="text" id="ho_ten" name="ho_ten" required />\n  <button type="submit">Gửi đăng ký</button>\n</form>', kind: 'snippet', detail: 'Biểu mẫu thu thập thông tin' },
  { label: '<input type="text" />', insertText: '<input type="text" id="" name="" placeholder="" />', kind: 'tag', detail: 'Ô nhập văn bản trong biểu mẫu' },
  { label: '<label for="...">', insertText: '<label for="">Nhãn:</label>', kind: 'tag', detail: 'Nhãn gắn kết với điều khiển form' },
  { label: '<select>...</select>', insertText: '<select id="khoi_thi" name="khoi_thi">\n  <option value="CS">Khoa học máy tính</option>\n  <option value="ICT">Tin học ứng dụng</option>\n</select>', kind: 'snippet', detail: 'Danh sách thả xuống lựa chọn' },
  { label: '<ul><li>...</li></ul>', insertText: '<ul>\n  <li>Mục 1</li>\n  <li>Mục 2</li>\n</ul>', kind: 'snippet', detail: 'Danh sách không thứ tự' },
  { label: '<ol><li>...</li></ol>', insertText: '<ol>\n  <li>Bước 1</li>\n  <li>Bước 2</li>\n</ol>', kind: 'snippet', detail: 'Danh sách có thứ tự' },
  { label: '<style>...</style>', insertText: '<style>\n  table {\n    border-collapse: collapse;\n    width: 100%;\n  }\n</style>', kind: 'snippet', detail: 'Định dạng CSS nội tuyến (Lớp 12)' },
  { label: '<h1>...</h1>', insertText: '<h1>Tiêu đề chính</h1>', kind: 'tag', detail: 'Tiêu đề cấp 1 của trang web' },
  { label: '<a href="...">', insertText: '<a href="https://moet.gov.vn" target="_blank">Liên kết</a>', kind: 'tag', detail: 'Siêu liên kết văn bản' },
];

const SQL_SUGGESTIONS: AutocompleteSuggestion[] = [
  { label: 'SELECT ... FROM ... WHERE', insertText: 'SELECT *\nFROM HOC_SINH\nWHERE diem_tb >= 8.0;', kind: 'snippet', detail: 'Truy vấn trích xuất dữ liệu có điều kiện' },
  { label: 'INNER JOIN ... ON', insertText: 'INNER JOIN LOP_HOC ON HOC_SINH.ma_lop = LOP_HOC.ma_lop', kind: 'snippet', detail: 'Kết nối 2 bảng quan hệ qua khóa ngoại' },
  { label: 'LEFT JOIN ... ON', insertText: 'LEFT JOIN DIEM_THI ON HOC_SINH.ma_hs = DIEM_THI.ma_hs', kind: 'snippet', detail: 'Kết nối trái giữ toàn bộ bản ghi bảng chính' },
  { label: 'GROUP BY ... HAVING', insertText: 'GROUP BY ma_lop\nHAVING COUNT(*) >= 2', kind: 'snippet', detail: 'Gom nhóm và lọc theo hàm tổng hợp' },
  { label: 'ORDER BY ... DESC', insertText: 'ORDER BY diem_tb DESC', kind: 'snippet', detail: 'Sắp xếp kết quả giảm dần' },
  { label: 'COUNT(*)', insertText: 'COUNT(*)', kind: 'function', detail: 'Đếm số lượng bản ghi' },
  { label: 'AVG(cot)', insertText: 'AVG(', kind: 'function', detail: 'Tính giá trị trung bình' },
  { label: 'SUM(cot)', insertText: 'SUM(', kind: 'function', detail: 'Tính tổng giá trị cột số' },
  { label: 'MAX(cot)', insertText: 'MAX(', kind: 'function', detail: 'Tìm giá trị lớn nhất trong cột' },
  { label: 'MIN(cot)', insertText: 'MIN(', kind: 'function', detail: 'Tìm giá trị nhỏ nhất trong cột' },
  { label: 'DISTINCT', insertText: 'DISTINCT ', kind: 'keyword', detail: 'Loại bỏ các dòng trùng lặp' },
];

export function getAutocompleteSuggestions(
  code: string,
  cursorOffset: number,
  language: Language,
  problem?: Problem
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
    if (problem?.sqlTables) {
      for (const table of problem.sqlTables) {
        pool.push({
          label: table.tableName,
          insertText: table.tableName,
          kind: 'column',
          detail: `Bảng CSDL (${table.columns.map((c) => c.name).join(', ')})`,
        });
        for (const col of table.columns) {
          pool.push({
            label: `${table.tableName}.${col.name}`,
            insertText: col.name,
            kind: 'column',
            detail: `Cột ${col.type} — ${col.description}`,
          });
        }
      }
    }
  }

  if (!prefix) {
    return pool.slice(0, 6);
  }

  return pool
    .filter(
      (item) =>
        item.label.toLowerCase().includes(prefix) ||
        item.insertText.toLowerCase().includes(prefix)
    )
    .slice(0, 7);
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
      if (blockMatch && !trimmed.endsWith(':')) {
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
        const conditionPart = trimmed.replace(/^(if|elif|while)\s+/, '').replace(/:$/, '');
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

      // Check Python 2 print without parentheses
      if (/^print\s+[^(]/.test(trimmed)) {
        diagnostics.push({
          line: lineNum,
          column: 1,
          severity: 'error',
          message: 'SyntaxError: Trong Python 3, hàm print() bắt buộc phải có dấu ngoặc tròn.',
          suggestion: `Sửa thành print(${trimmed.replace(/^print\s+/, '')})`,
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
  const outputLines: string[] = [];

  // Transpile Python subset to safe JS function body with loop guard
  try {
    const pyLines = code.replace(/\r\n/g, '\n').split('\n');
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

      // Handle generator inside sum/max/min: sum(expr for var in iterable)
      const genMatch = e.match(/^(sum|max|min)\(\s*(.+?)\s+for\s+([a-zA-Z_]\w*)\s+in\s+(.+?)\s*\)$/);
      if (genMatch) {
        const [, fnName, itemExpr, iterVar, iterSource] = genMatch;
        return `__${fnName}(Array.from(${transformExpr(iterSource)}).map((${iterVar}) => (${transformExpr(itemExpr)})))`;
      }

      // Handle string/list reverse slice [::-1]
      e = e.replace(/([a-zA-Z_]\w*|\([^)]+\))\[::-1\]/g, '__reverse($1)');

      // Replace integer division //
      e = e.replace(/(\b[\w.)\]]+\s*)\/\/(\s*[\w.(\[]+)/g, 'Math.floor($1 / $2)');
      // Replace power **
      e = e.replace(/\*\*/g, '**');

      // Replace Python booleans and logical operators outside strings
      e = e
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\bNone\b/g, 'null')
        .replace(/\band\b/g, '&&')
        .replace(/\bor\b/g, '||')
        .replace(/\bnot\s+/g, '!');

      // Replace common methods & built-ins
      e = e
        .replace(/\binput\s*\(\s*\)/g, '__input()')
        .replace(/\blen\s*\(/g, '__len(')
        .replace(/\bsum\s*\(/g, '__sum(')
        .replace(/\bmax\s*\(/g, '__max(')
        .replace(/\bmin\s*\(/g, '__min(')
        .replace(/\bsorted\s*\(/g, '__sorted(')
        .replace(/\brange\s*\(/g, '__range(')
        .replace(/\bint\s*\(/g, '__int(')
        .replace(/\bfloat\s*\(/g, '__float(')
        .replace(/\bstr\s*\(/g, '__str(')
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
      const raw = pyLines[i];
      // Strip inline comment safely (ignoring # inside quotes)
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

      // print(...)
      if (trimmed.startsWith('print(') && trimmed.endsWith(')')) {
        const inner = trimmed.slice(6, -1);
        jsLines.push(`__print(${transformExpr(inner)});`);
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
      const augAssign = trimmed.match(/^([a-zA-Z_]\w*(?:\[[^\]]+\])?)\s*(\+=|-=|\*=|\/=|%=)\s*(.+)$/);
      if (augAssign) {
        const [, lhs, op, rhs] = augAssign;
        jsLines.push(`${transformExpr(lhs)} ${op} ${transformExpr(rhs)};`);
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

    // Attach helper methods
    const helpers = {
      __input: () => {
        if (inputIndex < inputLines.length) {
          return inputLines[inputIndex++];
        }
        return '';
      },
      __print: (...args: unknown[]) => {
        outputLines.push(
          args
            .map((a) => {
              if (typeof a === 'boolean') return a ? 'True' : 'False';
              if (a === null || a === undefined) return 'None';
              if (Array.isArray(a)) return `[${a.map((x) => (typeof x === 'string' ? `'${x}'` : String(x))).join(', ')}]`;
              return String(a);
            })
            .join(' ')
        );
      },
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

    runner(...Object.values(helpers));
    return { stdout: outputLines.join('\n').trim() };
  } catch (err) {
    return {
      stdout: outputLines.join('\n').trim(),
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

