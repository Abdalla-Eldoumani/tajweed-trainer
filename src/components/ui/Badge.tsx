import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  className?: string;
}

export function Badge({ children, color, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        !color && "bg-primary/10 text-primary dark:bg-primary-light/20 dark:text-primary-light",
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
