import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Problem, UserProgressState } from '../types/academic';
import { exportSyncToken, importSyncToken } from '../utils/progressSync';

interface ProgressSyncViewProps {
  progress: UserProgressState;
  allProblems: Problem[];
  firebaseUser: User | null;
  isSyncing: boolean;
  syncStatusMessage: string;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
  onManualCloudSync: () => void;
  onUpdateProfileMeta: (
    displayName: string,
    schoolName: string,
    className: string,
    targetUni: string
  ) => void;
  onImportProgressState: (nextState: UserProgressState) => void;
  onSelectProblem: (problemId: string) => void;
}

export const ProgressSyncView: React.FC<ProgressSyncViewProps> = ({
  progress,
  allProblems,
  firebaseUser,
  isSyncing,
  syncStatusMessage,
  onGoogleSignIn,
  onSignOut,
  onManualCloudSync,
  onUpdateProfileMeta,
  onImportProgressState,
  onSelectProblem,
}) => {
  const [displayName, setDisplayName] = useState(progress.displayName || '');
  const [schoolName, setSchoolName] = useState(progress.schoolName || '');
  const [className, setClassName] = useState(progress.className || '');
  const [profileSavedMsg, setProfileSavedMsg] = useState('');
  const [importTokenInput, setImportTokenInput] = useState('');
  const [tokenFeedback, setTokenFeedback] = useState('');
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    setDisplayName(progress.displayName || '');
    setSchoolName(progress.schoolName || '');
    setClassName(progress.className || '');
  }, [progress.displayName, progress.schoolName, progress.className]);

  const solvedSet = new Set(progress.solvedIds);
  const pySolved = allProblems.filter(
    (p) => p.categoryMode === 'python' && solvedSet.has(p.id)
  ).length;
  const algoSolved = allProblems.filter(
    (p) => p.categoryMode === 'algorithm' && solvedSet.has(p.id)
  ).length;
  const htmlSolved = allProblems.filter(
    (p) => p.categoryMode === 'html' && solvedSet.has(p.id)
  ).length;
  const sqlSolved = allProblems.filter(
    (p) => p.categoryMode === 'sql' && solvedSet.has(p.id)
  ).length;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setProfileSavedMsg('Vui lòng nhập họ và tên học sinh.');
      return;
    }
    onUpdateProfileMeta(
      displayName.trim().slice(0, 100),
      schoolName.trim().slice(0, 150),
      className.trim().slice(0, 50),
      ''
    );
    setProfileSavedMsg('[OK] Đã lưu hồ sơ học tập và đồng bộ hóa thành công.');
  };

  const syncToken = exportSyncToken(progress);

  const handleCopyToken = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(syncToken);
    }
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const handleApplyToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importTokenInput.trim()) {
      setTokenFeedback('Vui lòng dán mã đồng bộ từ thiết bị khác vào ô bên dưới.');
      return;
    }
    try {
      const merged = importSyncToken(importTokenInput, progress);
      onImportProgressState(merged);
      setDisplayName(merged.displayName);
      setSchoolName(merged.schoolName);
      setClassName(merged.className || '');
      setImportTokenInput('');
      setTokenFeedback('[OK] Đồng bộ hóa dữ liệu từ thiết bị khác thành công!');
    } catch (err) {
      setTokenFeedback(
        err instanceof Error ? err.message : 'Mã đồng bộ không hợp lệ.'
      );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-slide min-w-0 overflow-hidden">
      {/* Top Summary Banner */}
      <div className="p-4 sm:p-6 bg-zinc-100 border-2 border-zinc-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 min-w-0">
        <div className="space-y-1 min-w-0">
          <div className="text-xs text-zinc-600 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Hồ sơ học tập cá nhân</span>
            <span aria-hidden="true">·</span>
            <span>Thiết bị: {progress.deviceLabel}</span>
            <span aria-hidden="true">·</span>
            <span>
              Cập nhật: {new Date(progress.lastSyncedIso).toLocaleTimeString('vi-VN')}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-black break-words">
            {progress.displayName || 'Chưa thiết lập tên học sinh'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-700 break-words">
            {progress.schoolName || 'Chưa nhập trường THPT'}
            {progress.className ? ` · Lớp ${progress.className}` : ''}
          </p>
        </div>

        {/* Account & Firebase Cloud Sync Actions */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 w-full lg:w-auto min-w-0">
          {firebaseUser ? (
            <>
              <div className="px-3 py-2 bg-white border border-zinc-900 text-xs text-black font-bold flex items-center gap-1.5 min-w-0">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Đã kết nối Cloud ({firebaseUser.email || firebaseUser.displayName})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={onManualCloudSync}
                  className="coder-btn flex-1 sm:flex-initial justify-center px-3.5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Đồng bộ Cloud ngay</span>
                </button>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="coder-btn flex-1 sm:flex-initial justify-center px-3 py-2 text-xs font-bold text-black bg-white border border-zinc-900 hover:bg-zinc-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              data-testid="google-sync-login-btn"
              onClick={onGoogleSignIn}
              className="coder-btn w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 text-center leading-snug cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Đăng Nhập / Tạo Tài Khoản Google Đồng Bộ Cloud</span>
            </button>
          )}
        </div>
      </div>

      {syncStatusMessage && (
        <div className="p-3 bg-white border border-zinc-900 text-xs text-black flex items-center gap-2 break-words">
          <Cloud className="w-4 h-4 text-black shrink-0" />
          <span>{syncStatusMessage}</span>
        </div>
      )}

      {/* 4-Column Quantitative Progress Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="coder-card p-4 sm:p-5 bg-white border border-zinc-900">
          <div className="text-xs text-zinc-600">Tổng điểm tích lũy (XP)</div>
          <div className="text-xl sm:text-2xl font-bold text-black tabular-nums mt-1">
            {progress.xp} XP
          </div>
          <div className="text-xs text-zinc-700 mt-1">
            Chuỗi ngày học liên tiếp: {progress.streakDays} ngày
          </div>
        </div>

        <div className="coder-card p-4 sm:p-5 bg-white border border-zinc-900">
          <div className="text-xs text-zinc-600">Python & Thuật Toán đã giải</div>
          <div className="text-xl sm:text-2xl font-bold text-black tabular-nums mt-1">
            {pySolved}/100 PY · {algoSolved}/100 ALGO
          </div>
          <div className="text-xs text-zinc-700 mt-1">
            Lập trình Python & Giải thuật
          </div>
        </div>

        <div className="coder-card p-4 sm:p-5 bg-white border border-zinc-900">
          <div className="text-xs text-zinc-600">Bài tập SQL đã giải</div>
          <div className="text-xl sm:text-2xl font-bold text-black tabular-nums mt-1">
            {sqlSolved}/100 bài
          </div>
          <div className="text-xs text-zinc-700 mt-1">
            Truy vấn CSDL quan hệ
          </div>
        </div>

        <div className="coder-card p-4 sm:p-5 bg-white border border-zinc-900">
          <div className="text-xs text-zinc-600">HTML/CSS & Đề thi THPT</div>
          <div className="text-xl sm:text-2xl font-bold text-black tabular-nums mt-1">
            {htmlSolved}/100 WEB · {progress.examCount}/100 đề
          </div>
          <div className="text-xs text-zinc-700 mt-1">
            Thiết kế Web & Luyện đề chuẩn 2018
          </div>
        </div>
      </div>

      {/* Split Layout: Profile Account Customization & Multi-Device Sync Code */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
        {/* Profile Form (Without purpose/target field) */}
        <form
          onSubmit={handleSaveProfile}
          className="coder-card p-4 sm:p-6 bg-white border border-zinc-900 space-y-4 min-w-0"
        >
          <div className="border-b border-zinc-300 pb-3">
            <h3 className="text-base sm:text-lg font-bold text-black flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-black shrink-0" />
              <span>Thông Tin Tài Khoản Học Sinh</span>
            </h3>
            <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
              Các ô nhập để trống mặc định để học sinh tự điền thông tin cá nhân và đồng bộ lên Firebase Firestore.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="student-name"
                className="block text-xs font-bold text-black mb-1"
              >
                Họ và tên học sinh *
              </label>
              <input
                id="student-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nhập họ và tên của bạn..."
                maxLength={100}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-100 border border-zinc-900 text-black focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="student-school"
                  className="block text-xs font-bold text-black mb-1"
                >
                  Trường THPT đang theo học
                </label>
                <input
                  id="student-school"
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="VD: THPT Chu Văn An..."
                  maxLength={150}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-100 border border-zinc-900 text-black focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="student-class"
                  className="block text-xs font-bold text-black mb-1"
                >
                  Lớp / Khối
                </label>
                <input
                  id="student-class"
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="VD: 12A1..."
                  maxLength={50}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-zinc-100 border border-zinc-900 text-black focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              className="coder-btn w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-black hover:bg-zinc-800 transition-colors text-center cursor-pointer"
            >
              Lưu Hồ Sơ Học Tập
            </button>
            {profileSavedMsg && (
              <span className="text-xs text-black font-bold break-words">
                {profileSavedMsg}
              </span>
            )}
          </div>
        </form>

        {/* Cross-Device Portable Sync Token */}
        <div className="p-4 sm:p-6 bg-white border border-zinc-900 space-y-4 min-w-0">
          <div className="border-b border-zinc-300 pb-3">
            <h3 className="text-base sm:text-lg font-bold text-black flex items-center gap-2">
              <Cloud className="w-5 h-5 text-black shrink-0" />
              <span>Mã Đồng Bộ Nhanh Đa Thiết Bị</span>
            </h3>
            <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
              Ngoài đồng bộ tự động qua Firebase Cloud, bạn có thể sao chép Mã Đồng Bộ dưới đây để chuyển tức thì tiến trình sang bất kỳ thiết bị nào.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="export-sync-code"
              className="block text-xs font-bold text-black"
            >
              Mã đồng bộ của thiết bị hiện tại:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id="export-sync-code"
                type="text"
                readOnly
                value={syncToken}
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-zinc-100 border border-zinc-900 text-zinc-800 min-w-0"
              />
              <button
                type="button"
                onClick={handleCopyToken}
                className="coder-btn px-3.5 py-2 text-xs font-bold text-black bg-zinc-100 hover:bg-zinc-200 border border-zinc-900 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>{copiedToken ? 'Đã chép!' : 'Sao chép mã'}</span>
              </button>
            </div>
          </div>

          <form
            onSubmit={handleApplyToken}
            className="space-y-2 pt-2 border-t border-zinc-300"
          >
            <label
              htmlFor="import-sync-code"
              className="block text-xs font-bold text-black"
            >
              Nhập mã đồng bộ từ thiết bị khác:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id="import-sync-code"
                type="text"
                value={importTokenInput}
                onChange={(e) => setImportTokenInput(e.target.value)}
                placeholder="Dán mã đồng bộ Base64 vào đây..."
                className="w-full px-3 py-2 text-xs font-mono-tabular bg-zinc-100 border border-zinc-900 text-black focus:outline-none min-w-0"
              />
              <button
                type="submit"
                className="coder-btn px-3.5 py-2 text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Hợp nhất dữ liệu</span>
              </button>
            </div>
            {tokenFeedback && (
              <p className="text-xs text-black font-bold break-words">
                {tokenFeedback}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Submission History Log */}
      <div className="p-4 sm:p-6 bg-white border border-zinc-900 space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-300 pb-3">
          <h3 className="text-base sm:text-lg font-bold text-black">
            Nhật Ký Nộp Bài & Chấm Điểm Gần Đây ({progress.submissions.length})
          </h3>
          <span className="text-xs text-zinc-600">
            Lưu trữ tự động mọi lần chạy thử & nộp bài
          </span>
        </div>

        {progress.submissions.length === 0 ? (
          <p className="text-xs sm:text-sm text-zinc-600 py-4">
            Chưa có lượt nộp bài nào. Hãy chọn một bài tập Python, Thuật toán, HTML hoặc SQL để bắt đầu!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 text-xs text-zinc-600">
                  <th className="py-2.5 pr-4 font-bold">Bài tập</th>
                  <th className="py-2.5 px-3 font-bold">Ngôn ngữ</th>
                  <th className="py-2.5 px-3 font-bold">Trạng thái</th>
                  <th className="py-2.5 px-3 font-bold">Điểm XP</th>
                  <th className="py-2.5 pl-3 font-bold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-300">
                {progress.submissions.map((sub) => (
                  <tr key={sub.submissionId} className="hover:bg-zinc-100">
                    <td className="py-3 pr-4 font-bold text-black min-w-[140px]">
                      {sub.problemTitle}
                    </td>
                    <td className="py-3 px-3 text-xs font-mono-tabular text-zinc-700 whitespace-nowrap">
                      {sub.language.toUpperCase()} · {sub.difficulty}
                    </td>
                    <td className="py-3 px-3 text-xs font-bold whitespace-nowrap">
                      {sub.passed ? (
                        <span className="text-black flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />✓ ĐẠT CHUẨN
                        </span>
                      ) : (
                        <span className="text-zinc-600">! CẦN BỔ SUNG</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-xs text-black font-bold whitespace-nowrap">
                      +{sub.score} XP
                    </td>
                    <td className="py-3 pl-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectProblem(sub.problemId)}
                        className="text-xs font-bold text-black underline hover:no-underline cursor-pointer"
                      >
                        Xem lại →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
