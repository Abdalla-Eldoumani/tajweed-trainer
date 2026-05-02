import type { ComponentType } from "react";

export const MODULES = [
  { id: "makharij", label: "Makharij", labelAr: "مخارج الحروف" },
  { id: "noon-sakinah", label: "Noon Sakinah", labelAr: "النون الساكنة" },
  { id: "meem-sakinah", label: "Meem Sakinah", labelAr: "الميم الساكنة" },
  { id: "ghunnah", label: "Ghunnah", labelAr: "الغنّة" },
  { id: "qalqalah", label: "Qalqalah", labelAr: "القلقلة" },
  { id: "madd", label: "Madd", labelAr: "المدّ" },
  { id: "laam-raa", label: "Laam & Raa", labelAr: "اللام والراء" },
  { id: "tafkheem-tarqeeq", label: "Heavy & Light", labelAr: "التفخيم والترقيق" },
  { id: "waqf", label: "Waqf", labelAr: "الوقف" },
];

export interface NavItem {
  href: string;
  label: string;
  labelAr: string;
  icon: ComponentType<{ className?: string }>;
  expandable?: boolean;
}

export function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function PracticeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export function MushafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6 C3 5 4 4 5 4 L11 4 L11 20 L5 20 C4 20 3 19 3 18 Z" />
      <path d="M21 6 C21 5 20 4 19 4 L13 4 L13 20 L19 20 C20 20 21 19 21 18 Z" />
      <path d="M7 8 L9 8 M7 11 L9 11 M15 8 L17 8 M15 11 L17 11" opacity="0.6" />
    </svg>
  );
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", labelAr: "الرئيسية", icon: HomeIcon },
  { href: "/learn", label: "Learn", labelAr: "تعلّم", icon: BookIcon, expandable: true },
  { href: "/mushaf", label: "Mushaf", labelAr: "المصحف", icon: MushafIcon },
  { href: "/practice", label: "Practice", labelAr: "تدريب", icon: PracticeIcon },
  { href: "/search", label: "Search", labelAr: "بحث", icon: SearchIcon },
  { href: "/progress", label: "Progress", labelAr: "تقدّم", icon: ProgressIcon },
  { href: "/settings", label: "Settings", labelAr: "إعدادات", icon: SettingsIcon },
];
