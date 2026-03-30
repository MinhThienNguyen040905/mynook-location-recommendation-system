import { cn } from '@/lib/utils';

/* ── Isometric 3D cube SVG ───────────────────────────────────── */
function CubeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top face */}
      <polygon points="50,8 86,29 50,50 14,29" fill="currentColor" />
      {/* Front-left face */}
      <polygon points="14,29 50,50 50,92 14,71" fill="currentColor" />
      {/* Front-right face */}
      <polygon points="86,29 86,71 50,92 50,50" fill="currentColor" />
      {/* White Y lines separating the 3 faces */}
      <line x1="50" y1="50" x2="50"  y2="8"  stroke="white" strokeWidth="5" strokeLinecap="round" />
      <line x1="50" y1="50" x2="14"  y2="71" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <line x1="50" y1="50" x2="86"  y2="71" stroke="white" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/* ── NookLogo — cube + "MyNook" in Work Sans ─────────────────── */
interface NookLogoProps {
  /** Size of the cube icon in px */
  size?: 'sm' | 'md' | 'lg';
  /** Override className for the wrapper */
  className?: string;
  /** Show only the cube without text */
  iconOnly?: boolean;
  /** Color variant */
  variant?: 'orange' | 'white';
}

const SIZE_MAP = {
  sm: { cube: 'size-7',  text: 'text-lg'  },
  md: { cube: 'size-9',  text: 'text-2xl' },
  lg: { cube: 'size-12', text: 'text-3xl' },
};

export function NookLogo({
  size = 'md',
  className,
  iconOnly = false,
  variant = 'orange',
}: NookLogoProps) {
  const { cube, text } = SIZE_MAP[size];
  const color = variant === 'white' ? 'text-white' : 'text-nook-olive';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <CubeIcon className={cn(cube, color)} />
      {!iconOnly && (
        <span
          className={cn(text, 'font-bold tracking-tight', color)}
          style={{ fontFamily: 'var(--font-worksans)' }}
        >
          MyNook
        </span>
      )}
    </div>
  );
}
