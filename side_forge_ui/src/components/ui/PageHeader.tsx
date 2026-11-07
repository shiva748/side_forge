import React from 'react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between pb-6 border-b border-slate-200/80',
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 truncate">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {badge && <div className="shrink-0 flex items-center">{badge}</div>}
        </div>
        {description && (
          <p className="text-sm text-slate-500 max-w-2xl">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
};
