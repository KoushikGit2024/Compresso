import React from 'react';

interface Props {
  className?: string;
}

/** Compresso logo as inline SVG so it follows the light/dark theme via Tailwind `dark:` classes. */
export const Logo: React.FC<Props> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Compresso logo" role="img">
    <rect
      width="512"
      height="512"
      rx="100"
      className="fill-white dark:fill-zinc-900 stroke-zinc-200 dark:stroke-zinc-700"
      strokeWidth="8"
    />
    {/* Outer boundary (original size) */}
    <rect
      x="106"
      y="106"
      width="300"
      height="300"
      rx="32"
      strokeWidth="12"
      strokeDasharray="24 24"
      fill="none"
      className="stroke-slate-300 dark:stroke-zinc-600"
    />
    {/* Mid boundary ("C" shape) */}
    <path
      d="M 346 220 V 190 A 24 24 0 0 0 322 166 H 190 A 24 24 0 0 0 166 190 V 322 A 24 24 0 0 0 190 346 H 322 A 24 24 0 0 0 346 322 V 292"
      strokeWidth="12"
      strokeLinecap="round"
      fill="none"
      className="stroke-slate-500 dark:stroke-zinc-400"
    />
    {/* Core (compressed output) */}
    <rect x="216" y="216" width="80" height="80" rx="16" className="fill-emerald-500 dark:fill-emerald-400" />
    {/* Compression vectors */}
    <g
      strokeWidth="12"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      className="stroke-emerald-500 dark:stroke-emerald-400"
    >
      <path d="M 120 120 L 180 180 M 180 180 L 180 145 M 180 180 L 145 180" />
      <path d="M 392 392 L 332 332 M 332 332 L 332 367 M 332 332 L 367 332" />
    </g>
  </svg>
);
