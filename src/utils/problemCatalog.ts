import {
  Difficulty,
  Language,
  PracticeMode,
  Problem,
  ProblemSource,
  SqlTableSchema,
  StructureSection,
} from '../types/academic';

export const SHARED_SQL_SCHEMAS: Record<string, SqlTableSchema[]> = {
  QUAN_LY_HOC_SINH: [
    {
      tableName: 'LOP_HOC',
      columns: [
        { name: 'ma_lop', type: 'VARCHAR(10)', description: 'Khóa chính mã lớp' },
        { name: 'ten_lop', type: 'VARCHAR(50)', description: 'Tên lớp chuyên đề' },
        { name: 'giao_vien', type: 'VARCHAR(50)', description: 'Giáo viên chủ nhiệm' },
      ],
      rows: [
        { ma_lop: '12A1', ten_lop: '12 Toán - Tin (CS)', giao_vien: 'Nguyễn Văn An' },
        { ma_lop: '12A2', ten_lop: '12 Tin Ứng Dụng (ICT)', giao_vien: 'Trần Thị Bích' },
        { ma_lop: '12A3', ten_lop: '12 Khoa Học Tự Nhiên', giao_vien: 'Lê Hoàng Nam' },
      ],
    },
    {
      tableName: 'HOC_SINH',
      columns: [
        { name: 'ma_hs', type: 'VARCHAR(10)', description: 'Khóa chính mã học sinh' },
        { name: 'ho_ten', type: 'VARCHAR(60)', description: 'Họ và tên học sinh' },
        { name: 'ma_lop', type: 'VARCHAR(10)', description: 'Khóa ngoại tham chiếu LOP_HOC' },
        { name: 'diem_tb', type: 'DECIMAL(4,2)', description: 'Điểm trung bình môn Tin học' },
        { name: 'xep_loai', type: 'VARCHAR(20)', description: 'Xếp loại học lực' },
      ],
      rows: [
        { ma_hs: 'HS01', ho_ten: 'Phạm Minh Quân', ma_lop: '12A1', diem_tb: 9.4, xep_loai: 'Xuất sắc' },
        { ma_hs: 'HS02', ho_ten: 'Lê Thu Hà', ma_lop: '12A1', diem_tb: 8.6, xep_loai: 'Giỏi' },
        { ma_hs: 'HS03', ho_ten: 'Vũ Đức Duy', ma_lop: '12A2', diem_tb: 7.5, xep_loai: 'Khá' },
        { ma_hs: 'HS04', ho_ten: 'Hoàng Ngọc Lan', ma_lop: '12A2', diem_tb: 9.1, xep_loai: 'Xuất sắc' },
        { ma_hs: 'HS05', ho_ten: 'Đặng Quốc Bảo', ma_lop: '12A1', diem_tb: 8.2, xep_loai: 'Giỏi' },
        { ma_hs: 'HS06', ho_ten: 'Ngô Minh Châu', ma_lop: '12A3', diem_tb: 6.8, xep_loai: 'Khá' },
      ],
    },
    {
      tableName: 'DIEM_THI',
      columns: [
        { name: 'ma_dt', type: 'INT', description: 'Khóa chính lượt thi' },
        { name: 'ma_hs', type: 'VARCHAR(10)', description: 'Khóa ngoại tham chiếu HOC_SINH' },
        { name: 'chuyen_de', type: 'VARCHAR(40)', description: 'Chuyên đề (Python, SQL, HTML)' },
        { name: 'diem_so', type: 'DECIMAL(4,2)', description: 'Điểm bài thi chuẩn THPT' },
      ],
      rows: [
        { ma_dt: 1, ma_hs: 'HS01', chuyen_de: 'Python', diem_so: 9.5 },
        { ma_dt: 2, ma_hs: 'HS01', chuyen_de: 'SQL', diem_so: 9.25 },
        { ma_dt: 3, ma_hs: 'HS02', chuyen_de: 'Python', diem_so: 8.75 },
        { ma_dt: 4, ma_hs: 'HS03', chuyen_de: 'HTML', diem_so: 7.5 },
        { ma_dt: 5, ma_hs: 'HS04', chuyen_de: 'SQL', diem_so: 9.5 },
        { ma_dt: 6, ma_hs: 'HS05', chuyen_de: 'Python', diem_so: 8.0 },
      ],
    },
  ],
  THU_VIEN_TRUONG: [
    {
      tableName: 'SACH',
      columns: [
        { name: 'ma_sach', type: 'VARCHAR(10)', description: 'Mã sách' },
        { name: 'ten_sach', type: 'VARCHAR(100)', description: 'Tên giáo trình / tài liệu' },
        { name: 'linh_vuc', type: 'VARCHAR(40)', description: 'Lĩnh vực (Thuật toán, CSDL, Web)' },
        { name: 'nam_xb', type: 'INT', description: 'Năm xuất bản' },
        { name: 'so_luong', type: 'INT', description: 'Số bản lưu trữ' },
      ],
      rows: [
        { ma_sach: 'S01', ten_sach: 'Tin Học 10 - Lập Trình Python', linh_vuc: 'Thuật toán', nam_xb: 2023, so_luong: 45 },
        { ma_sach: 'S02', ten_sach: 'Tin Học 11 - Hệ CSDL Quan Hệ SQL', linh_vuc: 'CSDL', nam_xb: 2024, so_luong: 38 },
        { ma_sach: 'S03', ten_sach: 'Tin Học 12 - Thiết Kế Web HTML & CSS', linh_vuc: 'Web', nam_xb: 2025, so_luong: 50 },
        { ma_sach: 'S04', ten_sach: 'Cấu Trúc Dữ Liệu & Giải Thuật VNOI', linh_vuc: 'Thuật toán', nam_xb: 2024, so_luong: 20 },
        { ma_sach: 'S05', ten_sach: 'Tối Ưu Hóa Truy Vấn SQL Nâng Cao', linh_vuc: 'CSDL', nam_xb: 2025, so_luong: 15 },
      ],
    },
    {
      tableName: 'MUON_SACH',
      columns: [
        { name: 'ma_phieu', type: 'INT', description: 'Mã phiếu mượn' },
        { name: 'ma_sach', type: 'VARCHAR(10)', description: 'Khóa ngoại tham chiếu SACH' },
        { name: 'nguoi_muon', type: 'VARCHAR(60)', description: 'Họ tên học sinh mượn' },
        { name: 'so_ngay', type: 'INT', description: 'Số ngày mượn' },
      ],
      rows: [
        { ma_phieu: 101, ma_sach: 'S01', nguoi_muon: 'Phạm Minh Quân', so_ngay: 14 },
        { ma_phieu: 102, ma_sach: 'S02', nguoi_muon: 'Lê Thu Hà', so_ngay: 7 },
        { ma_phieu: 103, ma_sach: 'S01', nguoi_muon: 'Hoàng Ngọc Lan', so_ngay: 10 },
        { ma_phieu: 104, ma_sach: 'S03', nguoi_muon: 'Vũ Đức Duy', so_ngay: 21 },
        { ma_phieu: 105, ma_sach: 'S04', nguoi_muon: 'Phạm Minh Quân', so_ngay: 30 },
      ],
    },
  ],
};

const CORE_CURATED_PROBLEMS: Problem[] = [
  // ==================== PYTHON (4 CORE LEVELS) ====================
  {
    id: 'py-easy-01',
    codeNumber: 'PY-001',
    title: 'Tính Điện Năng Tiêu Thụ & Tiền Điện Bậc Thang Cơ Bản',
    language: 'python',
    categoryMode: 'python',
    difficulty: 'easy',
    source: 'Bộ GD&ĐT',
    gradeTag: 'Lớp 10 · Chủ đề F · Rẽ nhánh',
    topic: 'Biểu thức số học & Cấu trúc if-else',
    timeComplexity: 'O(1)',
    spaceComplexity: 'O(1)',
    structureGuide: [
      {
        stepTitle: '1. Nhập dữ liệu số nguyên',
        syntaxPattern: 'k = int(input())',
        note: 'Đọc chuỗi từ bàn phím và ép kiểu sang số nguyên int.',
      },
      {
        stepTitle: '2. Cấu trúc rẽ nhánh bậc thang',
        syntaxPattern: 'if k <= 50:\n    tong = k * 1800\nelse:\n    tong = 50 * 1800 + (k - 50) * 2200',
        note: 'Kiểm tra ngưỡng tiêu thụ 50 kWh để áp dụng đúng đơn giá từng bậc.',
      },
    ],
    xpReward: 20,
    description:
      'Theo tài liệu chuẩn SGK Tin học 10 (Bộ GD&ĐT - Chương trình GDPT 2018), hộ gia đình tiêu thụ k (kWh) điện trong tháng. Nếu k <= 50 kWh thì đơn giá là 1800 đồng/kWh; phần vượt quá 50 kWh được tính giá 2200 đồng/kWh.',
    taskSpecification:
      'Đọc từ bàn phím số nguyên dương k (số kWh điện tiêu thụ). In ra tổng số tiền điện phải trả (số nguyên).',
    constraints: ['1 <= k <= 10^5', 'Đầu vào là 1 dòng chứa số nguyên k.'],
    starterCode: '',
    solutionCode: `k = int(input())
if k <= 50:
    tong_tien = k * 1800
else:
    tong_tien = 50 * 1800 + (k - 50) * 2200
print(tong_tien)`,
    hints: [
      'Dùng int(input()) để đọc số nguyên k.',
      'Khi k > 50, 50 chữ điện đầu có giá 50 * 1800 = 90000, và phần dư là (k - 50) * 2200.',
    ],
    pythonTests: [
      { id: 't1', input: '40', expectedOutput: '72000', explanation: '40 * 1800 = 72000' },
      { id: 't2', input: '50', expectedOutput: '90000', explanation: '50 * 1800 = 90000' },
      { id: 't3', input: '70', expectedOutput: '134000', explanation: '50*1800 + 20*2200 = 134000', isHidden: true },
      { id: 't4', input: '100', expectedOutput: '200000', isHidden: true },
    ],
  },
  {
    id: 'py-medium-01',
    codeNumber: 'PY-026',
    title: 'Thống Kê Điểm Thi Đạt Chuẩn Học Bổng (Genopy / Bộ GD&ĐT)',
    language: 'python',
    categoryMode: 'python',
    difficulty: 'medium',
    source: 'Genopy',
    gradeTag: 'Lớp 10 · Kiểu danh sách (List)',
    topic: 'Duyệt danh sách & Vòng lặp for',
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    structureGuide: [
      {
        stepTitle: '1. Đọc danh sách số nguyên trên 1 dòng',
        syntaxPattern: 'ds_diem = list(map(int, input().split()))',
        note: 'Tách chuỗi theo khoảng trắng và ánh xạ từng phần tử sang kiểu int.',
      },
      {
        stepTitle: '2. Duyệt tuần tự & Tích lũy có điều kiện',
        syntaxPattern: 'for d in ds_diem:\n    if d >= 80:\n        dem += 1\n        tong += d',
        note: 'Kết hợp biến đếm và biến tổng trong một lần duyệt O(N).',
      },
    ],
    xpReward: 35,
    description:
      'Một trường THPT xét khen thưởng học sinh có điểm thi môn Tin học từ 8.0 trở lên (quy đổi hệ số 10 thành thang điểm 100, tức là >= 80 điểm).',
    taskSpecification:
      'Dòng 1 chứa danh sách các điểm nguyên cách nhau bởi dấu cách. Hãy in ra trên một dòng gồm 2 số nguyên cách nhau bởi dấu cách: Số lượng học sinh đạt >= 80 điểm, và tổng điểm của các học sinh đạt chuẩn đó.',
    constraints: ['Mỗi điểm là số nguyên từ 0 đến 100', 'Danh sách có từ 1 đến 200 phần tử'],
    starterCode: '',
    solutionCode: `ds_diem = list(map(int, input().split()))
dem = 0
tong = 0
for d in ds_diem:
    if d >= 80:
        dem += 1
        tong += d
print(dem, tong)`,
    hints: [
      'Sử dụng list(map(int, input().split())) để chuyển dòng văn bản thành list số nguyên.',
      'Duyệt qua từng phần tử d trong ds_diem và kiểm tra điều kiện d >= 80.',
    ],
    pythonTests: [
      { id: 't1', input: '75 82 90 68 85', expectedOutput: '3 257' },
      { id: 't2', input: '50 60 79', expectedOutput: '0 0' },
      { id: 't3', input: '80 100 95 80', expectedOutput: '4 355', isHidden: true },
    ],
  },
  {
    id: 'py-hard-01',
    codeNumber: 'PY-051',
    title: 'Ước Chung Lớn Nhất & Tối Giản Phân Số Thuật Toán Euclid',
    language: 'python',
    categoryMode: 'python',
    difficulty: 'hard',
    source: 'HackerRank',
    gradeTag: 'Lớp 11 · Thiết kế hàm & Chương trình con',
    topic: 'Hàm tự định nghĩa (def) & Chia lấy nguyên //',
    timeComplexity: 'O(log(min(a, b)))',
    spaceComplexity: 'O(1)',
    structureGuide: [
      {
        stepTitle: '1. Định nghĩa hàm tính ƯCLN Euclid',
        syntaxPattern: 'def ucln(a, b):\n    while b != 0:\n        a, b = b, a % b\n    return a',
        note: 'Phép gán đồng thời giúp cập nhật (a, b) sang (b, a % b) ngắn gọn.',
      },
      {
        stepTitle: '2. Rút gọn tử số và mẫu số',
        syntaxPattern: 'g = ucln(a, b)\nprint(g, a // g, b // g)',
        note: 'Toán tử // đảm bảo kết quả sau khi rút gọn là số nguyên.',
      },
    ],
    xpReward: 50,
    description:
      'Trong đề thi Tốt nghiệp THPT định hướng Khoa học máy tính (CS) và chuẩn kỹ năng HackerRank Python, thuật toán Euclid tìm Ước chung lớn nhất (ƯCLN) là nền tảng để rút gọn phân số tối giản.',
    taskSpecification:
      'Viết hàm ucln(a, b) nhận hai số nguyên dương a, b (nhập trên 1 dòng cách nhau bởi dấu cách). In ra 3 số nguyên cách nhau bởi dấu cách: ƯCLN(a, b), tử số tối giản, và mẫu số tối giản.',
    constraints: ['1 <= a, b <= 10^9'],
    starterCode: '',
    solutionCode: `def ucln(a, b):
    while b != 0:
        a, b = b, a % b
    return a

a, b = map(int, input().split())
g = ucln(a, b)
print(g, a // g, b // g)`,
    hints: [
      'Thuật toán Euclid lặp: trong khi b != 0 thì gán đồng thời a, b = b, a % b.',
      'Sử dụng toán tử chia lấy nguyên // để tính a // g và b // g.',
    ],
    pythonTests: [
      { id: 't1', input: '18 24', expectedOutput: '6 3 4' },
      { id: 't2', input: '45 15', expectedOutput: '15 3 1' },
      { id: 't3', input: '17 31', expectedOutput: '1 17 31', isHidden: true },
    ],
  },
  {
    id: 'py-adv-01',
    codeNumber: 'PY-076',
    title: 'Đếm Số Lượng Số Nguyên Tố Đối Xứng Trong Đoạn [L, R]',
    language: 'python',
    categoryMode: 'python',
    difficulty: 'advanced',
    source: 'VNOI',
    gradeTag: 'Lớp 12 · Vận dụng cao · Độ phức tạp O(N√N)',
    topic: 'Hàm kiểm tra nguyên tố & Xử lý xâu đối xứng',
    timeComplexity: 'O((R - L) * √R)',
    spaceComplexity: 'O(1)',
    structureGuide: [
      {
        stepTitle: '1. Kiểm tra xâu đối xứng nhanh',
        syntaxPattern: 'def la_doi_xung(n):\n    s = str(n)\n    return s == s[::-1]',
        note: 'Kỹ thuật slicing s[::-1] đảo ngược xâu trong Python.',
      },
      {
        stepTitle: '2. Kiểm tra số nguyên tố trong O(√N)',
        syntaxPattern: 'i = 2\nwhile i * i <= n:\n    if n % i == 0: return False\n    i += 1',
        note: 'Chỉ duyệt ước số đến căn bậc hai của n.',
      },
    ],
    xpReward: 75,
    description:
      'Một số nguyên dương x được gọi là "Số nguyên tố đối xứng" (Palindromic Prime) nếu x vừa là số nguyên tố, vừa đọc xuôi hay đọc ngược đều giống nhau (ví dụ: 2, 3, 5, 7, 11, 101, 131).',
    taskSpecification:
      'Nhập hai số nguyên L và R trên một dòng (2 <= L <= R <= 2000). Hãy đếm và in ra số lượng số nguyên tố đối xứng nằm trong đoạn [L, R].',
    constraints: ['2 <= L <= R <= 2000', 'Thời gian chạy <= 1.0 giây'],
    starterCode: '',
    solutionCode: `def la_nguyen_to(n):
    if n < 2:
        return False
    i = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += 1
    return True

def la_doi_xung(n):
    s = str(n)
    return s == s[::-1]

L, R = map(int, input().split())
dem = 0
for x in range(L, R + 1):
    if la_doi_xung(x) and la_nguyen_to(x):
        dem += 1
print(dem)`,
    hints: [
      'Kiểm tra đối xứng trước bằng str(x) == str(x)[::-1] sẽ giúp tiết kiệm phép chia kiểm tra nguyên tố.',
      'Hàm kiểm tra nguyên tố chỉ cần lặp i từ 2 đến khi i * i <= n.',
    ],
    pythonTests: [
      { id: 't1', input: '2 20', expectedOutput: '5', explanation: 'Các số là 2, 3, 5, 7, 11' },
      { id: 't2', input: '100 200', expectedOutput: '5', explanation: '101, 131, 151, 181, 191' },
      { id: 't3', input: '10 100', expectedOutput: '1', isHidden: true },
    ],
  },

  // ==================== HTML & CSS (4 CORE LEVELS) ====================
  {
    id: 'html-easy-01',
    codeNumber: 'WEB-001',
    title: 'Cấu Trúc Văn Bản & Danh Sách Môn Thi Tốt Nghiệp THPT',
    language: 'html',
    categoryMode: 'html',
    difficulty: 'easy',
    source: 'Bộ GD&ĐT',
    gradeTag: 'Lớp 12 · Chủ đề F · HTML Cơ bản',
    topic: 'Thẻ tiêu đề h1, đoạn văn p, nhấn mạnh strong và danh sách ul/li',
    timeComplexity: 'DOM O(1)',
    spaceComplexity: 'DOM Tree',
    structureGuide: [
      {
        stepTitle: '1. Phân cấp tiêu đề & đoạn văn',
        syntaxPattern: '<h1>Kỳ Thi Tốt Nghiệp THPT 2025</h1>\n<p>... <strong>Môn Tin Học</strong> ...</p>',
        note: 'Thẻ <h1> tạo tiêu đề cấp 1, thẻ <strong> nhấn mạnh ngữ nghĩa quan trọng.',
      },
      {
        stepTitle: '2. Danh sách không thứ tự (Unordered List)',
        syntaxPattern: '<ul>\n  <li>Mục 1</li>\n  <li>Mục 2</li>\n  <li>Mục 3</li>\n</ul>',
        note: 'Mỗi mục con bên trong <ul> phải được đặt trong cặp thẻ <li>...</li>.',
      },
    ],
    xpReward: 20,
    description:
      'Trong đề thi Tốt nghiệp THPT môn Tin học (Chương trình GDPT 2018), học sinh cần nắm vững cách tổ chức nội dung trang web bằng các thẻ ngữ nghĩa văn bản và danh sách.',
    taskSpecification:
      'Hoàn thiện đoạn mã HTML tạo thông báo "Kỳ Thi Tốt Nghiệp THPT 2025" gồm: 1 thẻ <h1> chứa tiêu đề, 1 đoạn văn <p> có sử dụng thẻ <strong> để in đậm cụm từ "Môn Tin Học", và 1 danh sách không thứ tự <ul> chứa ít nhất 3 mục <li> (Python, SQL, HTML).',
    constraints: [
      'Phải có thẻ <h1>, <p>, <strong>.',
      'Danh sách <ul> phải chứa tối thiểu 3 thẻ <li>.',
    ],
    starterCode: '',
    solutionCode: `<article>
  <h1>Kỳ Thi Tốt Nghiệp THPT 2025</h1>
  <p>Chào mừng thí sinh tham gia ôn luyện <strong>Môn Tin Học</strong> theo chương trình GDPT 2018.</p>
  <ul>
    <li>Lập trình thuật toán Python</li>
    <li>Truy vấn cơ sở dữ liệu quan hệ SQL</li>
    <li>Thiết kế trang web chuẩn HTML5 và CSS3</li>
  </ul>
</article>`,
    hints: [
      'Đảm bảo mọi thẻ mở <h1>, <p>, <strong>, <ul>, <li> đều có thẻ đóng tương ứng.',
      'Giữ nguyên cụm từ "Môn Tin Học" bên trong cặp thẻ <strong>...</strong>.',
    ],
    htmlRequirements: [
      { id: 'h1-check', description: 'Có thẻ tiêu đề chính <h1> chứa "Kỳ Thi Tốt Nghiệp THPT 2025"', selector: 'h1', textIncludes: 'Kỳ Thi Tốt Nghiệp THPT 2025' },
      { id: 'strong-check', description: 'Sử dụng thẻ <strong> nhấn mạnh "Môn Tin Học"', selector: 'strong', textIncludes: 'Môn Tin Học' },
      { id: 'ul-check', description: 'Có danh sách không thứ tự <ul>', selector: 'ul', minCount: 1 },
      { id: 'li-check', description: 'Có ít nhất 3 mục danh sách <li> cho Python, SQL, HTML', selector: 'li', minCount: 3 },
    ],
  },
  {
    id: 'html-medium-01',
    codeNumber: 'WEB-026',
    title: 'Thiết Kế Bảng Kết Quả Điểm Thi Chuẩn Bộ GD&ĐT (Table)',
    language: 'html',
    categoryMode: 'html',
    difficulty: 'medium',
    source: 'Bộ GD&ĐT',
    gradeTag: 'Lớp 12 · Bảng biểu trên trang Web',
    topic: 'Cấu trúc table, thead, tbody, tr, th, td',
    timeComplexity: 'DOM O(R*C)',
    spaceComplexity: 'Table Grid',
    structureGuide: [
      {
        stepTitle: '1. Khai báo bảng & hàng tiêu đề',
        syntaxPattern: '<table border="1">\n  <tr><th>Cột 1</th><th>Cột 2</th><th>Cột 3</th></tr>',
        note: 'Thuộc tính border="1" hiển thị đường viền bảng; <th> căn giữa và in đậm tiêu đề cột.',
      },
      {
        stepTitle: '2. Khai báo các hàng dữ liệu chi tiết',
        syntaxPattern: '  <tr><td>Dữ liệu 1</td><td>Dữ liệu 2</td><td>Dữ liệu 3</td></tr>\n</table>',
        note: 'Số lượng thẻ <td> trên mỗi hàng phải khớp với số cột <th>.',
      },
    ],
    xpReward: 35,
    description:
      'Câu hỏi thực hành về tạo bảng (<table>) luôn xuất hiện trong phần Đúng/Sai của Đề thi THPT theo chương trình GDPT 2018. Bảng cần phân tách rõ hàng tiêu đề (<th>) và các hàng dữ liệu (<td>).',
    taskSpecification:
      'Tạo bảng <table> có thuộc tính border="1", chứa ít nhất 3 cột tiêu đề <th> (Số báo danh, Họ và tên, Điểm Tin học) và ít nhất 2 dòng dữ liệu học sinh (tối thiểu 6 ô <td>).',
    constraints: [
      'Thẻ <table> phải có thuộc tính border="1".',
      'Ít nhất 3 thẻ <th> và 6 thẻ <td>.',
    ],
    starterCode: '',
    solutionCode: `<table border="1">
  <thead>
    <tr>
      <th>Số báo danh</th>
      <th>Họ và tên</th>
      <th>Điểm Tin học</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>010245</td>
      <td>Phạm Minh Quân</td>
      <td>9.50</td>
    </tr>
    <tr>
      <td>010246</td>
      <td>Lê Thu Hà</td>
      <td>9.25</td>
    </tr>
  </tbody>
</table>`,
    hints: [
      'Dùng <th> cho các ô tiêu đề cột và <td> cho các ô dữ liệu chi tiết.',
      'Kiểm tra thuộc tính border="1" ngay trên thẻ mở <table>.',
    ],
    htmlRequirements: [
      { id: 'tbl-border', description: 'Thẻ <table> có thuộc tính border="1"', selector: 'table', attribute: 'border', expectedValue: '1' },
      { id: 'th-count', description: 'Có tối thiểu 3 ô tiêu đề cột <th>', selector: 'th', minCount: 3 },
      { id: 'tr-count', description: 'Có tối thiểu 3 hàng <tr> (1 hàng tiêu đề + 2 hàng dữ liệu)', selector: 'tr', minCount: 3 },
      { id: 'td-count', description: 'Có tối thiểu 6 ô dữ liệu <td>', selector: 'td', minCount: 6 },
    ],
  },
  {
    id: 'html-hard-01',
    codeNumber: 'WEB-051',
    title: 'Biểu Mẫu Đăng Ký Dự Thi Tốt Nghiệp THPT (Form & Input)',
    language: 'html',
    categoryMode: 'html',
    difficulty: 'hard',
    source: 'W3Schools',
    gradeTag: 'Lớp 12 · Biểu mẫu tương tác Web',
    topic: 'Thẻ form, label, input, select, button',
    timeComplexity: 'DOM Form',
    spaceComplexity: 'Form Controls',
    structureGuide: [
      {
        stepTitle: '1. Liên kết nhãn <label> với <input>',
        syntaxPattern: '<label for="cccd">Số CCCD:</label>\n<input type="text" id="cccd" name="cccd" />',
        note: 'Thuộc tính for của <label> phải trùng khớp với id của <input>.',
      },
      {
        stepTitle: '2. Danh sách thả xuống <select> & nút Submit',
        syntaxPattern: '<select id="dh"><option value="CS">CS</option><option value="ICT">ICT</option></select>\n<button type="submit">Gửi</button>',
        note: 'Sử dụng <option> bên trong <select> và type="submit" cho nút gửi.',
      },
    ],
    xpReward: 50,
    description:
      'Thiết kế biểu mẫu trực tuyến thu thập thông tin đăng ký dự thi của thí sinh theo đúng chuẩn khả năng tiếp cận (Accessibility) và ngữ nghĩa HTML5 trong SGK Tin học 12.',
    taskSpecification:
      'Tạo một biểu mẫu <form> bao gồm: ít nhất 2 thẻ <label>, ô nhập <input> cho họ tên/CCCD, 1 danh sách chọn <select> gồm ít nhất 2 thẻ <option> (Định hướng CS và Định hướng ICT), và 1 nút gửi <button type="submit">.',
    constraints: [
      'Cần có <form>, ít nhất 2 <label>, <input>, <select> với >= 2 <option>, và <button type="submit">.',
    ],
    starterCode: '',
    solutionCode: `<form action="#" method="post">
  <div>
    <label for="cccd">Số Căn cước công dân:</label>
    <input type="text" id="cccd" name="cccd" placeholder="001207xxxxxx" required />
  </div>
  <div>
    <label for="dinh_huong">Chọn định hướng bài thi Tin học:</label>
    <select id="dinh_huong" name="dinh_huong">
      <option value="CS">Khoa học máy tính (CS)</option>
      <option value="ICT">Tin học ứng dụng (ICT)</option>
    </select>
  </div>
  <button type="submit">Xác nhận đăng ký dự thi</button>
</form>`,
    hints: [
      'Liên kết <label for="..."> với thuộc tính id của <input> và <select>.',
      'Nút bấm gửi biểu mẫu cần có type="submit".',
    ],
    htmlRequirements: [
      { id: 'form-tag', description: 'Có phần tử gốc <form>', selector: 'form', minCount: 1 },
      { id: 'label-tag', description: 'Có tối thiểu 2 nhãn <label>', selector: 'label', minCount: 2 },
      { id: 'input-tag', description: 'Có ô nhập liệu <input>', selector: 'input', minCount: 1 },
      { id: 'select-tag', description: 'Có danh sách thả xuống <select> và >= 2 <option>', selector: 'option', minCount: 2 },
      { id: 'btn-submit', description: 'Có nút <button type="submit">', selector: 'button', attribute: 'type', expectedValue: 'submit' },
    ],
  },
  {
    id: 'html-adv-01',
    codeNumber: 'WEB-076',
    title: 'Định Dạng CSS Box Model, Bộ Chọn Lớp & Bảng Chuẩn Ấn Phẩm',
    language: 'html',
    categoryMode: 'html',
    difficulty: 'advanced',
    source: 'Đề Sở GD&ĐT',
    gradeTag: 'Lớp 12 · Vận dụng cao · CSS & Box Model',
    topic: 'Thẻ style, CSS Selector, border-collapse, padding',
    timeComplexity: 'CSSOM O(1)',
    spaceComplexity: 'Box Model',
    structureGuide: [
      {
        stepTitle: '1. Bộ chọn lớp (Class Selector) & Box Model',
        syntaxPattern: '<style>\n  .phieu-diem { padding: 16px; border: 1px solid #000; }\n  table { border-collapse: collapse; }\n</style>',
        note: 'Dấu chấm (.) chọn theo class; border-collapse: collapse gộp viền bảng.',
      },
      {
        stepTitle: '2. Áp dụng class vào phần tử HTML',
        syntaxPattern: '<section class="phieu-diem">\n  <h2>Tiêu đề</h2>\n  <table>...</table>\n</section>',
        note: 'Gắn thuộc tính class="phieu-diem" để nhận định dạng từ CSS.',
      },
    ],
    xpReward: 70,
    description:
      'Kết hợp HTML5 và bảng định dạng CSS nội tuyến (<style>) để trình bày phiếu báo điểm có đường viền gộp đơn (border-collapse: collapse) và khoảng đệm (padding) chuẩn Box Model.',
    taskSpecification:
      'Viết mã gồm thẻ <style> định nghĩa quy tắc CSS có thuộc tính "border-collapse: collapse" và "padding", đồng thời hiển thị khối <section class="phieu-diem"> chứa tiêu đề <h2> và bảng <table>.',
    constraints: [
      'Phải có thẻ <style> chứa border-collapse: collapse và padding.',
      'Phải có <section class="phieu-diem">, <h2> và <table>.',
    ],
    starterCode: '',
    solutionCode: `<style>
  .phieu-diem {
    padding: 16px;
    border: 1px solid #000000;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th, td {
    border: 1px solid #000000;
    padding: 8px;
  }
</style>
<section class="phieu-diem">
  <h2>Phiếu Báo Điểm Thi Thử THPT Quốc Gia</h2>
  <table>
    <tr>
      <th>Môn thi</th>
      <th>Điểm số</th>
    </tr>
    <tr>
      <td>Tin học (Python, SQL, HTML)</td>
      <td>9.75</td>
    </tr>
  </table>
</section>`,
    hints: [
      'Đặt quy tắc border-collapse: collapse; bên trong thẻ <style>.',
      'Sử dụng thuộc tính class="phieu-diem" cho thẻ <section>.',
    ],
    htmlRequirements: [
      { id: 'style-collapse', description: 'CSS trong <style> khai báo border-collapse: collapse', selector: 'style', cssRuleIncludes: 'border-collapse:collapse' },
      { id: 'style-padding', description: 'CSS trong <style> khai báo thuộc tính Box Model padding', selector: 'style', cssRuleIncludes: 'padding:' },
      { id: 'sec-class', description: 'Thẻ <section> gắn class="phieu-diem"', selector: 'section', attribute: 'class', expectedValue: 'phieu-diem' },
      { id: 'tbl-present', description: 'Hiển thị bảng <table> và tiêu đề <h2>', selector: 'table', minCount: 1 },
    ],
  },

  // ==================== SQL (4 CORE LEVELS) ====================
  {
    id: 'sql-easy-01',
    codeNumber: 'SQL-001',
    title: 'Truy Vấn Danh Sách Học Sinh Đạt Điểm Giỏi & Xuất Sắc',
    language: 'sql',
    categoryMode: 'sql',
    difficulty: 'easy',
    source: 'Bộ GD&ĐT',
    gradeTag: 'Lớp 11 · Chủ đề F · Truy vấn cơ bản',
    topic: 'SELECT, FROM, WHERE, ORDER BY',
    timeComplexity: 'O(N log N)',
    spaceComplexity: 'O(N)',
    structureGuide: [
      {
        stepTitle: '1. Chọn cột và bảng dữ liệu nguồn',
        syntaxPattern: 'SELECT ma_hs, ho_ten, diem_tb\nFROM HOC_SINH',
        note: 'Liệt kê chính xác tên các trường cần trích xuất.',
      },
      {
        stepTitle: '2. Lọc điều kiện & Sắp xếp thứ tự',
        syntaxPattern: 'WHERE diem_tb >= 8.5\nORDER BY diem_tb DESC;',
        note: 'DESC sắp xếp giảm dần; ASC sắp xếp tăng dần.',
      },
    ],
    xpReward: 25,
    description:
      'Trong CSDL quản lý học sinh trường THPT (bảng HOC_SINH), nhà trường cần trích xuất danh sách các học sinh có điểm trung bình môn Tin học (diem_tb) từ 8.5 trở lên để trao giấy khen.',
    taskSpecification:
      'Viết câu lệnh SQL lấy ra 3 cột: ma_hs, ho_ten, diem_tb từ bảng HOC_SINH đối với các học sinh có diem_tb >= 8.5, sắp xếp theo diem_tb giảm dần (DESC).',
    constraints: [
      'Chỉ chọn 3 cột ma_hs, ho_ten, diem_tb.',
      'Điều kiện lọc: diem_tb >= 8.5.',
      'Sắp xếp: ORDER BY diem_tb DESC.',
    ],
    starterCode: '',
    solutionCode: `SELECT ma_hs, ho_ten, diem_tb
FROM HOC_SINH
WHERE diem_tb >= 8.5
ORDER BY diem_tb DESC;`,
    hints: [
      'Sử dụng mệnh đề WHERE diem_tb >= 8.5 để lọc các dòng thỏa mãn.',
      'Dùng ORDER BY diem_tb DESC để học sinh điểm cao nhất xếp đầu tiên.',
    ],
    sqlTables: SHARED_SQL_SCHEMAS.QUAN_LY_HOC_SINH,
    sqlExpectedColumns: ['ma_hs', 'ho_ten', 'diem_tb'],
    sqlExpectedRows: [
      { ma_hs: 'HS01', ho_ten: 'Phạm Minh Quân', diem_tb: 9.4 },
      { ma_hs: 'HS04', ho_ten: 'Hoàng Ngọc Lan', diem_tb: 9.1 },
      { ma_hs: 'HS02', ho_ten: 'Lê Thu Hà', diem_tb: 8.6 },
    ],
  },
  {
    id: 'sql-medium-01',
    codeNumber: 'SQL-026',
    title: 'Liên Kết Bảng (INNER JOIN) Tra Cứu Lớp Học & Giáo Viên Chủ Nhiệm',
    language: 'sql',
    categoryMode: 'sql',
    difficulty: 'medium',
    source: 'Bộ GD&ĐT',
    gradeTag: 'Lớp 11 · Truy vấn nhiều bảng quan hệ',
    topic: 'INNER JOIN ... ON, WHERE',
    timeComplexity: 'O(N * M)',
    spaceComplexity: 'O(N)',
    structureGuide: [
      {
        stepTitle: '1. Kết nối hai bảng qua khóa ngoại',
        syntaxPattern: 'FROM HOC_SINH\nINNER JOIN LOP_HOC ON HOC_SINH.ma_lop = LOP_HOC.ma_lop',
        note: 'Mệnh đề ON xác định điều kiện bằng nhau giữa khóa ngoại và khóa chính.',
      },
      {
        stepTitle: '2. Lọc theo mã lớp cụ thể',
        syntaxPattern: "WHERE HOC_SINH.ma_lop = '12A1';",
        note: 'Chuỗi ký tự trong SQL phải đặt trong cặp dấu nháy đơn.',
      },
    ],
    xpReward: 40,
    description:
      'Câu hỏi chuẩn cấu trúc Đề thi Tốt nghiệp THPT (Chương trình 2018): kết nối hai bảng HOC_SINH và LOP_HOC thông qua khóa ngoại ma_lop để hiển thị tên lớp và giáo viên chủ nhiệm của học sinh.',
    taskSpecification:
      "Viết câu truy vấn SQL lấy ra ho_ten, ten_lop, giao_vien bằng cách kết nối bảng HOC_SINH và LOP_HOC qua trường ma_lop, chỉ lấy các học sinh thuộc lớp có ma_lop = '12A1'.",
    constraints: [
      'Sử dụng INNER JOIN LOP_HOC ON HOC_SINH.ma_lop = LOP_HOC.ma_lop.',
      "Điều kiện lọc ma_lop = '12A1'.",
    ],
    starterCode: '',
    solutionCode: `SELECT ho_ten, ten_lop, giao_vien
FROM HOC_SINH
INNER JOIN LOP_HOC ON HOC_SINH.ma_lop = LOP_HOC.ma_lop
WHERE HOC_SINH.ma_lop = '12A1';`,
    hints: [
      'Liên kết hai bảng bằng mệnh đề INNER JOIN LOP_HOC ON HOC_SINH.ma_lop = LOP_HOC.ma_lop.',
      "Lọc theo lớp bằng WHERE HOC_SINH.ma_lop = '12A1'.",
    ],
    sqlTables: SHARED_SQL_SCHEMAS.QUAN_LY_HOC_SINH,
    sqlExpectedColumns: ['ho_ten', 'ten_lop', 'giao_vien'],
    sqlExpectedRows: [
      { ho_ten: 'Phạm Minh Quân', ten_lop: '12 Toán - Tin (CS)', giao_vien: 'Nguyễn Văn An' },
      { ho_ten: 'Lê Thu Hà', ten_lop: '12 Toán - Tin (CS)', giao_vien: 'Nguyễn Văn An' },
      { ho_ten: 'Đặng Quốc Bảo', ten_lop: '12 Toán - Tin (CS)', giao_vien: 'Nguyễn Văn An' },
    ],
  },
  {
    id: 'sql-hard-01',
    codeNumber: 'SQL-051',
    title: 'Thống Kê Sĩ Số & Điểm Trung Bình Theo Từng Lớp (GROUP BY)',
    language: 'sql',
    categoryMode: 'sql',
    difficulty: 'hard',
    source: 'HackerRank',
    gradeTag: 'Lớp 11 · Hàm tổng hợp & Gom nhóm',
    topic: 'GROUP BY, COUNT(*), AVG(), ORDER BY',
    timeComplexity: 'O(N log N)',
    spaceComplexity: 'O(G)',
    structureGuide: [
      {
        stepTitle: '1. Sử dụng hàm tổng hợp COUNT và AVG',
        syntaxPattern: 'SELECT ma_lop, COUNT(*) AS si_so, AVG(diem_tb) AS diem_chung',
        note: 'Từ khóa AS dùng để đặt tên bí danh (alias) cho cột kết quả.',
      },
      {
        stepTitle: '2. Gom nhóm theo cột phân loại',
        syntaxPattern: 'FROM HOC_SINH\nGROUP BY ma_lop\nORDER BY ma_lop ASC;',
        note: 'Cột ma_lop xuất hiện trên SELECT phải được khai báo trong GROUP BY.',
      },
    ],
    xpReward: 55,
    description:
      'Theo chuẩn đánh giá kỹ năng SQL trên HackerRank và chương trình CSDL THPT 2018, hãy tổng hợp số lượng học sinh và điểm trung bình của từng mã lớp.',
    taskSpecification:
      'Viết câu lệnh SQL chọn ma_lop, COUNT(*) AS si_so, AVG(diem_tb) AS diem_chung từ bảng HOC_SINH, gom nhóm theo ma_lop và sắp xếp theo ma_lop tăng dần.',
    constraints: [
      'Sử dụng GROUP BY ma_lop.',
      'Đặt bí danh cột COUNT(*) AS si_so và AVG(diem_tb) AS diem_chung.',
    ],
    starterCode: '',
    solutionCode: `SELECT ma_lop, COUNT(*) AS si_so, AVG(diem_tb) AS diem_chung
FROM HOC_SINH
GROUP BY ma_lop
ORDER BY ma_lop ASC;`,
    hints: [
      'Mọi cột không nằm trong hàm tổng hợp (như ma_lop) phải xuất hiện trong GROUP BY ma_lop.',
    ],
    sqlTables: SHARED_SQL_SCHEMAS.QUAN_LY_HOC_SINH,
    sqlExpectedColumns: ['ma_lop', 'si_so', 'diem_chung'],
    sqlExpectedRows: [
      { ma_lop: '12A1', si_so: 3, diem_chung: 8.73 },
      { ma_lop: '12A2', si_so: 2, diem_chung: 8.3 },
      { ma_lop: '12A3', si_so: 1, diem_chung: 6.8 },
    ],
  },
  {
    id: 'sql-adv-01',
    codeNumber: 'SQL-076',
    title: 'Phân Tích Mượn Sách Thư Viện Kết Hợp JOIN, GROUP BY & HAVING',
    language: 'sql',
    categoryMode: 'sql',
    difficulty: 'advanced',
    source: 'LeetCode',
    gradeTag: 'Lớp 12 · Vận dụng cao · Phân tích CSDL',
    topic: 'INNER JOIN + GROUP BY + HAVING',
    timeComplexity: 'O(N log N)',
    spaceComplexity: 'O(G)',
    structureGuide: [
      {
        stepTitle: '1. Kết nối bảng SACH và MUON_SACH',
        syntaxPattern: 'FROM SACH\nINNER JOIN MUON_SACH ON SACH.ma_sach = MUON_SACH.ma_sach',
        note: 'Ghép thông tin tên sách với các phiếu mượn tương ứng.',
      },
      {
        stepTitle: '2. Gom nhóm & Lọc nhóm bằng HAVING',
        syntaxPattern: 'GROUP BY ten_sach\nHAVING COUNT(*) >= 2;',
        note: 'HAVING lọc trên kết quả hàm tổng hợp COUNT(*) sau khi đã GROUP BY.',
      },
    ],
    xpReward: 80,
    description:
      'Thư viện nhà trường muốn tìm các đầu sách giáo trình được học sinh mượn từ 2 lượt trở lên để bổ sung thêm bản in.',
    taskSpecification:
      'Từ bảng SACH và MUON_SACH, hãy kết nối qua ma_sach, gom nhóm theo ten_sach, lấy ra ten_sach và COUNT(*) AS so_luot_muon đối với các sách có COUNT(*) >= 2.',
    constraints: [
      'Kết nối SACH và MUON_SACH qua ma_sach.',
      'Gom nhóm GROUP BY ten_sach và lọc nhóm bằng HAVING COUNT(*) >= 2.',
    ],
    starterCode: '',
    solutionCode: `SELECT ten_sach, COUNT(*) AS so_luot_muon
FROM SACH
INNER JOIN MUON_SACH ON SACH.ma_sach = MUON_SACH.ma_sach
GROUP BY ten_sach
HAVING COUNT(*) >= 2;`,
    hints: [
      'Dùng WHERE để lọc từng dòng trước khi gộp nhóm, và dùng HAVING COUNT(*) >= 2 để lọc sau khi đã GROUP BY ten_sach.',
    ],
    sqlTables: SHARED_SQL_SCHEMAS.THU_VIEN_TRUONG,
    sqlExpectedColumns: ['ten_sach', 'so_luot_muon'],
    sqlExpectedRows: [
      { ten_sach: 'Tin Học 10 - Lập Trình Python', so_luot_muon: 2 },
    ],
  },
];

const PYTHON_SOURCES: ProblemSource[] = [
  'Genopy',
  'HackerRank',
  'Bộ GD&ĐT',
  'Codeforces',
  'VNOI',
  'LeetCode',
  'Đề Sở GD&ĐT',
];

const HTML_SOURCES: ProblemSource[] = [
  'Bộ GD&ĐT',
  'W3Schools',
  'Đề Sở GD&ĐT',
  'HackerRank',
];

const SQL_SOURCES: ProblemSource[] = [
  'HackerRank',
  'Bộ GD&ĐT',
  'LeetCode',
  'Đề Sở GD&ĐT',
];

const ALGO_SOURCES: ProblemSource[] = [
  'Genopy',
  'HackerRank',
  'VNOI',
  'CSES',
  'Codeforces',
  'LeetCode',
  'Bộ GD&ĐT',
];

const DIFFICULTIES_ORDER: Difficulty[] = ['easy', 'medium', 'hard', 'advanced'];

const XP_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 20,
  medium: 35,
  hard: 55,
  advanced: 80,
};

/**
 * Generates a single Python problem or Algorithm problem deterministically.
 */
export function generateInfiniteProblem(
  language: Language,
  difficulty: Difficulty,
  seedNumber: number,
  modeOverride?: PracticeMode
): Problem {
  const mode: PracticeMode = modeOverride || language;
  const xp = XP_BY_DIFFICULTY[difficulty];

  // ==================== ALGORITHM MODE (100 PROBLEMS FROM EASY TO ADVANCED) ====================
  if (mode === 'algorithm') {
    const source = ALGO_SOURCES[seedNumber % ALGO_SOURCES.length];
    const codeNum = `ALGO-${String(seedNumber).padStart(3, '0')}`;

    if (difficulty === 'easy') {
      const kStep = (seedNumber % 5) + 2;
      const arr1 = [3, 8, 12, 5, 18, 7];
      const arr2 = [10, 15, 20, 25, 30];
      const solveEasyAlgo = (arr: number[]) => {
        let count = 0;
        let maxVal = -1;
        for (const x of arr) {
          if (x % kStep === 0) {
            count++;
            if (x > maxVal) maxVal = x;
          }
        }
        return `${count} ${maxVal}`;
      };

      return {
        id: `algo-easy-${seedNumber}`,
        codeNumber: codeNum,
        title: `Thuật Toán Tìm Kiếm Tuần Tự & Cực Trị Bội Số Của ${kStep} (Bài #${seedNumber})`,
        language: 'python',
        categoryMode: 'algorithm',
        isAlgorithm: true,
        algorithmGroup: 'Tìm Kiếm Tuần Tự (Linear Search)',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        structureGuide: [
          {
            stepTitle: '1. Khởi tạo biến đếm và biến cực trị lính canh',
            syntaxPattern: 'dem = 0\nmax_val = -1',
            note: 'Đặt max_val = -1 để dễ dàng nhận diện trường hợp không có phần tử thỏa mãn.',
          },
          {
            stepTitle: '2. Duyệt tuần tự Linear Search O(N)',
            syntaxPattern: `for x in arr:\n    if x % ${kStep} == 0:\n        dem += 1\n        if x > max_val: max_val = x`,
            note: 'Kiểm tra từng phần tử trong danh sách đúng 1 lần.',
          },
        ],
        difficulty: 'easy',
        source,
        gradeTag: 'Lớp 11 · Chủ đề F · Thuật toán Tìm kiếm',
        topic: 'Tìm kiếm tuần tự (Linear Search) & Tìm Max có điều kiện',
        xpReward: xp,
        description: `Cho dãy số nguyên dương A. Áp dụng thuật toán tìm kiếm tuần tự để đếm số lượng phần tử chia hết cho ${kStep} và tìm giá trị lớn nhất trong các phần tử đó (nếu không có phần tử nào chia hết cho ${kStep} thì giá trị lớn nhất là -1).`,
        taskSpecification: `Đọc danh sách số nguyên trên 1 dòng. In ra 2 số nguyên cách nhau bởi dấu cách: số lượng phần tử chia hết cho ${kStep} và giá trị lớn nhất của chúng.`,
        constraints: ['1 <= N <= 10^4', 'Độ phức tạp thời gian: O(N)'],
        starterCode: '',
        solutionCode: `arr = list(map(int, input().split()))
dem = 0
max_val = -1
for x in arr:
    if x % ${kStep} == 0:
        dem += 1
        if x > max_val:
            max_val = x
print(dem, max_val)`,
        hints: [
          `Duyệt từng phần tử x trong danh sách, nếu x % ${kStep} == 0 thì tăng biến đếm và cập nhật max_val.`,
        ],
        pythonTests: [
          { id: 't1', input: arr1.join(' '), expectedOutput: solveEasyAlgo(arr1) },
          { id: 't2', input: arr2.join(' '), expectedOutput: solveEasyAlgo(arr2) },
        ],
      };
    }

    if (difficulty === 'medium') {
      const targetOffset = (seedNumber % 4) + 1;
      const arr1 = [2, 5, 8, 12, 16, 23, 38, 56];
      const target1 = arr1[targetOffset];
      const arr2 = [4, 9, 15, 21, 30, 42];
      const target2 = 100;

      const binSearchIdx = (arr: number[], target: number) => {
        let l = 0;
        let r = arr.length - 1;
        while (l <= r) {
          const mid = Math.floor((l + r) / 2);
          if (arr[mid] === target) return mid;
          if (arr[mid] < target) l = mid + 1;
          else r = mid - 1;
        }
        return -1;
      };

      return {
        id: `algo-med-${seedNumber}`,
        codeNumber: codeNum,
        title: `Thuật Toán Tìm Kiếm Nhị Phân (Binary Search) & Sắp Xếp Dãy Tăng (Bài #${seedNumber})`,
        language: 'python',
        categoryMode: 'algorithm',
        isAlgorithm: true,
        algorithmGroup: 'Tìm Kiếm Nhị Phân & Chia Để Trị',
        timeComplexity: 'O(N log N)',
        spaceComplexity: 'O(1)',
        structureGuide: [
          {
            stepTitle: '1. Chuẩn hóa mảng tăng dần',
            syntaxPattern: 'arr = sorted(list(map(int, input().split())))\nk = int(input())',
            note: 'Điều kiện tiên quyết của Tìm kiếm nhị phân là dãy phải được sắp xếp.',
          },
          {
            stepTitle: '2. Thu hẹp khoảng tìm kiếm [left, right]',
            syntaxPattern: 'left, right = 0, len(arr) - 1\nwhile left <= right:\n    mid = (left + right) // 2',
            note: 'Mỗi bước giảm một nửa không gian tìm kiếm, đạt độ phức tạp O(log N).',
          },
        ],
        difficulty: 'medium',
        source,
        gradeTag: 'Lớp 11 · Thiết kế thuật toán · Chia để trị',
        topic: 'Tìm kiếm nhị phân (Binary Search) trên mảng đã sắp xếp',
        xpReward: xp,
        description: `Cho dãy số nguyên trên dòng thứ nhất và giá trị khóa K trên dòng thứ hai. Hãy sắp xếp dãy tăng dần, sau đó dùng thuật toán Tìm kiếm nhị phân (Binary Search) để tìm vị trí chỉ số (0-indexed) của K trong dãy đã sắp xếp (in -1 nếu không tồn tại).`,
        taskSpecification: `Dòng 1: các số nguyên của mảng. Dòng 2: số nguyên K. In ra chỉ số của K sau khi sắp xếp tăng dần (hoặc -1 nếu không tìm thấy).`,
        constraints: ['1 <= N <= 10^5', 'Độ phức tạp tìm kiếm: O(log N)'],
        starterCode: '',
        solutionCode: `arr = sorted(list(map(int, input().split())))
k = int(input())
left = 0
right = len(arr) - 1
ans = -1
while left <= right:
    mid = (left + right) // 2
    if arr[mid] == k:
        ans = mid
        break
    elif arr[mid] < k:
        left = mid + 1
    else:
        right = mid - 1
print(ans)`,
        hints: [
          'Sử dụng hai con trỏ biên left = 0 và right = len(arr) - 1, tính mid = (left + right) // 2.',
        ],
        pythonTests: [
          { id: 't1', input: `${arr1.join(' ')}\n${target1}`, expectedOutput: String(binSearchIdx(arr1, target1)) },
          { id: 't2', input: `${arr2.join(' ')}\n${target2}`, expectedOutput: String(binSearchIdx(arr2, target2)) },
        ],
      };
    }

    if (difficulty === 'hard') {
      const windowSize = (seedNumber % 3) + 2; // 2, 3, or 4
      const arr1 = [4, 2, 10, 3, 8, 6, 5];
      const arr2 = [1, 9, 2, 8, 3, 7, 4, 6];
      const maxWindowSum = (arr: number[], k: number) => {
        let best = 0;
        for (let i = 0; i <= arr.length - k; i++) {
          let cur = 0;
          for (let j = i; j < i + k; j++) cur += arr[j];
          if (i === 0 || cur > best) best = cur;
        }
        return best;
      };

      return {
        id: `algo-hard-${seedNumber}`,
        codeNumber: codeNum,
        title: `Thuật Toán Cửa Sổ Trượt (Sliding Window) & Mảng Cộng Dồn Cỡ K=${windowSize} (Bài #${seedNumber})`,
        language: 'python',
        categoryMode: 'algorithm',
        isAlgorithm: true,
        algorithmGroup: 'Hai Con Trỏ & Cửa Sổ Trượt (Sliding Window)',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        structureGuide: [
          {
            stepTitle: '1. Tính tổng cửa sổ đầu tiên kích thước K',
            syntaxPattern: `cur = sum(arr[:${windowSize}])\nmax_sum = cur`,
            note: 'Khởi tạo tổng của K phần tử liên tiếp đầu tiên.',
          },
          {
            stepTitle: '2. Trượt cửa sổ sang phải trong O(1) mỗi bước',
            syntaxPattern: `for i in range(${windowSize}, len(arr)):\n    cur = cur + arr[i] - arr[i - ${windowSize}]\n    if cur > max_sum: max_sum = cur`,
            note: 'Cộng phần tử mới vào bên phải và trừ phần tử cũ ở bên trái.',
          },
        ],
        difficulty: 'hard',
        source,
        gradeTag: 'Lớp 11 & 12 · Tối ưu hóa thuật toán O(N)',
        topic: `Kỹ thuật Cửa sổ trượt (Sliding Window) kích thước K=${windowSize}`,
        xpReward: xp,
        description: `Cho dãy số nguyên gồm ít nhất ${windowSize} phần tử. Hãy tìm tổng lớn nhất của một đoạn con gồm đúng ${windowSize} phần tử liên tiếp trong dãy bằng kỹ thuật Cửa sổ trượt (Sliding Window).`,
        taskSpecification: `Đọc dãy số nguyên trên 1 dòng. In ra tổng lớn nhất của ${windowSize} phần tử liên tiếp.`,
        constraints: [`N >= ${windowSize}`, 'Độ phức tạp thời gian yêu cầu: O(N)'],
        starterCode: '',
        solutionCode: `arr = list(map(int, input().split()))
max_sum = -1000000000
for i in range(len(arr) - ${windowSize} + 1):
    cur = 0
    for j in range(i, i + ${windowSize}):
        cur += arr[j]
    if cur > max_sum:
        max_sum = cur
print(max_sum)`,
        hints: [
          `Duyệt vị trí bắt đầu i từ 0 đến len(arr) - ${windowSize} và cập nhật tổng lớn nhất.`,
        ],
        pythonTests: [
          { id: 't1', input: arr1.join(' '), expectedOutput: String(maxWindowSum(arr1, windowSize)) },
          { id: 't2', input: arr2.join(' '), expectedOutput: String(maxWindowSum(arr2, windowSize)) },
        ],
      };
    }

    // Advanced Algorithm: Dynamic Programming (Quy hoạch động)
    const stepBonus = (seedNumber % 4) + 2;
    const solveDp = (n: number) => {
      let a = 1;
      let b = stepBonus;
      for (let i = 2; i <= n; i++) {
        const c = a + b + (i % 2 === 0 ? stepBonus : 1);
        a = b;
        b = c;
      }
      return b;
    };
    const n1 = 6 + (seedNumber % 4);
    const n2 = 10 + (seedNumber % 4);

    return {
      id: `algo-adv-${seedNumber}`,
      codeNumber: codeNum,
      title: `Quy Hoạch Động (Dynamic Programming) Tối Ưu Trạng Thái Bậc W=${stepBonus} (Bài #${seedNumber})`,
      language: 'python',
      categoryMode: 'algorithm',
      isAlgorithm: true,
      algorithmGroup: 'Quy Hoạch Động (Dynamic Programming)',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      structureGuide: [
        {
          stepTitle: '1. Xác định trạng thái cơ sở (Base Cases)',
          syntaxPattern: `f0 = 1\nf1 = ${stepBonus}`,
          note: 'Lưu trữ 2 trạng thái liền kề thay vì cấp phát toàn bộ mảng DP.',
        },
        {
          stepTitle: '2. Công thức chuyển trạng thái Quy hoạch động',
          syntaxPattern: `for i in range(2, n + 1):\n    fi = f0 + f1 + (${stepBonus} if i % 2 == 0 else 1)\n    f0, f1 = f1, fi`,
          note: 'Cập nhật trạng thái tuyến tính O(N) thời gian và O(1) bộ nhớ.',
        },
      ],
      difficulty: 'advanced',
      source,
      gradeTag: 'Lớp 12 · Chuyên đề Quy hoạch động & HSG Tin học',
      topic: 'Quy hoạch động 1 chiều & Tối ưu không gian nhớ O(1)',
      xpReward: xp,
      description: `Cho công thức quy hoạch động: F(0) = 1, F(1) = ${stepBonus}. Với mọi i >= 2: nếu i chẵn thì F(i) = F(i-1) + F(i-2) + ${stepBonus}; nếu i lẻ thì F(i) = F(i-1) + F(i-2) + 1.`,
      taskSpecification: `Nhập số nguyên dương n (2 <= n <= 35). Tính và in ra giá trị F(n).`,
      constraints: ['2 <= n <= 35', 'Độ phức tạp thời gian O(N), không gian O(1)'],
      starterCode: '',
      solutionCode: `n = int(input())
a = 1
b = ${stepBonus}
for i in range(2, n + 1):
    if i % 2 == 0:
        c = a + b + ${stepBonus}
    else:
        c = a + b + 1
    a = b
    b = c
print(b)`,
      hints: ['Dùng hai biến a, b đại diện cho F(i-2) và F(i-1) để tính F(i) trong vòng lặp từ 2 đến n.'],
      pythonTests: [
        { id: 't1', input: String(n1), expectedOutput: String(solveDp(n1)) },
        { id: 't2', input: String(n2), expectedOutput: String(solveDp(n2)) },
      ],
    };
  }

  // ==================== PYTHON MODE ====================
  if (language === 'python') {
    const source = PYTHON_SOURCES[seedNumber % PYTHON_SOURCES.length];
    const codeNum = `PY-${String(seedNumber).padStart(3, '0')}`;
    const kFactor = (seedNumber % 7) + 2;
    const baseBonus = ((seedNumber % 9) + 1) * 10;

    if (difficulty === 'easy') {
      const a1 = 10 + (seedNumber % 15);
      const a2 = 25 + (seedNumber % 20);
      return {
        id: `py-easy-gen-${seedNumber}`,
        codeNumber: codeNum,
        title: `Tính Biểu Thức Tuyến Tính Hệ Số K=${kFactor} (Genopy / Bộ GD&ĐT #${seedNumber})`,
        language: 'python',
        categoryMode: 'python',
        difficulty: 'easy',
        source,
        gradeTag: 'Lớp 10 · Chủ đề F · Biến & Kiểu dữ liệu',
        topic: 'Biến, phép toán số học & Nhập xuất chuẩn input/print',
        timeComplexity: 'O(1)',
        spaceComplexity: 'O(1)',
        structureGuide: [
          {
            stepTitle: '1. Nhập số nguyên từ chuẩn đầu vào stdin',
            syntaxPattern: 'n = int(input())',
            note: 'Hàm input() trả về kiểu str, dùng int() để chuyển sang số nguyên.',
          },
          {
            stepTitle: '2. Tính giá trị biểu thức và xuất ra stdout',
            syntaxPattern: `S = n * ${kFactor} + ${baseBonus}\nprint(S)`,
            note: 'Thực hiện phép nhân trước, phép cộng sau theo thứ tự ưu tiên toán tử.',
          },
        ],
        xpReward: xp,
        description: `Cho số nguyên dương n đại diện cho số đơn vị dữ liệu đầu vào trong bài tập chuẩn #${seedNumber}. Công thức quy đổi là: S = n * ${kFactor} + ${baseBonus}.`,
        taskSpecification: `Đọc số nguyên n từ bàn phím và in ra giá trị S = n * ${kFactor} + ${baseBonus}.`,
        constraints: ['1 <= n <= 10^6'],
        starterCode: '',
        solutionCode: `n = int(input())\nprint(n * ${kFactor} + ${baseBonus})`,
        hints: [`Sử dụng int(input()) và nhân với ${kFactor} rồi cộng ${baseBonus}.`],
        pythonTests: [
          { id: 'g1', input: String(a1), expectedOutput: String(a1 * kFactor + baseBonus) },
          { id: 'g2', input: String(a2), expectedOutput: String(a2 * kFactor + baseBonus) },
          { id: 'g3', input: '100', expectedOutput: String(100 * kFactor + baseBonus), isHidden: true },
        ],
      };
    }

    if (difficulty === 'medium') {
      const divisor = (seedNumber % 5) + 2;
      const calcSum = (n: number) => {
        let s = 0;
        for (let i = 1; i <= n; i++) {
          if (i % divisor === 0) s += i;
        }
        return s;
      };
      const t1 = 15 + (seedNumber % 10);
      const t2 = 30 + (seedNumber % 15);
      return {
        id: `py-med-gen-${seedNumber}`,
        codeNumber: codeNum,
        title: `Tổng Các Bội Số Chia Hết Cho ${divisor} Trong Đoạn [1, N] (Bài #${seedNumber})`,
        language: 'python',
        categoryMode: 'python',
        difficulty: 'medium',
        source,
        gradeTag: 'Lớp 10 · Cấu trúc lặp for & range()',
        topic: `Vòng lặp range(1, n + 1) & Toán tử chia lấy dư % ${divisor}`,
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(1)',
        structureGuide: [
          {
            stepTitle: '1. Khởi tạo biến cộng dồn',
            syntaxPattern: 'n = int(input())\ntong = 0',
            note: 'Biến tong phải được gán giá trị 0 trước khi vào vòng lặp.',
          },
          {
            stepTitle: '2. Vòng lặp for kết hợp kiểm tra chia hết',
            syntaxPattern: `for i in range(1, n + 1):\n    if i % ${divisor} == 0:\n        tong += i`,
            note: 'Hàm range(1, n + 1) sinh các số nguyên từ 1 đến đúng n.',
          },
        ],
        xpReward: xp,
        description: `Bài toán rèn luyện kỹ năng duyệt vòng lặp theo chuẩn Genopy & HackerRank (Bài #${seedNumber}): Tính tổng tất cả các số nguyên dương từ 1 đến n mà chia hết cho ${divisor}.`,
        taskSpecification: `Nhập số nguyên dương n. In ra tổng các số chia hết cho ${divisor} trong phạm vi từ 1 đến n (bao gồm cả n).`,
        constraints: ['1 <= n <= 10^4'],
        starterCode: '',
        solutionCode: `n = int(input())\ntong = 0\nfor i in range(1, n + 1):\n    if i % ${divisor} == 0:\n        tong += i\nprint(tong)`,
        hints: [`Kiểm tra điều kiện chia hết bằng i % ${divisor} == 0.`],
        pythonTests: [
          { id: 'g1', input: String(t1), expectedOutput: String(calcSum(t1)) },
          { id: 'g2', input: String(t2), expectedOutput: String(calcSum(t2)) },
          { id: 'g3', input: '50', expectedOutput: String(calcSum(50)), isHidden: true },
        ],
      };
    }

    if (difficulty === 'hard') {
      const threshold = 10 + (seedNumber % 25);
      const sample1 = [threshold - 3, threshold + 2, threshold + 10, threshold - 1, threshold + 5];
      const sample2 = [threshold + 1, threshold + 4, threshold - 8, threshold + 12];
      const solveArr = (arr: number[]) => {
        const filtered = arr.filter((x) => x > threshold);
        return `${filtered.length} ${filtered.reduce((a, b) => a + b, 0)}`;
      };
      return {
        id: `py-hard-gen-${seedNumber}`,
        codeNumber: codeNum,
        title: `Phân Tích Danh Sách Vượt Ngưỡng Chuẩn K=${threshold} (Bài #${seedNumber})`,
        language: 'python',
        categoryMode: 'python',
        difficulty: 'hard',
        source,
        gradeTag: 'Lớp 11 · Cấu trúc danh sách (List) & Hàm',
        topic: 'Xử lý mảng 1 chiều & List Comprehension',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)',
        structureGuide: [
          {
            stepTitle: '1. Chuyển dòng input thành danh sách số nguyên',
            syntaxPattern: 'arr = list(map(int, input().split()))',
            note: 'Kỹ thuật chuẩn để đọc mảng 1 chiều trong Python.',
          },
          {
            stepTitle: '2. Lọc phần tử vượt ngưỡng bằng List Comprehension',
            syntaxPattern: `loc = [x for x in arr if x > ${threshold}]\nprint(len(loc), sum(loc))`,
            note: 'Hàm len() đếm số lượng và sum() tính tổng các phần tử thỏa mãn.',
          },
        ],
        xpReward: xp,
        description: `Cho dãy số nguyên đo lường tín hiệu trên 1 dòng. Hãy thống kê các giá trị lớn hơn hẳn ngưỡng K = ${threshold} (Bài #${seedNumber}).`,
        taskSpecification: `Đọc danh sách số nguyên trên 1 dòng. In ra 2 số nguyên cách nhau bởi dấu cách: số lượng phần tử > ${threshold} và tổng của chúng.`,
        constraints: ['Dãy gồm 1 đến 500 số nguyên'],
        starterCode: '',
        solutionCode: `arr = list(map(int, input().split()))\nloc = [x for x in arr if x > ${threshold}]\nprint(len(loc), sum(loc))`,
        hints: [`Có thể dùng list comprehension: [x for x in arr if x > ${threshold}].`],
        pythonTests: [
          { id: 'g1', input: sample1.join(' '), expectedOutput: solveArr(sample1) },
          { id: 'g2', input: sample2.join(' '), expectedOutput: solveArr(sample2) },
        ],
      };
    }

    // Advanced Python
    const stepWeight = (seedNumber % 4) + 2;
    const calcSeq = (n: number) => {
      let a = 1;
      let b = stepWeight;
      for (let i = 2; i <= n; i++) {
        const next = a + b + (i % 2 === 0 ? stepWeight : 1);
        a = b;
        b = next;
      }
      return n === 0 ? 1 : b;
    };
    const n1 = 5 + (seedNumber % 4);
    const n2 = 8 + (seedNumber % 5);
    return {
      id: `py-adv-gen-${seedNumber}`,
      codeNumber: codeNum,
      title: `Dãy Truy Hồi Bậc Hai Trọng Số W=${stepWeight} (HackerRank / VNOI #${seedNumber})`,
      language: 'python',
      categoryMode: 'python',
      difficulty: 'advanced',
      source,
      gradeTag: 'Lớp 12 · Vận dụng cao · Thuật toán nâng cao',
      topic: 'Tối ưu hóa vòng lặp & Truy hồi tuyến tính O(N)',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(1)',
      structureGuide: [
        {
          stepTitle: '1. Khởi tạo 2 số hạng đầu tiên',
          syntaxPattern: `a = 1\nb = ${stepWeight}`,
          note: 'Tương ứng với F(0) = 1 và F(1) = W.',
        },
        {
          stepTitle: '2. Cập nhật số hạng thứ i theo tính chẵn lẻ',
          syntaxPattern: `for i in range(2, n + 1):\n    c = a + b + (${stepWeight} if i % 2 == 0 else 1)\n    a, b = b, c`,
          note: 'Tránh dùng đệ quy thuần túy gây quá thời gian O(2^N).',
        },
      ],
      xpReward: xp,
      description: `Cho dãy số truy hồi F(0) = 1, F(1) = ${stepWeight}. Với mọi i >= 2: nếu i chẵn thì F(i) = F(i-1) + F(i-2) + ${stepWeight}, ngược lại nếu i lẻ thì F(i) = F(i-1) + F(i-2) + 1 (Bài #${seedNumber}).`,
      taskSpecification: `Nhập số nguyên dương n (2 <= n <= 35). In ra giá trị F(n).`,
      constraints: ['2 <= n <= 35', 'Độ phức tạp thời gian O(n)'],
      starterCode: '',
      solutionCode: `n = int(input())\na = 1\nb = ${stepWeight}\nfor i in range(2, n + 1):\n    if i % 2 == 0:\n        c = a + b + ${stepWeight}\n    else:\n        c = a + b + 1\n    a = b\n    b = c\nprint(b)`,
      hints: ['Dùng 2 biến trạng thái a = F(i-2) và b = F(i-1) để tính F(i) trong O(n).'],
      pythonTests: [
        { id: 'g1', input: String(n1), expectedOutput: String(calcSeq(n1)) },
        { id: 'g2', input: String(n2), expectedOutput: String(calcSeq(n2)) },
      ],
    };
  }

  // ==================== SQL MODE ====================
  if (language === 'sql') {
    const source = SQL_SOURCES[seedNumber % SQL_SOURCES.length];
    const codeNum = `SQL-${String(seedNumber).padStart(3, '0')}`;
    const thresholdScore = Number((7.0 + ((seedNumber % 5) * 0.5)).toFixed(1));
    const allStudents = SHARED_SQL_SCHEMAS.QUAN_LY_HOC_SINH[1].rows;

    if (difficulty === 'easy' || difficulty === 'medium') {
      const expected = allStudents
        .filter((r) => Number(r.diem_tb) >= thresholdScore)
        .sort((a, b) => Number(b.diem_tb) - Number(a.diem_tb))
        .map((r) => ({
          ma_hs: r.ma_hs,
          ho_ten: r.ho_ten,
          diem_tb: r.diem_tb,
        }));

      return {
        id: `sql-${difficulty}-gen-${seedNumber}`,
        codeNumber: codeNum,
        title: `Truy Vấn Học Sinh Có Điểm Trung Bình >= ${thresholdScore} (Bài #${seedNumber})`,
        language: 'sql',
        categoryMode: 'sql',
        difficulty,
        source,
        gradeTag: 'Lớp 11 · Chủ đề F · CSDL Quan hệ SQL',
        topic: 'SELECT, FROM, WHERE, ORDER BY DESC',
        timeComplexity: 'O(N log N)',
        spaceComplexity: 'O(N)',
        structureGuide: [
          {
            stepTitle: '1. Mệnh đề SELECT & FROM',
            syntaxPattern: 'SELECT ma_hs, ho_ten, diem_tb\nFROM HOC_SINH',
            note: 'Chọn đúng 3 cột mã học sinh, họ tên và điểm trung bình.',
          },
          {
            stepTitle: '2. Mệnh đề lọc WHERE & sắp xếp ORDER BY',
            syntaxPattern: `WHERE diem_tb >= ${thresholdScore}\nORDER BY diem_tb DESC;`,
            note: 'Sắp xếp giảm dần theo điểm trung bình bằng từ khóa DESC.',
          },
        ],
        xpReward: xp,
        description: `Truy vấn danh sách học sinh từ bảng HOC_SINH đạt ngưỡng điểm xét tuyển >= ${thresholdScore} điểm trong bộ đề chuẩn #${seedNumber}.`,
        taskSpecification: `Viết câu lệnh SQL lấy ra ma_hs, ho_ten, diem_tb từ bảng HOC_SINH với điều kiện diem_tb >= ${thresholdScore}, sắp xếp theo diem_tb giảm dần (DESC).`,
        constraints: [`WHERE diem_tb >= ${thresholdScore}`, 'ORDER BY diem_tb DESC'],
        starterCode: '',
        solutionCode: `SELECT ma_hs, ho_ten, diem_tb\nFROM HOC_SINH\nWHERE diem_tb >= ${thresholdScore}\nORDER BY diem_tb DESC;`,
        hints: [`Kết hợp WHERE diem_tb >= ${thresholdScore} và ORDER BY diem_tb DESC.`],
        sqlTables: SHARED_SQL_SCHEMAS.QUAN_LY_HOC_SINH,
        sqlExpectedColumns: ['ma_hs', 'ho_ten', 'diem_tb'],
        sqlExpectedRows: expected,
      };
    }

    const minCopies = 20 + ((seedNumber % 3) * 10);
    const books = SHARED_SQL_SCHEMAS.THU_VIEN_TRUONG[0].rows;
    const expectedBooks = books
      .filter((b) => Number(b.so_luong) >= minCopies)
      .sort((a, b) => Number(b.so_luong) - Number(a.so_luong))
      .map((b) => ({
        ma_sach: b.ma_sach,
        ten_sach: b.ten_sach,
        so_luong: b.so_luong,
      }));

    return {
      id: `sql-${difficulty}-gen-${seedNumber}`,
      codeNumber: codeNum,
      title: `Kiểm Kê Giáo Trình Thư Viện Có Số Lượng >= ${minCopies} Bản (Bài #${seedNumber})`,
      language: 'sql',
      categoryMode: 'sql',
      difficulty,
      source,
      gradeTag: 'Lớp 11 & 12 · Quản trị CSDL Thư viện',
      topic: 'Lọc định lượng WHERE & Sắp xếp ORDER BY trong SQL',
      timeComplexity: 'O(N log N)',
      spaceComplexity: 'O(N)',
      structureGuide: [
        {
          stepTitle: '1. Trích xuất thông tin sách từ bảng SACH',
          syntaxPattern: 'SELECT ma_sach, ten_sach, so_luong\nFROM SACH',
          note: 'Chỉ lấy 3 trường theo đúng thứ tự yêu cầu.',
        },
        {
          stepTitle: '2. Lọc số lượng tồn kho và sắp xếp giảm dần',
          syntaxPattern: `WHERE so_luong >= ${minCopies}\nORDER BY so_luong DESC;`,
          note: 'Đặt dấu chấm phẩy (;) kết thúc câu truy vấn chuẩn ANSI SQL.',
        },
      ],
      xpReward: xp,
      description: `Thư viện nhà trường kiểm kê các đầu sách trong bảng SACH có số lượng bản lưu trữ (so_luong) từ ${minCopies} cuốn trở lên (Bài #${seedNumber}).`,
      taskSpecification: `Lấy ra 3 cột ma_sach, ten_sach, so_luong từ bảng SACH sao cho so_luong >= ${minCopies}, sắp xếp theo so_luong giảm dần (DESC).`,
      constraints: [`WHERE so_luong >= ${minCopies}`, 'ORDER BY so_luong DESC'],
      starterCode: '',
      solutionCode: `SELECT ma_sach, ten_sach, so_luong\nFROM SACH\nWHERE so_luong >= ${minCopies}\nORDER BY so_luong DESC;`,
      hints: [`Sử dụng SELECT ma_sach, ten_sach, so_luong FROM SACH WHERE so_luong >= ${minCopies} ORDER BY so_luong DESC;`],
      sqlTables: SHARED_SQL_SCHEMAS.THU_VIEN_TRUONG,
      sqlExpectedColumns: ['ma_sach', 'ten_sach', 'so_luong'],
      sqlExpectedRows: expectedBooks,
    };
  }

  // ==================== HTML & CSS MODE ====================
  const source = HTML_SOURCES[seedNumber % HTML_SOURCES.length];
  const codeNum = `WEB-${String(seedNumber).padStart(3, '0')}`;
  const seminarNum = 10 + seedNumber;
  const requiredRows = (seedNumber % 2) + 2;

  return {
    id: `html-${difficulty}-gen-${seedNumber}`,
    codeNumber: codeNum,
    title: `Thiết Kế Lịch Ôn Tập Chuyên Đề Tin Học Số #${seminarNum} (HTML5 Table & List)`,
    language: 'html',
    categoryMode: 'html',
    difficulty,
    source,
    gradeTag: 'Lớp 12 · Thiết kế Web HTML5 & CSS3',
    topic: 'Kết hợp tiêu đề h2, bảng dữ liệu table và danh sách ul/li',
    timeComplexity: 'DOM O(1)',
    spaceComplexity: 'DOM Tree',
    structureGuide: [
      {
        stepTitle: '1. Khai báo tiêu đề chuyên đề <h2>',
        syntaxPattern: `<h2>Chuyên Đề #${seminarNum}</h2>`,
        note: 'Thẻ <h2> phải chứa đúng mã số chuyên đề theo yêu cầu đề bài.',
      },
      {
        stepTitle: '2. Bảng dữ liệu <table border="1"> & Danh sách <ul>',
        syntaxPattern: '<table border="1">\n  <tr><th>Chủ đề</th><th>Thời lượng</th></tr>\n  <tr><td>Python</td><td>45 phút</td></tr>\n</table>\n<ul><li>...</li></ul>',
        note: 'Đảm bảo đóng đủ các thẻ </tr>, </table> và </ul>.',
      },
    ],
    xpReward: xp,
    description: `Xây dựng cấu trúc trang thông báo Lịch Ôn Tập Chuyên Đề Tin Học #${seminarNum} chuẩn chương trình Tin học 12 (GDPT 2018).`,
    taskSpecification: `Tạo phần tử <h2> chứa cụm "Chuyên Đề #${seminarNum}", một bảng <table border="1"> có ít nhất ${requiredRows} hàng <tr>, và danh sách <ul> chứa ít nhất 2 mục <li>.`,
    constraints: [
      `Thẻ <h2> chứa "Chuyên Đề #${seminarNum}"`,
      `Thẻ <table border="1"> có >= ${requiredRows} thẻ <tr>`,
      'Danh sách <ul> có >= 2 thẻ <li>',
    ],
    starterCode: '',
    solutionCode: `<section>
  <h2>Lịch Ôn Tập Chuyên Đề #${seminarNum}</h2>
  <table border="1">
    <tr>
      <th>Chủ đề</th>
      <th>Thời lượng</th>
    </tr>
    <tr>
      <td>Thuật toán Python & CSDL SQL</td>
      <td>90 phút</td>
    </tr>
    <tr>
      <td>Thiết kế Web HTML5 & CSS3</td>
      <td>60 phút</td>
    </tr>
  </table>
  <ul>
    <li>Hoàn thành bài tập thực hành trên IDE</li>
    <li>Đối chiếu kết quả kiểm thử tự động</li>
  </ul>
</section>`,
    hints: [
      `Đảm bảo tiêu đề <h2> có chứa chuỗi "Chuyên Đề #${seminarNum}" và thẻ <table border="1"> đóng mở đầy đủ.`,
    ],
    htmlRequirements: [
      { id: 'h2-chk', description: `Có thẻ <h2> chứa "Chuyên Đề #${seminarNum}"`, selector: 'h2', textIncludes: `Chuyên Đề #${seminarNum}` },
      { id: 'tbl-chk', description: 'Có bảng <table border="1">', selector: 'table', attribute: 'border', expectedValue: '1' },
      { id: 'tr-chk', description: `Có ít nhất ${requiredRows} dòng <tr> trong bảng`, selector: 'tr', minCount: requiredRows },
      { id: 'li-chk', description: 'Có ít nhất 2 mục <li> trong danh sách', selector: 'li', minCount: 2 },
    ],
  };
}

/**
 * Builds the complete pre-loaded bank of 400 problems:
 * - 100 Python problems (25 Easy, 25 Medium, 25 Hard, 25 Advanced)
 * - 100 HTML/CSS problems (25 Easy, 25 Medium, 25 Hard, 25 Advanced)
 * - 100 SQL problems (25 Easy, 25 Medium, 25 Hard, 25 Advanced)
 * - 100 Algorithm problems (25 Easy, 25 Medium, 25 Hard, 25 Advanced)
 */
function buildFullProblemCatalog(): Problem[] {
  const catalog: Problem[] = [...CORE_CURATED_PROBLEMS];

  // Add remaining 96 Python problems so total Python = 100 (25 per difficulty)
  let pySeed = 2;
  for (const diff of DIFFICULTIES_ORDER) {
    for (let i = 0; i < 24; i++) {
      catalog.push(generateInfiniteProblem('python', diff, pySeed++, 'python'));
    }
  }

  // Add remaining 96 HTML problems so total HTML = 100 (25 per difficulty)
  let htmlSeed = 2;
  for (const diff of DIFFICULTIES_ORDER) {
    for (let i = 0; i < 24; i++) {
      catalog.push(generateInfiniteProblem('html', diff, htmlSeed++, 'html'));
    }
  }

  // Add remaining 96 SQL problems so total SQL = 100 (25 per difficulty)
  let sqlSeed = 2;
  for (const diff of DIFFICULTIES_ORDER) {
    for (let i = 0; i < 24; i++) {
      catalog.push(generateInfiniteProblem('sql', diff, sqlSeed++, 'sql'));
    }
  }

  // Add 100 Algorithm problems (25 Easy, 25 Medium, 25 Hard, 25 Advanced)
  let algoSeed = 1;
  for (const diff of DIFFICULTIES_ORDER) {
    for (let i = 0; i < 25; i++) {
      catalog.push(generateInfiniteProblem('python', diff, algoSeed++, 'algorithm'));
    }
  }

  return catalog;
}

export const INITIAL_PROBLEMS: Problem[] = buildFullProblemCatalog();
