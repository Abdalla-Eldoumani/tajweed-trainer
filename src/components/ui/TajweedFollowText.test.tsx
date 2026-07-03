import { describe, it, expect } from "vitest";
import type { ComponentProps, ReactNode } from "react";
import { render } from "@testing-library/react";
import { SettingsProvider, useSettings } from "@/hooks/useSettings";
import { TajweedFollowText } from "./TajweedFollowText";

// A fixture that groups into EXACTLY four visual words. One token is wrapped in a
// <tajweed> span so sanitizeTajweedHtml keeps the markup — this proves wrapper
// placement, not Quran content, so the tokens are ASCII placeholders, never verse
// text (content immutability holds). The whitespace between tokens is what the
// read-only grouping splits on: alpha | beta | gamma | delta.
const FOUR_WORDS = 'alpha <tajweed class="ikhafa">beta</tajweed> gamma delta';

// SettingsProvider mounts with `mounted: false`, then flips to true in its own
// effect. That flip re-renders the subtree and React re-applies the verse's
// dangerouslySetInnerHTML, which wipes the additive <mushaf-word> wrappers the
// grouping effect placed on the first commit (the effect does not re-run for
// unchanged props). In the app this never bites: SettingsProvider lives at the
// root and is mounted long before any verse renders, so TajweedFollowText always
// mounts into the already-settled provider. This gate reproduces that ordering by
// deferring the render until `mounted` is true, so the wrappers we assert on are
// the settled ones.
function SettledGate({ children }: { children: ReactNode }) {
  const { mounted } = useSettings();
  return mounted ? <>{children}</> : null;
}

function renderFollow(props: Partial<ComponentProps<typeof TajweedFollowText>>) {
  return render(
    <SettingsProvider>
      <SettledGate>
        <TajweedFollowText tajweedHtml={FOUR_WORDS} activeIdx={-1} segmentCount={4} {...props} />
      </SettledGate>
    </SettingsProvider>,
  );
}

// The blurred/active wrappers are additive <mushaf-word> elements carrying the
// class; their textContent identifies which visual word they wrap. Plain DOM
// queries only — no jest-dom matcher dependency.
function blurredTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".mushaf-word-blurred")).map((el) =>
    (el.textContent ?? "").trim(),
  );
}

describe("TajweedFollowText revealRange", () => {
  it("window reveal blurs the words outside [start..end] and applies no highlight", () => {
    const { container } = renderFollow({ revealRange: { start: 1, end: 2 } });
    // Words 0 (alpha) and 3 (delta) fall outside the window; 1 (beta) and 2
    // (gamma) show through.
    expect(new Set(blurredTexts(container))).toEqual(new Set(["alpha", "delta"]));
    expect(container.querySelectorAll(".mushaf-word-blurred")).toHaveLength(2);
    // revealRange ignores activeIdx: no active-word highlight in this mode.
    expect(container.querySelectorAll(".mushaf-word-active")).toHaveLength(0);
  });

  it("prefix reveal (start pinned to 0) blurs only the tail words — the chaining cue", () => {
    const { container } = renderFollow({ revealRange: { start: 0, end: 1 } });
    // The growing-prefix cue: words 0 (alpha) and 1 (beta) shown, 2 (gamma) and
    // 3 (delta) blurred.
    expect(new Set(blurredTexts(container))).toEqual(new Set(["gamma", "delta"]));
    expect(container.querySelectorAll(".mushaf-word-blurred")).toHaveLength(2);
    expect(container.querySelectorAll(".mushaf-word-active")).toHaveLength(0);
  });

  it("no revealRange with no active word leaves the plain follow-along path unchanged", () => {
    const { container } = renderFollow({ activeIdx: -1, blurUnrevealed: false });
    // No revealRange, no active word, reveal-as-recited off: zero wrappers, the
    // markup shows exactly as injected.
    expect(container.querySelectorAll(".mushaf-word-blurred")).toHaveLength(0);
    expect(container.querySelectorAll(".mushaf-word-active")).toHaveLength(0);
  });

  it("no revealRange with blurUnrevealed still blurs the words ahead of the active one", () => {
    const { container } = renderFollow({ activeIdx: 1, blurUnrevealed: true });
    // The existing reveal-as-recited behavior is untouched: words ahead of
    // activeIdx=1 (gamma, delta) are blurred and the active word (beta) is
    // highlighted.
    expect(new Set(blurredTexts(container))).toEqual(new Set(["gamma", "delta"]));
    expect(container.querySelectorAll(".mushaf-word-blurred")).toHaveLength(2);
    const active = container.querySelectorAll(".mushaf-word-active");
    expect(active).toHaveLength(1);
    expect((active[0].textContent ?? "").trim()).toBe("beta");
  });
});
