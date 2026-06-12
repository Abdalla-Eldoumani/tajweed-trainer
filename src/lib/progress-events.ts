// In-tab change channel for the consolidated progress object. localStorage has
// no same-tab notification: the "storage" event only fires in OTHER tabs, so
// two mounted components reading the same key drift apart the moment one of
// them writes. Every write in storage.ts calls emitProgressChanged(); every
// reader subscribes here (useProgress wires this into useSyncExternalStore).
// Zero imports on purpose: storage.ts imports this module, and the hook layer
// imports both, so no cycle can form.

type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeProgressChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let scheduled = false;

export function emitProgressChanged(): void {
  // Deferred one microtask and coalesced. A write can land while React is
  // rendering another tree (the route-view analytics write fires while the
  // practice page is still rendering behind its Suspense boundary, for
  // example), and notifying synchronously makes React warn about updating
  // one component while rendering another. The hop also folds a multi-write
  // burst (a quiz finish writes the score, the streak, and an analytics
  // event) into one notification. localStorage itself is already written by
  // the time this is called, so direct getProgress() reads stay consistent;
  // only the React notification waits.
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    for (const listener of listeners) listener();
  });
}
