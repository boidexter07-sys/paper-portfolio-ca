'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; message: string; tone?: 'positive' | 'negative' | 'info' };
type Ctx = { push: (message: string, tone?: Toast['tone']) => void };

const ToastContext = createContext<Ctx>({ push: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast['tone'] = 'positive') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-[60] space-y-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pv-card px-4 py-3 max-w-xs shadow-modal pointer-events-auto ${
              t.tone === 'negative' ? 'border-negative/40' : t.tone === 'info' ? 'border-info/40' : 'border-positive/40'
            }`}
          >
            <p className="text-body-sm text-ink">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
