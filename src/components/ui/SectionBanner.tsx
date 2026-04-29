import { cn } from "@/lib/utils";

interface SectionBannerProps {
  title: string;
  subtitle?: string;
  color?: string;
  className?: string;
}

export function SectionBanner({ title, subtitle, color, className }: SectionBannerProps) {
  return (
    <div
      className={cn("section-banner", className)}
      style={color ? { background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` } : undefined}
    >
      <h2 className="relative z-10 font-heading font-bold text-sm sm:text-base">
        {title}
      </h2>
      {subtitle && (
        <p className="relative z-10 font-arabic text-xs sm:text-sm mt-0.5 opacity-90" dir="rtl" lang="ar">
          {subtitle}
        </p>
      )}
    </div>
  );
}
