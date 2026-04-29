import { cn } from "@/lib/utils";

interface MushafFrameProps {
  children: React.ReactNode;
  className?: string;
}

// Multi-layer ornate Mushaf-style frame: outer gold rule, multi-color
// geometric band (red/blue/gold), inner gold rule, content area.
// The decorative styling lives in globals.css under `.mushaf-frame`.
export function MushafFrame({ children, className }: MushafFrameProps) {
  return (
    <div className={cn("mushaf-frame", className)}>
      <div className="relative islamic-pattern-bg rounded-md p-5 sm:p-8">
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
