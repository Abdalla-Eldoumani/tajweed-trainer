"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  variant?: "default" | "ornate";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover = false, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl p-4 sm:p-6 shadow-sm",
          variant === "default" && "bg-bg-card border border-gold-light/30 dark:bg-bg-card-dark dark:border-gold-dark/20",
          variant === "ornate" && "bg-bg-card border-2 border-gold/40 dark:bg-bg-card-dark dark:border-gold-dark/30 islamic-pattern-bg",
          hover && "transition-shadow hover:shadow-md cursor-pointer",
          className
        )}
        {...props}
      >
        {variant === "ornate" ? <div className="relative z-10">{children}</div> : children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card };
