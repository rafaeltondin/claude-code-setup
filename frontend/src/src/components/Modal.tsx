// Modal reutilizavel com overlay, animacao e footer padronizado
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Conteudo */}
      <div
        className={`relative w-full ${SIZE_CLASSES[size]} rounded-lg shadow-2xl max-h-[90vh] flex flex-col`}
        style={{
          animation: 'modalFadeIn 0.15s ease',
          background: '#16161f',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h2 id="modal-title" className="text-[17px] font-semibold text-[#f0f0f5]">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[#6a6a7a] hover:text-[#f0f0f5] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
              aria-label="Fechar modal"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-end gap-3 px-6 py-4 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
