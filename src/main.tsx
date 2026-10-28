import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-black p-6 flex items-center justify-center font-mono-tabular">
          <div className="max-w-lg w-full border-2 border-black p-6 space-y-4">
            <h1 className="text-lg font-bold text-black">
              THPT QT-Tin THPT — Khôi phục giao diện
            </h1>
            <p className="text-xs text-zinc-700">
              Đã phát hiện dữ liệu bộ nhớ đệm cũ trên trình duyệt. Nhấn nút bên dưới để làm mới trang:
            </p>
            <pre className="p-2.5 bg-zinc-100 border border-zinc-400 text-[11px] overflow-x-auto">
              {this.state.errorMessage}
            </pre>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.clear();
                } catch {
                  // ignore storage restriction
                }
                window.location.reload();
              }}
              className="px-4 py-2 text-xs font-bold bg-black text-white cursor-pointer"
            >
              Tải lại ứng dụng →
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  );
}
