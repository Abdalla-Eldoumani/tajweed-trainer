"use client";

import { useEffect } from "react";

// Root-level fallback. This only fires when the root layout itself throws, so it
// renders its own <html>/<body> and cannot rely on the app shell, providers,
// fonts, or the global stylesheet being present. Styling is therefore inline and
// on-brand (vellum ground, navy ink, gold-leaf action) rather than tokenized,
// and copy is static English since the i18n provider tree is not mounted here.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          textAlign: "center",
          background: "#F5F1E8",
          color: "#131B2E",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#555F77", maxWidth: "24rem", margin: "0 0 1.5rem" }}>
          The application ran into an unexpected problem. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: "2.75rem",
            padding: "0 1rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#1E4279",
            color: "#F5F1E8",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
