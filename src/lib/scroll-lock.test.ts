import { describe, it, expect, beforeEach } from "vitest";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";

// New coverage for the ref-counted body-scroll lock the stacked overlays share.
// The counter is a module singleton, so every test balances its locks back to
// zero and starts from a cleared body style to avoid leaking state.

beforeEach(() => {
  document.body.style.overflow = "";
});

describe("lockBodyScroll / unlockBodyScroll ref-count", () => {
  it("locks the body while any caller holds a lock and releases only at zero", () => {
    lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");

    // A second caller opens on top of the first.
    lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");

    // The landmine: releasing the first while the second is still held must NOT
    // free the body.
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");

    // Only when the last holder releases does the body scroll again.
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("");
  });

  it("a single lock/unlock pair releases the body", () => {
    lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("");
  });

  it("an unlock with no lock held is a no-op (count never goes negative)", () => {
    // Count is at zero here; an unbalanced unlock returns early and does not
    // touch the body or push the counter below zero (which would strand the
    // next lock).
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("");

    // Proof the counter is still zero: the next single lock immediately locks.
    lockBodyScroll();
    expect(document.body.style.overflow).toBe("hidden");
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe("");
  });
});
