import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

export interface TruncatedTextProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Explicit string text to render and display in the tooltip when truncated.
   * If omitted, `children` (when string/number) is used.
   */
  text?: string | number | null;
  /**
   * HTML tag to render (`span` by default).
   */
  as?: 'span' | 'div' | 'p' | 'strong';
  /**
   * Delay in ms before showing tooltip on hover (default: 200ms).
   */
  delayMs?: number;
  /**
   * Optional maximum width utility class (e.g. `max-w-[200px]`).
   */
  maxWidthClass?: string;
}

interface TooltipCoords {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({
  text,
  as: Component = 'span',
  delayMs = 200,
  maxWidthClass,
  className,
  children,
  ...rest
}) => {
  const elRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const touchTimerRef = useRef<number | null>(null);
  const tooltipId = useId();

  const [isTruncated, setIsTruncated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);

  const resolvedText =
    text !== undefined && text !== null
      ? String(text)
      : typeof children === 'string' || typeof children === 'number'
      ? String(children)
      : '';

  const checkTruncation = useCallback((): boolean => {
    const el = elRef.current;
    if (!el) return false;
    const truncated =
      el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
    setIsTruncated(truncated);
    return truncated;
  }, []);

  const computeCoords = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const placeAbove = rect.top > 56;
    const rawLeft = rect.left + rect.width / 2;
    const clampedLeft = Math.max(16, Math.min(window.innerWidth - 16, rawLeft));
    setCoords({
      top: placeAbove ? rect.top - 8 : rect.bottom + 8,
      left: clampedLeft,
      placement: placeAbove ? 'top' : 'bottom',
    });
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (touchTimerRef.current !== null) {
      window.clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    checkTruncation();
  }, [resolvedText, children, checkTruncation]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => {
      setIsOpen(false);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    rest.onMouseEnter?.(e);
    clearTimers();
    if (!resolvedText) return;
    const truncated = checkTruncation();
    if (!truncated) {
      setIsOpen(false);
      return;
    }
    timerRef.current = window.setTimeout(() => {
      computeCoords();
      setIsOpen(true);
    }, delayMs);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    rest.onMouseLeave?.(e);
    clearTimers();
    setIsOpen(false);
  };

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    rest.onFocus?.(e);
    if (!resolvedText) return;
    const truncated = checkTruncation();
    if (truncated) {
      computeCoords();
      setIsOpen(true);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    rest.onBlur?.(e);
    clearTimers();
    setIsOpen(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    rest.onTouchStart?.(e);
    if (!resolvedText) return;
    const truncated = checkTruncation();
    if (truncated) {
      computeCoords();
      setIsOpen(true);
      clearTimers();
      touchTimerRef.current = window.setTimeout(() => {
        setIsOpen(false);
      }, 2400);
    }
  };

  return (
    <>
      <Component
        ref={elRef as React.Ref<never>}
        aria-describedby={isOpen && isTruncated ? tooltipId : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onTouchStart={handleTouchStart}
        className={cn(
          'truncate min-w-0',
          Component === 'span' || Component === 'strong' ? 'inline-block align-bottom' : 'block',
          maxWidthClass,
          className
        )}
        {...rest}
      >
        {children !== undefined ? children : resolvedText}
      </Component>

      {isOpen &&
        isTruncated &&
        resolvedText &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              transform:
                coords.placement === 'top'
                  ? 'translate(-50%, -100%)'
                  : 'translate(-50%, 0)',
              zIndex: 9999,
            }}
            className="pointer-events-none max-w-xs sm:max-w-sm rounded-lg bg-slate-900/95 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-white shadow-lg border border-slate-700/80 break-words"
          >
            {resolvedText}
          </div>,
          document.body
        )}
    </>
  );
};
