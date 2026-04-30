import React from 'react';
import { clsx } from 'clsx';

interface SystemLogoProps {
  showText?: boolean;
  compact?: boolean;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
}

const backendBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const logoSrc = `${backendBaseUrl}/yunafied%20logo.png`;

export function SystemLogo({
  showText = true,
  compact = false,
  className,
  imageClassName,
  textClassName,
}: SystemLogoProps) {
  return (
    <div className={clsx('flex items-center gap-3', compact && 'gap-2', className)}>
      <div
        className={clsx(
          'flex items-center justify-center shrink-0 rounded-xl bg-white shadow-lg shadow-black/10 border border-gray-200',
          compact ? 'h-8 w-8 p-1' : 'h-11 w-11 p-1.5',
        )}
      >
        <img
          src={logoSrc}
          alt="YUNAFied logo"
          className={clsx('object-contain rounded-lg', compact ? 'h-full w-full' : 'h-full w-full', imageClassName)}
        />
      </div>
      {showText && (
        <div className={clsx('min-w-0', textClassName)}>
          <h1 className={clsx('font-bold tracking-tight leading-none', compact ? 'text-base' : 'text-xl md:text-2xl')}>
            YUNAFied
          </h1>
          {!compact && <p className="text-xs text-inherit opacity-80">AI-Powered Tutorial Management System</p>}
        </div>
      )}
    </div>
  );
}
