import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  // Quiet status tint for state pills (memorized, in review). Used once per
  // surface (DESIGN_SYSTEM section 6 / section 3 "one accent"). Ignored when a
  // `color` swatch is set, since that path carries its own explicit color.
  tone?: "default" | "accent";
  className?: string;
}

export function Badge({ children, color, tone = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-micro font-medium",
        // Default badge: quiet subtle fill, muted micro label (DESIGN_SYSTEM
        // section 6). The accent tone is a low-opacity ochre tint for status.
        !color && tone === "default" && "bg-bg-subtle text-text-muted dark:bg-bg-subtle-dark",
        !color && tone === "accent" && "bg-accent/10 text-accent",
        className
      )}
      style={color ? { backgroundColor: `${color}20`, color } : undefined}
      role="status"
    >
      {color && (
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
