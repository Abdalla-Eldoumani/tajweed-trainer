// Ref-counted body-scroll lock so stacked overlays (drawer, palette, playback
// sheet, onboarding) coordinate: the body stays locked until the last one
// releases. Each overlay calls lockBodyScroll() on open and unlockBodyScroll()
// in its effect cleanup.
let locks = 0;

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (locks === 0) document.body.style.overflow = "hidden";
  locks += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (locks === 0) return;
  locks -= 1;
  if (locks === 0) document.body.style.overflow = "";
}
