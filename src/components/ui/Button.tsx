import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "icon";
type ButtonSize = "sm" | "md" | "lg";

type ButtonBaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  size?: ButtonSize;
  "aria-label"?: string;
};

// An icon-only button carries no text, so it MUST declare an accessible name.
// The type splits the icon variant out and requires aria-label or
// aria-labelledby; omitting both fails the build (DESIGN_SYSTEM section 6/9).
type IconLabel =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

type ButtonProps =
  | (ButtonBaseProps & { variant?: Exclude<ButtonVariant, "icon"> })
  | (Omit<ButtonBaseProps, "aria-label"> & { variant: "icon" } & IconLabel);

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const isIcon = variant === "icon";
    // outline is kept as an alias of the design-system secondary (outline) so
    // existing variant="outline" call sites render the single outline style.
    const isOutline = variant === "secondary" || variant === "outline";

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            // Filled actions read as lapis ink on vellum; on the night theme
            // they flip to gold leaf with navy ink, the manuscript's own
            // figure-ground inversion.
            "bg-primary text-on-primary hover:bg-primary-weak dark:bg-gold dark:text-ink dark:hover:bg-gold-deep":
              variant === "primary",
            // One outline style for secondary and the outline alias: a neutral
            // 1px border, ink label, quiet bg-subtle hover.
            "border border-border text-text hover:bg-bg-subtle dark:text-text-dark dark:hover:bg-bg-subtle-dark":
              isOutline,
            "text-text hover:bg-bg-subtle dark:text-text-dark dark:hover:bg-bg-subtle-dark":
              variant === "ghost" || isIcon,
          },
          isIcon
            ? {
                // Square control at the touch floor; no horizontal padding.
                "h-9 w-9": size === "sm",
                "h-11 w-11": size === "md",
                "h-14 w-14": size === "lg",
              }
            : {
                "h-9 px-3 text-sm": size === "sm",
                "h-11 px-4 text-sm": size === "md",
                "h-14 px-6 text-base": size === "lg",
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
