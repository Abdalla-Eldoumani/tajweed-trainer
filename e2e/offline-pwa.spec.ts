import { test, expect, expectNoConsoleErrors } from "./support/fixtures";

// E2E-02: the production-only service worker and the PWA manifest. The prod
// server under test is the only place these hold — PWARegister registers the
// worker after the load event in prod builds only (a no-op under next dev), so
// offline-shell resilience and a live serviceWorker.controller are meaningful
// here and nowhere else.

test.describe("service worker + PWA", () => {
  test("offline reload of a shell route still renders the app shell", async ({
    page,
    context,
    consoleErrors,
  }) => {
    // /learn is one of the worker's precached SHELL_URLS, so reloading it
    // offline must serve the cached shell rather than a network error. A
    // non-shell route (e.g. /mushaf/page/1) would instead fall back to "/".
    await page.goto("/learn");

    // Wait for the worker to activate (SHELL_URLS cached) and take control. The
    // initial navigation loaded BEFORE the worker was controlling, so its own
    // JS/CSS chunks were not routed through the worker yet.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
            once: true,
          });
          setTimeout(() => resolve(), 3000);
        });
      }
    });

    // Reload once while online and controlled so every same-origin shell
    // resource (the document and its chunks/fonts) is fetched THROUGH the
    // worker and stored in the static cache; only then can the offline reload
    // be served entirely from cache with no failed-resource console noise.
    await page.reload();
    // Deterministic post-condition instead of the flaky networkidle wait: the
    // navigation chrome becoming visible proves the shell's JS/CSS chunks were
    // fetched THROUGH the controlling worker (and so cache-first stored) — that
    // is exactly what the offline reload below needs, and it is a web-first
    // assertion (auto-retries), not a race on network silence.
    await page.waitForLoadState("load");
    await expect(page.getByRole("navigation").first()).toBeVisible();

    // Fulfill Next's background <Link> RSC prefetches (the "?_rsc=" fetches).
    // The worker deliberately does not cache RSC, so offline these would hit the
    // network and fail — expected offline behavior, but noise unrelated to
    // whether the shell renders. Short-circuiting them keeps the console guard
    // STRICT: a genuinely uncached shell resource would still fail loudly.
    await context.route(/[?&]_rsc=/, (route) => route.fulfill({ status: 204, body: "" }));

    await context.setOffline(true);
    await page.reload();
    // The navigation chrome renders from the cached shell with no network.
    await expect(page.getByRole("navigation").first()).toBeVisible();
    await context.setOffline(false);

    expectNoConsoleErrors(consoleErrors);
  });

  test("PWA manifest is linked and the worker controls the page", async ({
    page,
    consoleErrors,
  }) => {
    await page.goto("/");

    // The manifest <link> points at the Next metadata route.
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest/);

    // The manifest itself names the app. page.request bypasses the page (and the
    // worker), fetching the metadata route directly against the baseURL.
    const response = await page.request.get("/manifest.webmanifest");
    expect(response.ok()).toBeTruthy();
    const manifest = await response.json();
    expect(manifest.name).toBe("Tajweed Trainer");

    // The worker activates and claims the page in the prod build.
    const controlled = await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (navigator.serviceWorker.controller) return true;
      return await new Promise<boolean>((resolve) => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(true),
          { once: true },
        );
        setTimeout(() => resolve(Boolean(navigator.serviceWorker.controller)), 3000);
      });
    });
    expect(controlled).toBeTruthy();

    expectNoConsoleErrors(consoleErrors);
  });
});
