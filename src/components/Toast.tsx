import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

function ToastCard({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [toast.id, duration, onDismiss]);

  const configs = {
    success: { icon: CheckCircle, bg: 'bg-emerald-50', border: 'border-emerald-200', icon_color: 'text-emerald-600', bar: 'bg-emerald-500', title_color: 'text-emerald-800' },
    error: { icon: XCircle, bg: 'bg-red-50', border: 'border-red-200', icon_color: 'text-red-600', bar: 'bg-red-500', title_color: 'text-red-800' },
    warning: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', icon_color: 'text-amber-600', bar: 'bg-amber-500', title_color: 'text-amber-800' },
    info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', icon_color: 'text-blue-600', bar: 'bg-blue-500', title_color: 'text-blue-800' },
  };

  const cfg = configs[toast.type];
  const Icon = cfg.icon;

  return (
    <div className={`w-80 rounded-xl border shadow-lg overflow-hidden ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-start gap-3 p-4">
        <Icon size={18} className={`${cfg.icon_color} shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm ${cfg.title_color}`}>{toast.title}</div>
          {toast.message && <div className="text-xs text-slate-600 mt-0.5">{toast.message}</div>}
        </div>
        <button onClick={() => onDismiss(toast.id)} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
          <X size={14} />
        </button>
      </div>
      <div className="h-1 bg-slate-200">
        <div
          className={`h-1 transition-all ease-linear ${cfg.bar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  return { toasts, dismiss, addToast };
}
