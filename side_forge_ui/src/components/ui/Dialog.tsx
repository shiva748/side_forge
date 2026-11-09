import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TruncatedText } from './TruncatedText';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

let activeDialogCount = 0;
let savedBodyOverflow = '';

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
}) => {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    if (activeDialogCount === 0) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    activeDialogCount += 1;

    return () => {
      activeDialogCount = Math.max(0, activeDialogCount - 1);
      if (activeDialogCount === 0) {
        document.body.style.overflow = savedBodyOverflow;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8 bg-slate-900/40 backdrop-blur-xs overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          'relative flex flex-col w-full max-h-[85vh] rounded-2xl border border-slate-200/90 bg-white shadow-2xl overflow-hidden',
          maxWidthClass
        )}
      >
        {/* Pinned Header */}
        <div className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 sm:px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-base font-semibold text-slate-900 leading-snug min-w-0"
            >
              <TruncatedText text={title} as="div" />
            </h2>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 sm:py-5 text-sm text-slate-700">
          {children}
        </div>

        {/* Pinned Footer */}
        {footer && (
          <div className="shrink-0 flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 sm:px-6 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

