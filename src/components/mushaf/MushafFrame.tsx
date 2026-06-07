import { cn } from "@/lib/utils";

interface MushafFrameProps {
  children: React.ReactNode;
  className?: string;
}

// Mushaf-style frame: a quiet double gold rule (outer rule plus an inner
// hairline) with a single 8-point star at the head corner. The decorative
// styling lives in globals.css under `.mushaf-frame`.
export function MushafFrame({ children, className }: MushafFrameProps) {
  return (
    <div className={cn("mushaf-frame", className)}>
      <div className="relative islamic-pattern-bg rounded-md p-5 sm:p-8">
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}
