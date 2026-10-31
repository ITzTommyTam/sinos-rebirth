import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Crown,
  Medal,
  Search,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Problem, UserProgressState } from '../types/academic';
import {
  CloudLeaderboardEntry,
  getCanonicalSyncKey,
  isIgnoredTestEntry,
  subscribeToLeaderboard,
  syncProgressWithCloud,
} from '../utils/progressSync';

interface LeaderboardViewProps {
  progress: UserProgressState;
  allProblems: Problem[];
  firebaseUser: User | null;
}

type LeaderboardSortBy = 'xp' | 'solvedCount' | 'examCount';

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  progress,
  firebaseUser,
}) => {
  const [cloudEntries, setCloudEntries] = useState<CloudLeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<LeaderboardSortBy>('xp');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastLiveUpdateIso, setLastLiveUpdateIso] = useState<string>(
    () => new Date().toISOString()
  );

  const mySyncKey = useMemo(
    () =>
      getCanonicalSyncKey(
        progress,
        firebaseUser?.uid || progress.userId,
        firebaseUser?.email || progress.cloudEmail
      ) || 'local_current_user',
    [progress, firebaseUser]
  );

  // Automatically push current registered user's latest progress to Cloud and subscribe in real-time
  useEffect(() => {
    if (progress.profileCompleted && (progress.displayName.trim() || progress.cloudEmail)) {
      const uidToUse = firebaseUser ? firebaseUser.uid : progress.userId;
      syncProgressWithCloud(uidToUse, progress).catch(() => {});
    }

    const unsub = subscribeToLeaderboard((entries) => {
      setCloudEntries(entries);
      setLastLiveUpdateIso(new Date().toISOString());
    });
    return () => unsub();
  }, [
    firebaseUser,
    progress.profileCompleted,
    progress.userId,
    progress.displayName,
    progress.schoolName,
    progress.className,
    progress.cloudEmail,
    progress.xp,
    progress.solvedIds.length,
    progress.examCount,
  ]);

  const mergedLeaderboard = useMemo(() => {
    const map = new Map<string, CloudLeaderboardEntry>();
    const myNameNorm = progress.displayName.trim().toLowerCase();
    // Only real users who have registered in the web app (from Firestore /leaderboard and /user_progress)
    cloudEntries.forEach((entry) => {
      if (!entry.displayName || !entry.displayName.trim()) return;
      if (isIgnoredTestEntry(entry.syncKey, entry.displayName)) return;
      const entryNameNorm = entry.displayName.trim().toLowerCase();
      const isMe =
        entry.syncKey === mySyncKey ||
        (myNameNorm.length > 0 && entryNameNorm === myNameNorm);

      const key = isMe ? mySyncKey : entry.syncKey;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          ...entry,
          syncKey: key,
          isCurrentUser: isMe,
        });
      } else {
        const mergedSolvedIds = Array.from(
          new Set([...prev.solvedIds, ...entry.solvedIds])
        );
        map.set(key, {
          ...prev,
          displayName: entry.displayName.trim() || prev.displayName,
          schoolName: entry.schoolName.trim() || prev.schoolName,
          className: entry.className.trim() || prev.className,
          xp: Math.max(prev.xp, entry.xp),
          streakDays: Math.max(prev.streakDays, entry.streakDays),
          solvedCount: Math.max(
            prev.solvedCount,
            entry.solvedCount,
            mergedSolvedIds.length
          ),
          solvedIds: mergedSolvedIds,
          examCount: Math.max(prev.examCount, entry.examCount),
          isCurrentUser: prev.isCurrentUser || isMe,
        });
      }
    });

    // Ensure the currently logged-in / registered student is always represented with their real-time stats
    if (
      progress.profileCompleted &&
      progress.displayName.trim() &&
      !isIgnoredTestEntry(mySyncKey, progress.displayName)
    ) {
      const existingMe = map.get(mySyncKey);
      const mergedSolvedIds = Array.from(
        new Set([...(existingMe?.solvedIds || []), ...progress.solvedIds])
      );
      const meEntry: CloudLeaderboardEntry = {
        syncKey: mySyncKey,
        displayName:
          progress.displayName.trim() ||
          existingMe?.displayName ||
          firebaseUser?.displayName ||
          'Học Sinh',
        schoolName:
          progress.schoolName.trim() || existingMe?.schoolName || 'THPT Quốc Gia',
        className: progress.className?.trim() || existingMe?.className || '12',
        xp: Math.max(progress.xp, existingMe?.xp || 0),
        streakDays: Math.max(
          progress.streakDays || 1,
          existingMe?.streakDays || 1
        ),
        solvedCount: Math.max(
          progress.solvedIds.length,
          existingMe?.solvedCount || 0,
          mergedSolvedIds.length
        ),
        solvedIds: mergedSolvedIds,
        examCount: Math.max(progress.examCount, existingMe?.examCount || 0),
        deviceLabel:
          progress.deviceLabel || existingMe?.deviceLabel || 'Thiết bị hiện tại',
        updatedAtIso: progress.lastSyncedIso,
        isCurrentUser: true,
      };
      map.set(mySyncKey, meEntry);
    }

    const list = Array.from(map.values());

    list.sort((a, b) => {
      if (sortBy === 'solvedCount') {
        if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
        return b.xp - a.xp;
      }
      if (sortBy === 'examCount') {
        if (b.examCount !== a.examCount) return b.examCount - a.examCount;
        return b.xp - a.xp;
      }
      if (b.xp !== a.xp) return b.xp - a.xp;
      return b.solvedCount - a.solvedCount;
    });

    return list;
  }, [cloudEntries, mySyncKey, progress, firebaseUser, sortBy]);

  const filteredLeaderboard = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return mergedLeaderboard.filter((item) => {
      if (q) {
        const matchName = item.displayName.toLowerCase().includes(q);
        if (!matchName) return false;
      }
      return true;
    });
  }, [mergedLeaderboard, searchQuery]);

  const myGlobalRank = useMemo(() => {
    const idx = mergedLeaderboard.findIndex((x) => x.isCurrentUser);
    return idx >= 0 ? idx + 1 : 1;
  }, [mergedLeaderboard]);

  const topThree = filteredLeaderboard.slice(0, 3);

  return (
    <div
      data-testid="leaderboard-view"
      className="space-y-6 animate-fade-slide min-w-0 overflow-hidden"
    >
      {/* Header Banner */}
      <div className="p-4 sm:p-6 bg-zinc-100 border-2 border-zinc-900 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase text-zinc-700">
            <span className="px-2 py-0.5 bg-black text-white">
              REALTIME CLOUD LEADERBOARD
            </span>
            <span>·</span>
            <span>
              {mergedLeaderboard.length} Học sinh đã đăng ký trên Web
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-black">
              <ShieldCheck className="w-3.5 h-3.5" />
              Tự động đồng bộ trực tiếp ({new Date(lastLiveUpdateIso).toLocaleTimeString('vi-VN')})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black flex items-center gap-2.5">
            <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-black shrink-0" />
            <span>Bảng Xếp Hạng Thành Viên Đã Đăng Ký</span>
          </h1>
        </div>

        {/* My Current Standing Card (Auto-synced) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="p-3.5 bg-white border-2 border-black flex items-center gap-3">
            <div className="w-11 h-11 bg-black text-white flex flex-col items-center justify-center font-mono-tabular font-bold shrink-0">
              <span className="text-[10px] uppercase leading-none text-zinc-300">
                HẠNG
              </span>
              <span className="text-base leading-tight">#{myGlobalRank}</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs text-zinc-600 font-semibold flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 bg-emerald-600" />
                <span>Tự động đồng bộ tài khoản & thứ hạng</span>
              </div>
              <div className="text-sm sm:text-base font-bold text-black truncate">
                {progress.displayName || 'Học Sinh'} · {progress.xp} XP
              </div>
              <div className="text-xs text-zinc-700 tabular-nums">
                Đã giải {progress.solvedIds.length}/400 bài · {progress.examCount} đề thi
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((scholar, idx) => {
            const rank = idx + 1;
            const isFirst = rank === 1;
            return (
              <div
                key={scholar.syncKey}
                className={`coder-card p-4 sm:p-5 border-2 transition-colors flex flex-col justify-between gap-3 ${
                  scholar.isCurrentUser
                    ? 'bg-black text-white border-black'
                    : isFirst
                      ? 'bg-zinc-100 text-black border-black shadow-[4px_4px_0px_0px_#000]'
                      : 'bg-white text-black border-zinc-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 text-xs font-mono-tabular font-bold flex items-center gap-1 ${
                        scholar.isCurrentUser
                          ? 'bg-white text-black'
                          : 'bg-black text-white'
                      }`}
                    >
                      {rank === 1 ? (
                        <Crown className="w-3.5 h-3.5" />
                      ) : rank === 2 ? (
                        <Medal className="w-3.5 h-3.5" />
                      ) : (
                        <Award className="w-3.5 h-3.5" />
                      )}
                      TOP {rank}
                    </span>
                    {scholar.isCurrentUser && (
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-400 text-black">
                        BẠN
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono-tabular">
                    <div className="text-lg sm:text-xl font-bold">
                      {scholar.xp.toLocaleString('vi-VN')} XP
                    </div>
                    <div
                      className={`text-xs ${
                        scholar.isCurrentUser ? 'text-zinc-300' : 'text-zinc-600'
                      }`}
                    >
                      Chuỗi {scholar.streakDays} ngày
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-base sm:text-lg font-bold leading-snug break-words">
                    {scholar.displayName}
                  </div>
                </div>

                <div
                  className={`pt-2.5 border-t flex items-center justify-between text-xs font-mono-tabular ${
                    scholar.isCurrentUser
                      ? 'border-zinc-700 text-zinc-200'
                      : 'border-zinc-300 text-zinc-700'
                  }`}
                >
                  <span>Bài tập: {scholar.solvedCount}/400</span>
                  <span>Đề thi: {scholar.examCount}/100</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-3.5 sm:p-4 bg-zinc-100 border-2 border-zinc-900 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-black">
          <Users className="w-4 h-4 shrink-0" />
          <span>
            Danh sách thành viên đã đăng ký ({mergedLeaderboard.length})
          </span>
        </div>

        {/* Sort & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-zinc-700 whitespace-nowrap">
              Xếp theo:
            </span>
            <select
              aria-label="Tiêu chí xếp hạng"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as LeaderboardSortBy)}
              className="px-3 py-1.5 text-xs sm:text-sm bg-white border border-zinc-900 text-black font-semibold focus:outline-none"
            >
              <option value="xp">Tổng điểm tích lũy (XP)</option>
              <option value="solvedCount">Số bài Code đã giải</option>
              <option value="examCount">Số đề thi thử hoàn thành</option>
            </select>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              aria-label="Tìm học sinh hoặc trường THPT"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên học sinh đã đăng ký..."
              className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-zinc-900 text-black focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-white border-2 border-zinc-900 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-black bg-zinc-100 text-xs uppercase font-bold text-zinc-800">
              <th className="py-3 px-3 sm:px-4 w-16">Hạng</th>
              <th className="py-3 px-3 sm:px-4">Học Sinh Đã Đăng Ký</th>
              <th className="py-3 px-3 sm:px-4 text-right">Bài Đã Giải</th>
              <th className="py-3 px-3 sm:px-4 text-right">Đề Thi</th>
              <th className="py-3 px-3 sm:px-4 text-right">Chuỗi Học</th>
              <th className="py-3 px-3 sm:px-4 text-right">Tổng Điểm (XP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-300 text-xs sm:text-sm">
            {filteredLeaderboard.map((entry, idx) => {
              const rank = idx + 1;
              return (
                <tr
                  key={entry.syncKey}
                  data-testid={
                    entry.isCurrentUser ? 'leaderboard-row-current-user' : undefined
                  }
                  className={
                    entry.isCurrentUser
                      ? 'bg-zinc-900 text-white font-bold'
                      : 'hover:bg-zinc-50 text-black'
                  }
                >
                  <td className="py-3 px-3 sm:px-4 font-mono-tabular font-bold">
                    <span
                      className={`inline-flex items-center justify-center min-w-[28px] px-1.5 py-0.5 text-xs ${
                        entry.isCurrentUser
                          ? 'bg-white text-black'
                          : rank <= 3
                            ? 'bg-black text-white'
                            : 'bg-zinc-200 text-black'
                      }`}
                    >
                      #{rank}
                    </span>
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <div className="flex items-center gap-2">
                      <span>{entry.displayName}</span>
                      {entry.isCurrentUser && (
                        <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-400 text-black">
                          BẠN
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right font-mono-tabular">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {entry.solvedCount}/400
                    </span>
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right font-mono-tabular">
                    {entry.examCount}/100
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right font-mono-tabular">
                    {entry.streakDays} ngày
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-right font-mono-tabular font-bold text-sm sm:text-base">
                    {entry.xp.toLocaleString('vi-VN')} XP
                  </td>
                </tr>
              );
            })}

            {filteredLeaderboard.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 px-4 text-center text-sm text-zinc-600"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-6 h-6 text-zinc-500" />
                    <span>
                      Chưa có học sinh nào khớp với bộ lọc hiện tại.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
