"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  // One card style. "elevated" adds a 1px inset gold hairline (.card-elevated),
  // not a glow. "ornate" is kept as an alias of "elevated" so existing
  // variant="ornate" call sites render the clean elevated card.
  variant?: "default" | "elevated" | "ornate";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, variant = "default", children, ...props }, ref) => {
    const isElevated = variant === "elevated" || variant === "ornate";

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl p-5 sm:p-6 shadow-sm bg-bg-card border border-border dark:bg-bg-card-dark",
          // Elevated treatment: a quiet 1px inset gold hairline, no glow.
          isElevated && "card-elevated",
          hover && "transition-shadow hover:shadow-md cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card };
export type { CardProps };
