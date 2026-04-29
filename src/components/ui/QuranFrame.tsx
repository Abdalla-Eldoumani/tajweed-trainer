import { cn } from "@/lib/utils";

interface QuranFrameProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "p-3",
  md: "p-4 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function QuranFrame({ children, className, size = "md" }: QuranFrameProps) {
  return (
    <div
      className={cn(
        "quran-frame islamic-pattern-bg",
        sizeClasses[size],
        className
      )}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
