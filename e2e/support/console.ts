import { expect, type Page } from "@playwright/test";

// Collect console.error output and uncaught page errors for a page. Returns a
// live array the spec asserts against once navigation has settled.
export function attachConsole(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(String(error)));
  return errors;
}

// The one documented benign console line: public/ ships icon.svg (and the
// maskable variant) but no favicon.ico, so a browser request for /favicon.ico
// can 404 and log a resource error. Nothing else is allowed. Keep this list
// minimal and justified; a real app error must never be filtered here.
const ALLOW: RegExp[] = [/favicon\.ico/i, /Failed to load resource.*404.*(favicon|\.ico)/i];

// Assert the page produced no console errors beyond the documented allowlist.
export function expectNoConsoleErrors(errors: string[]): void {
  const real = errors.filter((error) => !ALLOW.some((pattern) => pattern.test(error)));
  expect(real, real.join("\n")).toHaveLength(0);
}
