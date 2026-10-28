import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Play,
  Plus,
  RotateCcw,
  Table2,
  Terminal,
} from 'lucide-react';
import { Problem, SqlTableSchema } from '../types/academic';
import { runSqlQuery } from '../utils/codeEngine';

interface SqlSandboxRunnerProps {
  problem: Problem;
  currentQuery: string;
}

export const SqlSandboxRunner: React.FC<SqlSandboxRunnerProps> = ({
  problem,
  currentQuery,
}) => {
  const defaultTables = useMemo(
    () =>
      (problem.sqlTables || []).map((t) => ({
        ...t,
        rows: t.rows.map((r) => ({ ...r })),
      })),
    [problem.id, problem.sqlTables]
  );

  const [customTables, setCustomTables] =
    useState<SqlTableSchema[]>(defaultTables);
  const [activeTableIdx, setActiveTableIdx] = useState<number>(0);
  const [newRowDraft, setNewRowDraft] = useState<Record<string, string>>({});
  const [outputMode, setOutputMode] = useState<'actual' | 'expected'>('actual');
  const [lastRunAt, setLastRunAt] = useState<number>(Date.now());

  useEffect(() => {
    setCustomTables(
      (problem.sqlTables || []).map((t) => ({
        ...t,
        rows: t.rows.map((r) => ({ ...r })),
      }))
    );
    setActiveTableIdx(0);
    setNewRowDraft({});
    setOutputMode('actual');
  }, [problem.id, problem.sqlTables]);

  const activeTable = customTables[activeTableIdx] || customTables[0];

  const liveSqlResult = useMemo(() => {
    const t0 = performance.now();
    const res = runSqlQuery(currentQuery, customTables);
    const elapsed = Math.max(1, Math.round(performance.now() - t0));
    return { ...res, elapsed };
  }, [currentQuery, customTables, lastRunAt]);

  const handleAddRowToInputTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTable) return;
    const builtRow: Record<string, string | number> = {};
    for (const col of activeTable.columns) {
      const rawVal = (newRowDraft[col.name] ?? '').trim();
      if (!rawVal) {
        builtRow[col.name] =
          col.type.includes('INT') || col.type.includes('DECIMAL') ? 0 : 'N/A';
      } else if (!isNaN(Number(rawVal))) {
        builtRow[col.name] = Number(rawVal);
      } else {
        builtRow[col.name] = rawVal;
      }
    }

    setCustomTables((prev) =>
      prev.map((tbl, idx) =>
        idx === activeTableIdx
          ? { ...tbl, rows: [...tbl.rows, builtRow] }
          : tbl
      )
    );
    setNewRowDraft({});
  };

  const handleResetInputTables = () => {
    setCustomTables(
      (problem.sqlTables || []).map((t) => ({
        ...t,
        rows: t.rows.map((r) => ({ ...r })),
      }))
    );
    setNewRowDraft({});
  };

  const expectedColumns = problem.sqlExpectedColumns || [];
  const expectedRows = problem.sqlExpectedRows || [];

  const isMatchingExpected = useMemo(() => {
    if (liveSqlResult.error) return false;
    if (liveSqlResult.rows.length !== expectedRows.length) return false;
    const serialize = (r: Record<string, string | number>) =>
      Object.values(r)
        .map((v) => String(v).trim().toLowerCase())
        .join('|');
    const actualSigs = liveSqlResult.rows.map(serialize);
    const expSigs = expectedRows.map(serialize);
    return expSigs.every((s, idx) => actualSigs[idx] === s);
  }, [liveSqlResult, expectedRows]);

  if (!activeTable) return null;

  return (
    <div
      data-testid="sql-io-runner"
      className="border-2 border-black bg-white space-y-0 animate-fade-slide min-w-0 overflow-hidden"
    >
      {/* Top Bar of Dedicated SQL Input/Output Runner */}
      <div className="px-3.5 sm:px-4 py-3 bg-black text-white flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold min-w-0">
          <Database className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="truncate sm:whitespace-normal">
            BỘ CHẠY SQL INPUT & OUTPUT RIÊNG BIỆT
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleResetInputTables}
            className="flex-1 sm:flex-initial justify-center px-2.5 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            Khôi phục Input
          </button>

          <button
            type="button"
            onClick={() => setLastRunAt(Date.now())}
            className="flex-1 sm:flex-initial justify-center px-3 py-1.5 text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            Thực Thi SQL Input → Output
          </button>
        </div>
      </div>

      {/* 2-Column Split: SQL INPUT TABLES vs SQL OUTPUT RESULT SET */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-900 min-w-0">
        {/* LEFT PANE: SQL INPUT (Schema + Editable Rows) */}
        <div className="p-3.5 sm:p-4 bg-zinc-50 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-300 pb-2">
            <div className="text-xs sm:text-sm font-bold text-black flex items-center gap-1.5">
              <Table2 className="w-4 h-4 text-black shrink-0" />
              1. BỘ DỮ LIỆU ĐẦU VÀO (SQL INPUT)
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {customTables.map((tbl, idx) => (
                <button
                  key={tbl.tableName}
                  type="button"
                  onClick={() => setActiveTableIdx(idx)}
                  className={`px-2.5 py-1 text-xs font-mono-tabular font-bold border transition-colors cursor-pointer ${
                    activeTableIdx === idx
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-black border-zinc-400 hover:border-black'
                  }`}
                >
                  {tbl.tableName} ({tbl.rows.length})
                </button>
              ))}
            </div>
          </div>

          {/* Active Input Table Data */}
          <div className="overflow-x-auto bg-white border border-zinc-900 p-2.5 max-h-[210px] overflow-y-auto">
            <table className="w-full border-collapse text-xs font-mono-tabular">
              <thead>
                <tr className="border-b border-zinc-900 text-left text-zinc-600">
                  {activeTable.columns.map((c) => (
                    <th key={c.name} className="py-1 pr-2">
                      <div>{c.name}</div>
                      <div className="text-[10px] font-normal text-zinc-400">
                        {c.type}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeTable.rows.map((r, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-zinc-200 hover:bg-zinc-100"
                  >
                    {activeTable.columns.map((c) => (
                      <td key={c.name} className="py-1 pr-2 text-black">
                        {String(r[c.name] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Custom Input Row Form */}
          <form
            onSubmit={handleAddRowToInputTable}
            className="p-2.5 bg-white border border-zinc-900 space-y-2"
          >
            <div className="text-xs font-bold text-zinc-700">
              + Thêm dòng dữ liệu thử nghiệm vào bảng Input{' '}
              <span className="font-mono-tabular text-black">
                {activeTable.tableName}
              </span>
              :
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {activeTable.columns.map((col) => (
                <input
                  key={col.name}
                  type="text"
                  value={newRowDraft[col.name] || ''}
                  onChange={(e) =>
                    setNewRowDraft((prev) => ({
                      ...prev,
                      [col.name]: e.target.value,
                    }))
                  }
                  placeholder={col.name}
                  className="px-2 py-1 text-xs font-mono-tabular bg-zinc-100 border border-zinc-400 text-black focus:border-black focus:outline-none min-w-0"
                />
              ))}
            </div>
            <button
              type="submit"
              className="px-2.5 py-1.5 text-xs font-bold text-white bg-black hover:bg-zinc-800 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Chèn dòng vào Input ({activeTable.tableName})
            </button>
          </form>
        </div>

        {/* RIGHT PANE: SQL OUTPUT (Live Query Result Set vs Expected Output) */}
        <div className="p-3.5 sm:p-4 bg-white space-y-3 flex flex-col justify-between min-w-0">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-300 pb-2">
              <div className="text-xs sm:text-sm font-bold text-black flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-black shrink-0" />
                2. BẢNG KẾT QUẢ ĐẦU RA (SQL OUTPUT)
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOutputMode('actual')}
                  className={`px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer ${
                    outputMode === 'actual'
                      ? 'bg-black text-white border-black'
                      : 'bg-zinc-100 text-black border-zinc-400'
                  }`}
                >
                  Output của bạn ({liveSqlResult.rows.length} dòng)
                </button>
                <button
                  type="button"
                  onClick={() => setOutputMode('expected')}
                  className={`px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer ${
                    outputMode === 'expected'
                      ? 'bg-black text-white border-black'
                      : 'bg-zinc-100 text-black border-zinc-400'
                  }`}
                >
                  Output kỳ vọng ({expectedRows.length} dòng)
                </button>
              </div>
            </div>

            {outputMode === 'actual' ? (
              !currentQuery.trim() ? (
                <div className="p-6 bg-zinc-950 text-zinc-400 font-mono-tabular text-xs border border-zinc-900 min-h-[180px] flex items-center justify-center text-center">
                  Hãy nhập câu lệnh SELECT ... vào trình soạn thảo SQL bên dưới để xem bảng Output trực tiếp tại đây.
                </div>
              ) : liveSqlResult.error ? (
                <div className="p-4 bg-zinc-950 text-red-400 font-mono-tabular text-xs border border-zinc-900 min-h-[180px] space-y-1">
                  <div className="font-bold text-white">
                    [!] LỖI THỰC THI TRUY VẤN SQL:
                  </div>
                  <div>{liveSqlResult.error}</div>
                </div>
              ) : (
                <div className="overflow-x-auto bg-zinc-950 text-white border border-zinc-900 p-3 min-h-[180px] max-h-[240px] overflow-y-auto">
                  <table className="w-full border-collapse text-[11px] font-mono-tabular">
                    <thead>
                      <tr className="border-b border-zinc-700 text-left text-sky-400">
                        {liveSqlResult.columns.map((col) => (
                          <th key={col} className="py-1.5 pr-3">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {liveSqlResult.rows.map((r, rIdx) => (
                        <tr
                          key={rIdx}
                          className="border-b border-zinc-800 text-emerald-300"
                        >
                          {liveSqlResult.columns.map((col) => (
                            <td key={col} className="py-1.5 pr-3">
                              {String(r[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="overflow-x-auto bg-zinc-100 text-black border border-zinc-900 p-3 min-h-[180px] max-h-[240px] overflow-y-auto">
                <table className="w-full border-collapse text-[11px] font-mono-tabular">
                  <thead>
                    <tr className="border-b border-zinc-900 text-left text-zinc-700">
                      {expectedColumns.map((col) => (
                        <th key={col} className="py-1.5 pr-3">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {expectedRows.map((r, rIdx) => (
                      <tr key={rIdx} className="border-b border-zinc-300">
                        {expectedColumns.map((col) => (
                          <td key={col} className="py-1.5 pr-3 font-bold">
                            {String(r[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SQL Output Status Bar */}
          <div className="p-2.5 bg-zinc-100 border border-zinc-900 text-[11px] font-mono-tabular flex flex-wrap items-center justify-between gap-2">
            <span>
              Thời gian truy vấn: <strong>{liveSqlResult.elapsed}ms</strong> · Số bản ghi:{' '}
              <strong>{liveSqlResult.rows.length}</strong>
            </span>
            {isMatchingExpected ? (
              <span className="font-bold text-black flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />✓ KHỚP OUTPUT KỲ VỌNG
              </span>
            ) : (
              <span className="text-zinc-600">
                Đang chờ câu truy vấn khớp Output kỳ vọng
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
