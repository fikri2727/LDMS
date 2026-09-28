"use client";

import { useEffect } from "react";

/**
 * Last-resort safety net for errors outside every other boundary (root
 * layout, login page). Must render its own <html>/<body> since it replaces
 * the root layout entirely when triggered.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#4e5057", marginBottom: 24 }}>
              {error.message || "An unexpected error occurred. Please try again."}
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                borderRadius: 12,
                background: "#1d8e72",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                padding: "8px 16px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
