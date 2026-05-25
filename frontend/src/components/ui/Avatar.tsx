import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  url?: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

export function Avatar({ url, alt, size = 'md', className }: AvatarProps) {
  const [errored, setErrored] = React.useState(false);

  if (url && !errored) {
    return (
      <img
        src={url}
        alt={alt}
        className={cn(
          'rounded-full bg-neutral-100 object-cover',
          SIZE_CLASSES[size],
          className,
        )}
        onError={() => setErrored(true)}
        loading="lazy"
      />
    );
  }

  // Fallback: iniciais em circle com cor brand
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-brand-orange/10 font-display text-sm font-bold text-brand-orange',
        SIZE_CLASSES[size],
        className,
      )}
      aria-label={alt}
    >
      {initials(alt)}
    </div>
  );
}
