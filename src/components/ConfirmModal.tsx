import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title = 'Confirmation',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl theme-panel p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              danger
                ? 'bg-red-500/15 text-red-500'
                : 'theme-accent-bg'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-base theme-ink">
            {title}
          </h3>
        </div>

        <p className="text-xs theme-muted leading-relaxed mb-5">
          {message}
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-3 rounded-xl theme-panel2 text-xs font-semibold theme-ink hover:opacity-80 transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-white shadow-sm transition active:scale-95 cursor-pointer ${
              danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'theme-accent-bg'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
