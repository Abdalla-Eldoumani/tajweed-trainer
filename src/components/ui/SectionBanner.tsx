import { cn } from "@/lib/utils";

interface SectionBannerProps {
  title: string;
  subtitle?: string;
  color?: string;
  className?: string;
}

export function SectionBanner({ title, subtitle, color, className }: SectionBannerProps) {
  return (
    <div className={cn("section-banner", className)}>
      <h2 className="relative z-10 font-heading font-semibold text-h3 sm:text-h2 flex items-center justify-center gap-2">
        {color && (
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: color }}
            aria-hidden="true"
          />
        )}
        {title}
      </h2>
      {subtitle && (
        <p className="relative z-10 font-arabic text-micro sm:text-small mt-0.5 opacity-90" dir="rtl" lang="ar">
          {subtitle}
        </p>
      )}
    </div>
  );
}
