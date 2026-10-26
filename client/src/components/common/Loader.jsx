import React, { useEffect, useState } from 'react';

/**
 * Loading primitives used across the storefront and admin console.
 *
 *  <BrandLoader />        Branded wordmark + indeterminate bar (page / route level)
 *  <Spinner />            Small ring spinner (buttons, inline)
 *  <InlineLoader />       Spinner with a label, for panels and lists
 *  <Skeleton />           Pulsing placeholder block
 *  <KpiSkeletonGrid />    Placeholder for a row of KPI cards
 *  <PanelSkeleton />      Placeholder for a content panel / table
 *
 * Loaders wait `delay` ms before appearing so that fast loads never flash.
 */

const useDelayedVisible = (delay) => {
  const [visible, setVisible] = useState(delay <= 0);

  useEffect(() => {
    if (delay <= 0) return undefined;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return visible;
};

export const Spinner = ({ size = 18, className = '', label = 'Loading' }) => (
  <svg
    role="status"
    aria-label={label}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`animate-spin ${className}`}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const BrandLoader = ({
  fullScreen = false,
  label = 'Loading',
  delay = 120,
  className = '',
}) => {
  const visible = useDelayedVisible(delay);

  const wrapper = fullScreen
    ? 'fixed inset-0 z-[100] bg-charcoal'
    : 'w-full min-h-[60vh]';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`${wrapper} flex items-center justify-center ${className}`}
    >
      {visible && (
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="text-center">
            <span className="block font-editorial-display text-2xl sm:text-3xl tracking-editorial text-snow pl-[0.35em]">
              WINTERWEAR
            </span>
            <span className="block mt-1.5 text-[9px] uppercase tracking-[0.5em] text-silver/70 pl-[0.5em]">
              Haute Outerwear
            </span>
          </div>

          <div className="ww-loader-track" aria-hidden="true">
            <span className="ww-loader-bar" />
          </div>

          <p className="text-[10px] uppercase tracking-widest text-silver h-3">{label}</p>
        </div>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
};

export const InlineLoader = ({ label = 'Loading', className = '', delay = 120 }) => {
  const visible = useDelayedVisible(delay);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 py-16 text-silver ${className}`}
    >
      {visible && (
        <>
          <Spinner size={26} className="text-burgundy" label={label} />
          <span className="text-xs tracking-wide">{label}…</span>
        </>
      )}
    </div>
  );
};

export const Skeleton = ({ className = '' }) => (
  <div aria-hidden="true" className={`animate-pulse rounded bg-white/[0.06] ${className}`} />
);

export const KpiSkeletonGrid = ({ count = 4, className = '' }) => (
  <div
    role="status"
    aria-label="Loading metrics"
    className={`grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 ${className}`}
  >
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="bg-[#1F2226] border border-white/10 rounded p-5 flex items-start gap-4"
      >
        <Skeleton className="w-10 h-10 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-2.5 w-32" />
        </div>
      </div>
    ))}
  </div>
);

export const PanelSkeleton = ({ rows = 5, className = '' }) => (
  <div
    role="status"
    aria-label="Loading content"
    className={`bg-[#1F2226] border border-white/10 rounded ${className}`}
  >
    <div className="px-5 py-4 border-b border-white/10">
      <Skeleton className="h-3 w-40" />
    </div>
    <div className="p-5 space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  </div>
);

export default BrandLoader;
