import { ExamCategory, MockExam, MultipleChoiceQuestion } from '../types/academic';

const CORE_EXAMS: MockExam[] = [
  {
    id: 'exam-thpt-2025-01',
    code: 'BGD-2025-MH01',
    title: 'Đề Minh Họa Tốt Nghiệp THPT Quốc Gia — Môn Tin Học (Chuẩn GDPT 2018)',
    institution: 'Bộ Giáo dục và Đào tạo',
    examYear: 2025,
    category: 'Đề Chính Thức & Minh Họa Bộ GD&ĐT',
    durationMinutes: 50,
    description:
      'Đề thi chuẩn cấu trúc Chương trình GDPT 2018 của Bộ GD&ĐT gồm Phần I (Trắc nghiệm 4 lựa chọn, 0.25đ/câu) và Phần II (Trắc nghiệm Đúng/Sai 4 mệnh đề a, b, c, d tính điểm lũy tiến 0.1 - 0.25 - 0.5 - 1.0đ), bao phủ đầy đủ Python, Thuật toán, SQL và HTML/CSS.',
    codingProblemIds: ['py-easy-01', 'html-medium-01', 'sql-medium-01'],
    questions: [
      {
        id: 'q1',
        part: 'part1_mcq',
        topic: 'HTML5 Cơ bản (Lớp 12 - GDPT 2018)',
        language: 'html',
        prompt:
          'Trong ngôn ngữ đánh dấu siêu văn bản HTML5, phần tử nào sau đây được sử dụng để tạo một hàng (dòng) bên trong bảng dữ liệu <table>?',
        options: [
          { id: 'A', text: '<tr>' },
          { id: 'B', text: '<td>' },
          { id: 'C', text: '<th>' },
          { id: 'D', text: '<row>' },
        ],
        correctOption: 'A',
        explanation:
          'Thẻ <tr> (table row) dùng để khai báo một hàng trong bảng; <th> là ô tiêu đề và <td> là ô dữ liệu.',
      },
      {
        id: 'q2',
        part: 'part1_mcq',
        topic: 'Lập trình Python (Lớp 10 & 11 - GDPT 2018)',
        language: 'python',
        prompt:
          'Cho đoạn chương trình Python sau. Giá trị in ra màn hình sau khi thực hiện là bao nhiêu?',
        codeSnippet: `ds = [4, 7, 2, 9, 6]\ntong = 0\nfor x in ds:\n    if x % 2 == 0:\n        tong += x\nprint(tong)`,
        options: [
          { id: 'A', text: '12' },
          { id: 'B', text: '16' },
          { id: 'C', text: '28' },
          { id: 'D', text: '10' },
        ],
        correctOption: 'A',
        explanation:
          'Các phần tử chẵn (x % 2 == 0) trong danh sách là 4, 2, 6. Tổng của chúng là 4 + 2 + 6 = 12.',
      },
      {
        id: 'q3',
        part: 'part1_mcq',
        topic: 'Truy vấn CSDL SQL (Lớp 11 - GDPT 2018)',
        language: 'sql',
        prompt:
          'Trong ngôn ngữ truy vấn SQL, mệnh đề nào được dùng để lọc kết quả sau khi đã gom nhóm bằng mệnh đề GROUP BY?',
        options: [
          { id: 'A', text: 'WHERE' },
          { id: 'B', text: 'HAVING' },
          { id: 'C', text: 'ORDER BY' },
          { id: 'D', text: 'INNER JOIN' },
        ],
        correctOption: 'B',
        explanation:
          'WHERE lọc từng bản ghi trước khi gom nhóm; HAVING dùng để đặt điều kiện lọc trên các nhóm sau GROUP BY (thường đi với COUNT, AVG, SUM).',
      },
      {
        id: 'q4',
        part: 'part1_mcq',
        topic: 'CSS & Thiết kế Web (Lớp 12 - GDPT 2018)',
        language: 'html',
        prompt:
          'Trong CSS, bộ chọn (selector) nào dùng để áp dụng định dạng cho phần tử có thuộc tính id="bang-diem"?',
        options: [
          { id: 'A', text: '.bang-diem' },
          { id: 'B', text: '#bang-diem' },
          { id: 'C', text: 'bang-diem' },
          { id: 'D', text: '*bang-diem' },
        ],
        correctOption: 'B',
        explanation:
          'Trong CSS, dấu thăng (#) đại diện cho bộ chọn ID (#bang-diem), còn dấu chấm (.) đại diện cho bộ chọn lớp (.class).',
      },
      {
        id: 'q5',
        part: 'part2_true_false',
        topic: 'Phần II — Câu Đúng/Sai: CSDL Quan Hệ & SQL (Định hướng Chung)',
        language: 'sql',
        prompt:
          'Một trường THPT quản lý điểm thi học sinh qua hai bảng: HOC_SINH(ma_hs, ho_ten, ma_lop, diem_tb) và LOP_HOC(ma_lop, ten_lop, giao_vien). Xét tính Đúng/Sai của 4 nhận định sau:',
        codeSnippet: `SELECT ho_ten, ten_lop, diem_tb\nFROM HOC_SINH\nINNER JOIN LOP_HOC ON HOC_SINH.ma_lop = LOP_HOC.ma_lop\nWHERE diem_tb >= 8.0\nORDER BY diem_tb DESC;`,
        statements: [
          {
            id: 'a',
            text: 'Trường ma_lop trong bảng LOP_HOC đóng vai trò là khóa chính, còn ma_lop trong bảng HOC_SINH là khóa ngoại.',
            isTrue: true,
          },
          {
            id: 'b',
            text: 'Mệnh đề ORDER BY diem_tb DESC giúp sắp xếp danh sách học sinh theo thứ tự điểm trung bình tăng dần.',
            isTrue: false,
          },
          {
            id: 'c',
            text: 'Nếu thay WHERE diem_tb >= 8.0 bằng HAVING diem_tb >= 8.0 mà không có GROUP BY thì đó là cách viết chuẩn khuyến nghị cho lọc dòng đơn.',
            isTrue: false,
          },
          {
            id: 'd',
            text: 'Câu truy vấn trên trả về họ tên, tên lớp và điểm trung bình của những học sinh đạt từ 8.0 trở lên.',
            isTrue: true,
          },
        ],
        explanation:
          'a) Đúng (quan hệ 1-nhiều giữa LOP_HOC và HOC_SINH). b) Sai vì DESC là sắp xếp giảm dần (Descending). c) Sai vì lọc dòng đơn lẻ phải dùng WHERE. d) Đúng.',
      },
      {
        id: 'q6',
        part: 'part2_true_false',
        topic: 'Phần II — Câu Đúng/Sai: Thuật Toán Python (Định hướng Khoa học máy tính CS)',
        language: 'python',
        prompt:
          'Cho hàm Python kiểm tra và xử lý số nguyên như sau. Hãy xét tính Đúng/Sai của 4 mệnh đề a, b, c, d:',
        codeSnippet: `def xu_ly(a, b):\n    while b != 0:\n        a, b = b, a % b\n    return a\n\nprint(xu_ly(18, 24))`,
        statements: [
          {
            id: 'a',
            text: 'Hàm xu_ly(a, b) cài đặt thuật toán Euclid tìm Ước chung lớn nhất của hai số nguyên dương a và b.',
            isTrue: true,
          },
          {
            id: 'b',
            text: 'Kết quả in ra màn hình của lệnh print(xu_ly(18, 24)) là 6.',
            isTrue: true,
          },
          {
            id: 'c',
            text: 'Trong vòng lặp while, phép toán a % b trả về thương nguyên của phép chia a cho b.',
            isTrue: false,
          },
          {
            id: 'd',
            text: 'Để rút gọn phân số a/b về tối giản, ta có thể chia nguyên cả a và b cho xu_ly(a, b) bằng toán tử //.',
            isTrue: true,
          },
        ],
        explanation:
          'a) Đúng. b) Đúng vì ƯCLN(18, 24) = 6. c) Sai vì toán tử % trả về số dư của phép chia nguyên, còn // mới trả về thương nguyên. d) Đúng.',
      },
    ],
  },
];

const PROVINCIAL_DEPARTMENTS = [
  'Sở GD&ĐT Hà Nội',
  'Sở GD&ĐT TP. Hồ Chí Minh',
  'Sở GD&ĐT Nghệ An',
  'Sở GD&ĐT Hải Phòng',
  'Sở GD&ĐT Đà Nẵng',
  'Sở GD&ĐT Nam Định',
  'Sở GD&ĐT Bắc Ninh',
  'Sở GD&ĐT Thanh Hóa',
  'Sở GD&ĐT Vĩnh Phúc',
  'Sở GD&ĐT Phú Thọ',
  'Sở GD&ĐT Thừa Thiên Huế',
  'Sở GD&ĐT Cần Thơ',
  'Sở GD&ĐT Quảng Ninh',
  'Sở GD&ĐT Thái Bình',
  'Sở GD&ĐT Hà Tĩnh',
  'Sở GD&ĐT Hưng Yên',
  'Sở GD&ĐT Hải Dương',
  'Sở GD&ĐT Bắc Giang',
  'Sở GD&ĐT Đồng Nai',
  'Sở GD&ĐT Bình Dương',
  'Sở GD&ĐT Bà Rịa - Vũng Tàu',
  'Sở GD&ĐT Khánh Hòa',
  'Sở GD&ĐT Lâm Đồng',
  'Sở GD&ĐT Quảng Nam',
  'Sở GD&ĐT Bình Định',
];

const SPECIALIZED_HIGH_SCHOOLS = [
  'THPT Chuyên Hà Nội - Amsterdam',
  'THPT Chuyên Khoa Học Tự Nhiên (ĐHQGHN)',
  'THPT Chuyên Đại Học Sư Phạm Hà Nội',
  'THPT Chuyên Lê Hồng Phong (TP.HCM)',
  'THPT Chuyên Trần Đại Nghĩa (TP.HCM)',
  'THPT Chuyên Phan Bội Châu (Nghệ An)',
  'THPT Chuyên Lam Sơn (Thanh Hóa)',
  'THPT Chuyên Trần Phú (Hải Phòng)',
  'THPT Chuyên Quốc Học Huế',
  'THPT Chuyên Nguyễn Trãi (Hải Dương)',
  'THPT Chuyên Vĩnh Phúc',
  'THPT Chuyên Bắc Ninh',
  'THPT Chuyên Hùng Vương (Phú Thọ)',
  'THPT Chuyên Lê Quý Đôn (Đà Nẵng)',
  'THPT Chuyên Thái Bình',
  'THPT Chuyên Biên Hòa (Hà Nam)',
  'THPT Chuyên Hạ Long (Quảng Ninh)',
  'THPT Chuyên Nguyễn Bỉnh Khiêm (Quảng Nam)',
  'THPT Chuyên Lương Văn Tụy (Ninh Bình)',
  'THPT Chuyên Hoàng Văn Thụ (Hòa Bình)',
  'THPT Chu Văn An (Hà Nội)',
  'THPT Chuyên Sơn Tây (Hà Nội)',
  'THPT Chuyên Nguyễn Huệ (Hà Nội)',
  'THPT Chuyên Lý Tự Trọng (Cần Thơ)',
  'THPT Chuyên Hà Tĩnh',
];

function buildQuestionsForExam(seed: number, year: number): MultipleChoiceQuestion[] {
  const mult = (seed % 5) + 2;
  const arrVals = [mult * 2, mult * 3 + 1, mult * 4, mult * 5 + 1, mult * 6];
  const evenSum = arrVals.filter((x) => x % 2 === 0).reduce((a, b) => a + b, 0);
  const codingSlice = arrVals.slice(1, 4).join(', ');

  return [
    {
      id: `ex-${seed}-q1`,
      part: 'part1_mcq',
      topic: `Lập trình Python & Danh sách (Chuẩn GDPT 2018 - Năm ${year})`,
      language: 'python',
      prompt: `Cho danh sách A = [${arrVals.join(', ')}]. Đoạn lệnh Python dưới đây sẽ in ra màn hình kết quả nào?`,
      codeSnippet: `A = [${arrVals.join(', ')}]\ntong_chan = 0\nfor x in A:\n    if x % 2 == 0:\n        tong_chan += x\nprint(tong_chan)`,
      options: [
        { id: 'A', text: String(evenSum) },
        { id: 'B', text: String(evenSum + mult) },
        { id: 'C', text: String(evenSum - mult) },
        { id: 'D', text: String(arrVals[0] + arrVals[1]) },
      ],
      correctOption: 'A',
      explanation: `Các phần tử chẵn trong danh sách A có tổng bằng ${evenSum}.`,
    },
    {
      id: `ex-${seed}-q2`,
      part: 'part1_mcq',
      topic: 'Thuật toán Tìm kiếm & Độ phức tạp (Lớp 11 - GDPT 2018)',
      language: 'python',
      prompt: `Với danh sách A = [${arrVals.join(', ')}], biểu thức cắt danh sách A[1:4] trong Python trả về kết quả nào?`,
      options: [
        { id: 'A', text: `[${codingSlice}]` },
        { id: 'B', text: `[${arrVals.slice(0, 3).join(', ')}]` },
        { id: 'C', text: `[${arrVals.slice(1, 5).join(', ')}]` },
        { id: 'D', text: `[${arrVals[1]}, ${arrVals[4]}]` },
      ],
      correctOption: 'A',
      explanation: `Cú pháp A[1:4] trích xuất các phần tử tại chỉ số 1, 2, 3 (không bao gồm chỉ số 4), kết quả là [${codingSlice}].`,
    },
    {
      id: `ex-${seed}-q3`,
      part: 'part1_mcq',
      topic: 'Truy vấn CSDL Quan hệ SQL (Lớp 11 - GDPT 2018)',
      language: 'sql',
      prompt:
        'Trong hệ quản trị CSDL quan hệ SQL, câu lệnh nào dùng để lấy các bản ghi từ bảng HOC_SINH có điểm trung bình (diem_tb) từ 8.0 trở lên và sắp xếp giảm dần?',
      options: [
        { id: 'A', text: 'SELECT * FROM HOC_SINH WHERE diem_tb >= 8.0 ORDER BY diem_tb DESC;' },
        { id: 'B', text: 'SELECT * FROM HOC_SINH HAVING diem_tb >= 8.0 ORDER BY diem_tb ASC;' },
        { id: 'C', text: 'SELECT * FROM HOC_SINH WHERE diem_tb >= 8.0 GROUP BY diem_tb DESC;' },
        { id: 'D', text: 'GET * FROM HOC_SINH WHERE diem_tb >= 8.0 SORT BY diem_tb DESC;' },
      ],
      correctOption: 'A',
      explanation:
        'Dùng mệnh đề WHERE để lọc dòng thỏa mãn diem_tb >= 8.0 và ORDER BY diem_tb DESC để sắp xếp giảm dần.',
    },
    {
      id: `ex-${seed}-q4`,
      part: 'part1_mcq',
      topic: 'Ngôn ngữ HTML5 & CSS3 (Lớp 12 - GDPT 2018)',
      language: 'html',
      prompt:
        'Trong HTML5 và CSS3, cặp thẻ và thuộc tính nào dùng để liên kết nhãn văn bản <label> với ô nhập liệu <input id="ma_thi_sinh">?',
      options: [
        { id: 'A', text: '<label for="ma_thi_sinh">Mã thí sinh</label>' },
        { id: 'B', text: '<label id="ma_thi_sinh">Mã thí sinh</label>' },
        { id: 'C', text: '<label href="#ma_thi_sinh">Mã thí sinh</label>' },
        { id: 'D', text: '<label target="ma_thi_sinh">Mã thí sinh</label>' },
      ],
      correctOption: 'A',
      explanation:
        'Thuộc tính for của thẻ <label> phải trùng khớp với giá trị thuộc tính id của thẻ <input>.',
    },
    {
      id: `ex-${seed}-q5`,
      part: 'part2_true_false',
      topic: 'Phần II — Câu Đúng/Sai: Thiết Kế Web HTML/CSS & CSDL SQL (Định hướng ICT)',
      language: 'sql',
      prompt: `Xét cơ sở dữ liệu Quản lý Thư viện gồm bảng SACH(ma_sach, ten_sach, linh_vuc, so_luong) và giao diện Web tra cứu sách trực tuyến (Mã đề #${seed}):`,
      codeSnippet: `SELECT linh_vuc, SUM(so_luong) AS tong_ban_in\nFROM SACH\nGROUP BY linh_vuc\nHAVING SUM(so_luong) >= ${mult * 10};`,
      statements: [
        {
          id: 'a',
          text: 'Hàm SUM(so_luong) tính tổng số bản sách hiện có của từng lĩnh vực sau khi gom nhóm bởi GROUP BY linh_vuc.',
          isTrue: true,
        },
        {
          id: 'b',
          text: `Mệnh đề HAVING SUM(so_luong) >= ${mult * 10} dùng để lọc giữ lại các nhóm lĩnh vực có tổng số bản sách từ ${mult * 10} trở lên.`,
          isTrue: true,
        },
        {
          id: 'c',
          text: 'Trong trang HTML hiển thị kết quả, thuộc tính border-collapse: collapse của CSS dùng để tạo khoảng trống lớn giữa các ô.',
          isTrue: false,
        },
        {
          id: 'd',
          text: 'Thẻ <th> trong bảng <table> mặc định hiển thị chữ in đậm và căn giữa nội dung tiêu đề cột.',
          isTrue: true,
        },
      ],
      explanation:
        'a, b, d Đúng. c) Sai vì border-collapse: collapse dùng để gộp đường viền kép giữa các ô thành đường viền đơn mảnh.',
    },
    {
      id: `ex-${seed}-q6`,
      part: 'part2_true_false',
      topic: 'Phần II — Câu Đúng/Sai: Thuật Toán & Lập Trình Python (Định hướng CS)',
      language: 'python',
      prompt: `Cho đoạn chương trình Python cài đặt thuật toán tìm kiếm nhị phân trên mảng tăng dần (Mã đề #${seed}):`,
      codeSnippet: `def tim_nhi_phan(arr, k):\n    left, right = 0, len(arr) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if arr[mid] == k:\n            return mid\n        elif arr[mid] < k:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`,
      statements: [
        {
          id: 'a',
          text: 'Điều kiện bắt buộc để hàm tim_nhi_phan hoạt động chính xác là danh sách arr phải được sắp xếp theo thứ tự.',
          isTrue: true,
        },
        {
          id: 'b',
          text: 'Độ phức tạp thời gian trong trường hợp xấu nhất của thuật toán tìm kiếm nhị phân với N phần tử là O(log N).',
          isTrue: true,
        },
        {
          id: 'c',
          text: 'Toán tử // trong biểu thức (left + right) // 2 trả về phần dư của phép chia cho 2.',
          isTrue: false,
        },
        {
          id: 'd',
          text: 'Nếu giá trị k không xuất hiện trong danh sách arr, hàm sẽ kết thúc vòng lặp while và trả về giá trị -1.',
          isTrue: true,
        },
      ],
      explanation:
        'a, b, d Đúng. c) Sai vì toán tử // trong Python là phép chia lấy phần nguyên (floor division).',
    },
  ];
}

function buildHundredThptExams(): MockExam[] {
  const exams: MockExam[] = [...CORE_EXAMS];
  const years = [2023, 2024, 2025, 2026];

  // Category 1: 24 more Đề Chính Thức & Minh Họa Bộ GD&ĐT (Total = 25)
  for (let i = 2; i <= 25; i++) {
    const year = years[(i - 2) % years.length];
    const isOfficial = i % 2 === 0;
    exams.push({
      id: `exam-bgd-${year}-${i}`,
      code: `BGD-${year}-${String(i).padStart(3, '0')}`,
      title: `Đề ${isOfficial ? 'Chính Thức' : 'Minh Họa'} Tốt Nghiệp THPT Quốc Gia Năm ${year} — Mã Đề ${200 + i} (Chương Trình 2018)`,
      institution: 'Bộ Giáo dục và Đào tạo',
      examYear: year,
      category: 'Đề Chính Thức & Minh Họa Bộ GD&ĐT',
      durationMinutes: 50,
      description: `Đề thi ${isOfficial ? 'chính thức' : 'tham khảo/minh họa'} môn Tin học THPT Quốc gia năm ${year} theo chương trình GDPT 2018, gồm 2 phần Trắc nghiệm 4 lựa chọn và Đúng/Sai định hướng CS & ICT.`,
      codingProblemIds: ['py-easy-01', 'sql-medium-01', 'html-medium-01'],
      questions: buildQuestionsForExam(i, year),
    });
  }

  // Category 2: 25 Đề Thi Thử Sở GD&ĐT Các Tỉnh (Total = 25)
  for (let i = 0; i < 25; i++) {
    const seed = 26 + i;
    const year = years[i % years.length];
    const dept = PROVINCIAL_DEPARTMENTS[i % PROVINCIAL_DEPARTMENTS.length];
    exams.push({
      id: `exam-so-gd-${seed}`,
      code: `SGD-${year}-${String(i + 1).padStart(3, '0')}`,
      title: `Đề Thi Thử Tốt Nghiệp THPT Quốc Gia Năm ${year} — ${dept} (Chuẩn GDPT 2018)`,
      institution: dept,
      examYear: year,
      category: 'Đề Thi Thử Sở GD&ĐT Các Tỉnh',
      durationMinutes: 50,
      description: `Đề khảo sát chất lượng & thi thử Tốt nghiệp THPT môn Tin học của ${dept} năm học ${year - 1}–${year}, bám sát ma trận đề thi Chương trình GDPT 2018.`,
      codingProblemIds: ['py-medium-01', 'sql-easy-01', 'html-easy-01'],
      questions: buildQuestionsForExam(seed, year),
    });
  }

  // Category 3: 25 Đề Thi Thử Trường THPT Chuyên Toàn Quốc (Total = 25)
  for (let i = 0; i < 25; i++) {
    const seed = 51 + i;
    const year = years[i % years.length];
    const school = SPECIALIZED_HIGH_SCHOOLS[i % SPECIALIZED_HIGH_SCHOOLS.length];
    exams.push({
      id: `exam-chuyen-${seed}`,
      code: `CHUYEN-${year}-${String(i + 1).padStart(3, '0')}`,
      title: `Đề Thi Thử THPT Quốc Gia Năm ${year} — Trường ${school} (Lần ${(i % 3) + 1})`,
      institution: school,
      examYear: year,
      category: 'Đề Thi Thử Trường THPT Chuyên',
      durationMinutes: 50,
      description: `Đề thi thử Tốt nghiệp THPT Quốc gia môn Tin học do hội đồng bộ môn Trường ${school} biên soạn theo chuẩn Chương trình GDPT 2018, phân hóa tốt nhóm câu hỏi Thuật toán Python & SQL.`,
      codingProblemIds: ['py-hard-01', 'sql-hard-01', 'html-hard-01'],
      questions: buildQuestionsForExam(seed, year),
    });
  }

  // Category 4: 25 Đề Tổng Ôn Định Hướng CS & ICT (Total = 25)
  for (let i = 0; i < 25; i++) {
    const seed = 76 + i;
    const year = years[i % years.length];
    const track = i % 2 === 0 ? 'Định Hướng Khoa Học Máy Tính (CS)' : 'Định Hướng Tin Học Ứng Dụng (ICT)';
    exams.push({
      id: `exam-tong-on-${seed}`,
      code: `THPT2018-${year}-${String(i + 1).padStart(3, '0')}`,
      title: `Đề Tổng Ôn Tốt Nghiệp THPT Quốc Gia #${i + 1} (${year}) — Chuyên Sâu ${track}`,
      institution: 'Hội Đồng Chuyên Môn Tin Học THPT (GDPT 2018)',
      examYear: year,
      category: 'Đề Tổng Ôn Định Hướng CS & ICT',
      durationMinutes: 50,
      description: `Đề luyện tập chuyên sâu số #${i + 1} theo chuẩn Chương trình GDPT 2018 (${track}), rèn luyện kỹ năng giải nhanh câu hỏi Đúng/Sai 4 ý và lập trình thuật toán.`,
      codingProblemIds: ['py-adv-01', 'sql-adv-01', 'html-adv-01'],
      questions: buildQuestionsForExam(seed, year),
    });
  }

  return exams;
}

export const MOCK_EXAMS: MockExam[] = buildHundredThptExams();

export interface ExamGradingResult {
  totalScore: number;
  maxScore: number;
  questionBreakdown: {
    questionId: string;
    earnedScore: number;
    maxQuestionScore: number;
    isFullyCorrect: boolean;
    explanation: string;
  }[];
}

/**
 * Pure grading function for Mock Exams following the GDPT 2018 Bộ GD&ĐT scoring rules:
 * - Part I (MCQ): 0.25 points per correct answer.
 * - Part II (True/False 4 statements):
 *     1 correct statement  -> 0.10 points
 *     2 correct statements -> 0.25 points
 *     3 correct statements -> 0.50 points
 *     4 correct statements -> 1.00 point
 */
export function gradeMockExam(
  exam: MockExam,
  mcqAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>,
  tfAnswers: Record<string, Record<'a' | 'b' | 'c' | 'd', boolean | undefined>>
): ExamGradingResult {
  let totalScore = 0;
  let maxScore = 0;
  const questionBreakdown: ExamGradingResult['questionBreakdown'] = [];

  for (const q of exam.questions) {
    if (q.part === 'part1_mcq') {
      const maxQ = 0.25;
      maxScore += maxQ;
      const userChoice = mcqAnswers[q.id];
      const isCorrect = userChoice !== undefined && userChoice === q.correctOption;
      const earned = isCorrect ? maxQ : 0;
      totalScore += earned;
      questionBreakdown.push({
        questionId: q.id,
        earnedScore: earned,
        maxQuestionScore: maxQ,
        isFullyCorrect: isCorrect,
        explanation: q.explanation,
      });
    } else if (q.part === 'part2_true_false' && q.statements) {
      const maxQ = 1.0;
      maxScore += maxQ;
      const userMap = tfAnswers[q.id] || ({} as Record<'a' | 'b' | 'c' | 'd', boolean | undefined>);
      let correctCount = 0;
      for (const st of q.statements) {
        if (userMap[st.id] === st.isTrue) {
          correctCount++;
        }
      }
      let earned = 0;
      if (correctCount === 1) earned = 0.1;
      else if (correctCount === 2) earned = 0.25;
      else if (correctCount === 3) earned = 0.5;
      else if (correctCount === 4) earned = 1.0;

      totalScore += earned;
      questionBreakdown.push({
        questionId: q.id,
        earnedScore: earned,
        maxQuestionScore: maxQ,
        isFullyCorrect: correctCount === 4,
        explanation: q.explanation,
      });
    }
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore: Math.round(maxScore * 100) / 100,
    questionBreakdown,
  };
}
