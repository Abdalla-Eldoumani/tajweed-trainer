"use client";

import { useEffect, useState } from "react";

// Debounce a fast-changing value (e.g. a search box) so downstream effects fire
// once the input settles, not on every keystroke. Pure, SSR-safe.
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
