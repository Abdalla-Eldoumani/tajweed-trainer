import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-gold disabled:pointer-events-none disabled:opacity-50",
          {
            // Filled actions read as lapis ink on vellum; on the night theme
            // they flip to gold leaf with navy ink, the manuscript's own
            // figure-ground inversion.
            "bg-primary text-on-primary hover:bg-primary-weak dark:bg-gold dark:text-ink dark:hover:bg-gold-deep":
              variant === "primary",
            "bg-primary-light/15 text-primary hover:bg-primary-light/25 dark:bg-gold/15 dark:text-gold-light dark:hover:bg-gold/25":
              variant === "secondary",
            "hover:bg-bg-subtle dark:hover:bg-bg-subtle-dark": variant === "ghost",
            "border border-primary/60 text-primary hover:bg-primary hover:text-on-primary dark:border-gold/60 dark:text-gold-light dark:hover:bg-gold dark:hover:text-ink":
              variant === "outline",
          },
          {
            "h-11 px-3 text-sm": size === "sm",
            "h-11 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
