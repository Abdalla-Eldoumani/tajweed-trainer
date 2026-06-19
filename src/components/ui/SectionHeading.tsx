import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  // Heading text.
  children: React.ReactNode;
  // Optional uppercase tracked micro line above the heading.
  eyebrow?: string;
  // Real heading element for the document outline. Defaults to h2.
  as?: "h2" | "h3";
  // When true, draws a single gold hairline under the heading, capped at the
  // reading measure (not full width) and starting at the inline-start edge.
  rule?: boolean;
  className?: string;
}

// The print-magazine section break (DESIGN_SYSTEM section 6): an optional micro
// eyebrow, a real Spectral heading, and an optional gold hairline rule that runs
// the content measure. No gradient, no gold fill behind text; the rule is a
// hairline only.
export function SectionHeading({
  children,
  eyebrow,
  as = "h2",
  rule = false,
  className,
}: SectionHeadingProps) {
  const Heading = as;
  return (
    <div className={cn(className)}>
      {eyebrow && (
        <p className="text-micro font-medium uppercase tracking-[0.08em] text-text-muted">
          {eyebrow}
        </p>
      )}
      <Heading
        className={cn(
          "font-heading font-semibold",
          as === "h2" ? "text-h2" : "text-h3",
          eyebrow && "mt-1"
        )}
      >
        {children}
      </Heading>
      {rule && (
        // Content-measure hairline: capped at the ~720px reading measure and
        // hugging the inline-start edge via logical margin (me-auto), so it
        // flips correctly under RTL. A flat hairline, never a gradient.
        <span
          className="mt-3 block h-px max-w-[720px] me-auto"
          style={{ background: "var(--gold-hairline)" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
