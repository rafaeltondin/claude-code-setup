// Sistema de Toast Notifications
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToast, type Toast } from '../contexts/ToastContext';


const ICONS = {
  success: <CheckCircle size={18} />,
  error: <XCircle size={18} />,
  info: <Info size={18} />,
  warning: <AlertTriangle size={18} />,
};

const COLORS = {
  success: 'border-green-500 bg-green-500/10 text-green-400',
  error: 'border-red-500 bg-red-500/10 text-red-400',
  info: 'border-[#7c6aef] bg-[rgba(124,106,239,0.1)] text-[#9080f5]',
  warning: 'border-orange-400 bg-orange-400/10 text-orange-400',
};

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToast();

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg min-w-[300px] max-w-sm animate-[fadeIn_0.2s_ease] ${COLORS[toast.type]}`}
      role="alert"
    >
      <span className="mt-0.5 shrink-0">{ICONS[toast.type]}</span>
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        onClick={() => {
          console.log('[Toast] Fechando manualmente', { id: toast.id });
          removeToast(toast.id);
        }}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fechar notificação"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
