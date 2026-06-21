"use client";

import { usePathname } from "next/navigation";

// key={pathname} forces React to remount the subtree on every route change, so
// the CSS .route-enter animation replays on each navigation instead of only the
// first mount. children come from the server layout and pass through unchanged,
// so they stay server-rendered.
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="route-enter">
      {children}
    </div>
  );
}
