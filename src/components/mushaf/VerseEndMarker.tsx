import { toArabicIndic } from "@/lib/utils";

interface VerseEndMarkerProps {
  ayahNumber: number;
}

// Inline 8-pointed star verse marker, sized to flow with the line of Arabic text.
export function VerseEndMarker({ ayahNumber }: VerseEndMarkerProps) {
  return (
    <span
      className="inline-flex items-center justify-center align-middle mx-1 select-none"
      aria-label={`Ayah ${ayahNumber}`}
    >
      <svg width="30" height="30" viewBox="0 0 30 30" className="text-gold-dark dark:text-gold-light">
        <circle cx="15" cy="15" r="13" fill="none" stroke="currentColor" strokeWidth="0.7" />
        <path
          d="M15 2 L18 11 L27 12 L20 18 L23 27 L15 22 L7 27 L10 18 L3 12 L12 11 Z"
          fill="currentColor"
          fillOpacity="0.12"
          stroke="currentColor"
          strokeWidth="0.6"
        />
        <text
          x="15"
          y="19"
          textAnchor="middle"
          fontSize="11"
          fill="currentColor"
          className="font-quran"
        >
          {toArabicIndic(ayahNumber)}
        </text>
      </svg>
    </span>
  );
}
