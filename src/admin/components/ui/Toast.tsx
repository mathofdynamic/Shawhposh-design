import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast viewport: Bottom-left on RTL screens */}
      <div
        aria-live="polite"
        className="fixed bottom-5 left-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const typeIcons: Record<ToastType, React.ReactNode> = {
            success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
            info: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
          };

          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto bg-[#1a1918] border border-white/15 rounded-2xl p-4 shadow-2xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200"
            >
              <div className="flex items-start gap-3">
                {typeIcons[toast.type]}
                <div className="space-y-0.5 text-right">
                  <h4 className="text-xs font-bold text-white">{toast.title}</h4>
                  {toast.message && <p className="text-[11px] text-gray-400 leading-relaxed font-sans">{toast.message}</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="بستن اعلان"
                className="text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
