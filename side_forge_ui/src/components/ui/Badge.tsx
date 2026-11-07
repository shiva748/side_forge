import React from 'react';
import { cn } from '../../lib/utils';
import { TruncatedText } from './TruncatedText';

export type BadgeVariant =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export type BadgeShape = 'badge' | 'pill' | 'counter' | 'tag' | 'id';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  shape?: BadgeShape;
  dot?: boolean;
  maxWidthClass?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-100/90 text-slate-700 border-slate-200/80',
  primary: 'bg-indigo-50/80 text-indigo-700 border-indigo-200/70',
  success: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/70',
  warning: 'bg-amber-50/80 text-amber-800 border-amber-200/70',
  danger: 'bg-rose-50/80 text-rose-700 border-rose-200/70',
  info: 'bg-sky-50/80 text-sky-700 border-sky-200/70',
};

const dotStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-400',
  primary: 'bg-indigo-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
};

const shapeStyles: Record<BadgeShape, string> = {
  badge: 'rounded-md px-2 py-0.5 text-[11px] font-medium leading-4',
  pill: 'rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-4',
  counter:
    'rounded-md px-2 py-0.5 text-[11px] font-medium leading-4 tabular-nums',
  tag: 'rounded-md px-2 py-0.5 text-[11px] font-medium leading-4',
  id: 'rounded px-1.5 py-0.5 font-mono text-[11px] font-medium leading-4',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  shape = 'badge',
  dot = false,
  maxWidthClass = 'max-w-[220px]',
  className,
  children,
  ...props
}) => {
  const isSimpleText =
    typeof children === 'string' || typeof children === 'number';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border whitespace-nowrap shrink-0 align-middle',
        shapeStyles[shape],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])}
        />
      )}
      {isSimpleText ? (
        <TruncatedText
          text={String(children)}
          maxWidthClass={maxWidthClass}
          className="leading-4"
        />
      ) : (
        children
      )}
    </span>
  );
};

export interface CounterLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  count: number | string;
  label?: string;
}

/**
 * Compact, single-line counter label that never wraps vertically or competes with headings.
 */
export const CounterLabel: React.FC<CounterLabelProps> = ({
  count,
  label,
  className,
  ...props
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-slate-100/80 px-2 py-0.5 text-[11px] font-medium leading-4 text-slate-600 whitespace-nowrap shrink-0 tabular-nums',
      className
    )}
    {...props}
  >
    <span className="font-semibold text-slate-800">{count}</span>
    {label && <span>{label}</span>}
  </span>
);

export interface RoleTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  code?: string;
  maxWidthClass?: string;
}

/**
 * Subtle neutral tag for role names.
 */
export const RoleTag: React.FC<RoleTagProps> = ({
  label,
  code,
  maxWidthClass = 'max-w-[180px]',
  className,
  ...props
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-slate-100/70 px-2 py-0.5 text-[11px] font-medium leading-4 text-slate-700 whitespace-nowrap shrink-0',
      className
    )}
    {...props}
  >
    <TruncatedText
      text={code ? `${label} (${code})` : label}
      maxWidthClass={maxWidthClass}
      className="leading-4"
    >
      {label}
    </TruncatedText>
    {code && (
      <span className="font-mono text-[10px] text-slate-500">({code})</span>
    )}
  </span>
);

export interface IdLabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

/**
 * Small, understated monospace label for organization or request identifiers.
 */
export const IdLabel: React.FC<IdLabelProps> = ({
  className,
  children,
  ...props
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded border border-slate-200/80 bg-slate-100/80 px-1.5 py-0.5 font-mono text-[11px] font-medium leading-4 text-slate-600 whitespace-nowrap shrink-0',
      className
    )}
    {...props}
  >
    {children}
  </span>
);

