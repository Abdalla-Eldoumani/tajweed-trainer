import { cn } from "@/lib/utils";

interface OrnamentProps {
  className?: string;
}

// Procedural Islamic geometric ornaments. All paths are constructed from
// symmetric mathematical primitives (8-pointed star, 12-petal rosette,
// nested diamond chains), derivable shapes, not copies of any specific
// Mushaf decoration.

export function CornerCartouche({ className }: OrnamentProps) {
  return (
    <svg
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("text-gold-dark dark:text-gold-light", className)}
    >
      <rect x="3" y="3" width="50" height="50" rx="6" stroke="currentColor" strokeWidth="1" />
      <rect x="6" y="6" width="44" height="44" rx="3" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      <path
        d="M28 12 L33 23 L45 23 L35 30 L39 42 L28 35 L17 42 L21 30 L11 23 L23 23 Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="0.7"
      />
    </svg>
  );
}

export function DividerOrnament({ className }: OrnamentProps) {
  return (
    <svg
      viewBox="0 0 60 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("text-gold dark:text-gold-light", className)}
    >
      <line x1="0" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="0.6" />
      <line x1="38" y1="6" x2="60" y2="6" stroke="currentColor" strokeWidth="0.6" />
      <path
        d="M30 1 L33 5 L37 6 L33 7 L30 11 L27 7 L23 6 L27 5 Z"
        fill="currentColor"
        fillOpacity="0.4"
        stroke="currentColor"
        strokeWidth="0.5"
      />
    </svg>
  );
}

export function MedallionOrnament({ className }: OrnamentProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("text-gold dark:text-gold-light", className)}
    >
      <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="100" cy="100" r="65" stroke="currentColor" strokeWidth="0.7" opacity="0.6" />
      <circle cx="100" cy="100" r="40" stroke="currentColor" strokeWidth="0.7" opacity="0.7" />
      {/* 12-pointed star. Coordinates are rounded so Node (server) and the
          browser (client) serialize identical strings; trig differs in the last
          float ULP between V8 builds, which otherwise trips a hydration mismatch. */}
      <g stroke="currentColor" strokeWidth="0.6" fill="none" opacity="0.7">
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const r = (n: number) => Math.round(n * 1000) / 1000;
          const x1 = r(100 + Math.cos(a) * 25);
          const y1 = r(100 + Math.sin(a) * 25);
          const x2 = r(100 + Math.cos(a) * 80);
          const y2 = r(100 + Math.sin(a) * 80);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      {/* Inner 8-pointed star */}
      <path
        d="M100 60 L108 85 L135 85 L113 100 L122 125 L100 110 L78 125 L87 100 L65 85 L92 85 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="0.7"
      />
    </svg>
  );
}

export function OrnamentalDivider({ className }: OrnamentProps) {
  return (
    <div className={cn("flex items-center gap-3 text-gold dark:text-gold-light", className)} aria-hidden="true">
      <span className="flex-1 h-px bg-current opacity-40" />
      <svg viewBox="0 0 28 12" width="28" height="12" fill="none">
        <path
          d="M14 1 L17 5 L23 6 L17 7 L14 11 L11 7 L5 6 L11 5 Z"
          fill="currentColor"
          fillOpacity="0.45"
          stroke="currentColor"
          strokeWidth="0.6"
        />
      </svg>
      <span className="flex-1 h-px bg-current opacity-40" />
    </div>
  );
}

export function MushafIcon({ className }: OrnamentProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {/* Open book with crescent */}
      <path d="M3 6 C3 5 4 4 5 4 L11 4 L11 20 L5 20 C4 20 3 19 3 18 Z" />
      <path d="M21 6 C21 5 20 4 19 4 L13 4 L13 20 L19 20 C20 20 21 19 21 18 Z" />
      <path d="M7 8 L9 8 M7 11 L9 11 M15 8 L17 8 M15 11 L17 11" opacity="0.5" />
      <circle cx="12" cy="14.5" r="1.4" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}
