import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  Info,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export const LoadingState: React.FC<{ label?: string; className?: string }> = ({
  label = 'Loading data...',
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-2.5 py-12 text-slate-500',
      className
    )}
  >
    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
    <p className="text-xs font-medium">{label}</p>
  </div>
);

export const FullScreenLoader: React.FC<{ label?: string }> = ({
  label = 'Restoring your workspace...',
}) => (
  <div className="min-h-screen bg-stone-50/50 flex flex-col items-center justify-center p-6">
    <div className="flex flex-col items-center gap-3.5">
      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
        <span className="font-extrabold text-sm tracking-tight">SF</span>
      </div>
      <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
        <span>{label}</span>
      </div>
    </div>
  </div>
);

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center py-8 px-4',
      className
    )}
  >
    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
      {icon || <FolderOpen className="w-5 h-5" />}
    </div>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    {description && (
      <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load content',
  message,
  onRetry,
  className,
}) => (
  <div
    className={cn(
      'rounded-2xl border border-rose-200/80 bg-rose-50/40 p-6 text-center flex flex-col items-center',
      className
    )}
  >
    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
      <AlertCircle className="w-5 h-5" />
    </div>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <p className="text-xs text-slate-600 max-w-md mt-1 leading-relaxed">{message}</p>
    {onRetry && (
      <div className="mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try again
        </Button>
      </div>
    )}
  </div>
);

export interface InlineAlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  variant = 'info',
  title,
  children,
  className,
}) => {
  const styles = {
    info: 'border-indigo-200/80 bg-indigo-50/50 text-indigo-900',
    success: 'border-emerald-200/80 bg-emerald-50/50 text-emerald-900',
    warning: 'border-amber-200/80 bg-amber-50/50 text-amber-900',
    error: 'border-rose-200/80 bg-rose-50/50 text-rose-900',
  };
  const icons = {
    info: <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
  };

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed',
        styles[variant],
        className
      )}
    >
      {icons[variant]}
      <div className="space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
};
