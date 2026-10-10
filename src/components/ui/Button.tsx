import Link from "next/link";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, ComponentProps, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "icon";
type ButtonSize = "sm" | "md" | "lg";

type ButtonBaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  size?: ButtonSize;
  "aria-label"?: string;
};

// An icon-only button carries no text, so it MUST declare an accessible name.
// The type splits the icon variant out and requires aria-label or
// aria-labelledby; omitting both fails the build.
type IconLabel =
  | { "aria-label": string; "aria-labelledby"?: string }
  | { "aria-labelledby": string; "aria-label"?: string };

type ButtonProps =
  | (ButtonBaseProps & { variant?: Exclude<ButtonVariant, "icon"> })
  | (Omit<ButtonBaseProps, "aria-label"> & { variant: "icon" } & IconLabel);

// Pin the color transition to the manuscript's micro duration and symmetric
// easing so hover/focus reads immediate and in step with the rest of the motion
// language; transition-colors keeps it to color only, never layout. The global
// reduced-motion crush still zeroes it.
const buttonMotion = {
  transitionDuration: "var(--motion-micro)",
  transitionTimingFunction: "var(--ease-standard)",
} as const;

// One class recipe for every control that looks like a button, so the <button>
// and the <a> that navigates share the same ink, border, size and focus ring.
function buttonClassName(variant: ButtonVariant, size: ButtonSize, className?: string) {
  const isIcon = variant === "icon";
  // outline is kept as an alias of the design-system secondary (outline) so
  // existing variant="outline" call sites render the single outline style.
  const isOutline = variant === "secondary" || variant === "outline";

  return cn(
    "inline-flex items-center justify-center min-w-11 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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
          "h-11 w-11": size !== "lg",
          "h-14 w-14": size === "lg",
        }
      : {
          "h-11 px-3 text-sm": size === "sm",
          "h-11 px-4 text-sm": size === "md",
          "h-14 px-6 text-base": size === "lg",
        },
    className
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", style, children, ...props }, ref) => (
    <button
      ref={ref}
      style={{ ...buttonMotion, ...style }}
      className={buttonClassName(variant, size, className)}
      {...props}
    >
      {children}
    </button>
  )
);

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Exclude<ButtonVariant, "icon">;
  size?: ButtonSize;
  className?: string;
};

// A link that looks like a button. Navigation is an <a>, never a <button>
// nested inside one: nested interactive content is invalid HTML and gives
// assistive technology two controls for one action.
function ButtonLink({ className, variant = "primary", size = "md", style, ...props }: ButtonLinkProps) {
  return (
    <Link
      style={{ ...buttonMotion, ...style }}
      className={buttonClassName(variant, size, className)}
      {...props}
    />
  );
}

Button.displayName = "Button";

export { Button, ButtonLink };
export type { ButtonProps, ButtonLinkProps };
