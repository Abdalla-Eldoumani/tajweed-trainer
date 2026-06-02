import { readFileSync } from "node:fs";
import { join } from "node:path";

// Serve the service worker with a per-build cache version so every deploy
// invalidates the previous build's caches. A static version in public/sw.js was
// the production bug: caches never refreshed across deploys, leaving users on a
// stale shell/assets. force-static bakes the stamped worker once at build time.
export const dynamic = "force-static";

// Evaluated once at build (force-static), so the value is stable per deploy and
// unique between deploys.
const BUILD_VERSION = `b${Date.now()}`;

function buildServiceWorker(): string {
  const template = readFileSync(join(process.cwd(), "scripts", "sw-template.js"), "utf8");
  return template.replace(/__BUILD_VERSION__/g, BUILD_VERSION);
}

export function GET() {
  return new Response(buildServiceWorker(), {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
