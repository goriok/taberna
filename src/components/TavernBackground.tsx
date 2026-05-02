"use client";

import React from "react";

/**
 * TavernBackground — subtle parchment texture using CSS gradients only.
 * Produces an aged-paper effect with faint grain and warm undertones.
 */
export function TavernBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundColor: "var(--color-bg)",
        backgroundImage: `
          radial-gradient(ellipse at 20% 30%, color-mix(in srgb, var(--color-accent) 4%, transparent) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 70%, color-mix(in srgb, var(--color-primary) 3%, transparent) 0%, transparent 60%),
          radial-gradient(ellipse at 50% 50%, color-mix(in srgb, var(--color-amber) 2%, transparent) 0%, transparent 70%),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            color-mix(in srgb, var(--color-text) 1.5%, transparent) 2px,
            color-mix(in srgb, var(--color-text) 1.5%, transparent) 4px
          ),
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 2px,
            color-mix(in srgb, var(--color-text) 1%, transparent) 2px,
            color-mix(in srgb, var(--color-text) 1%, transparent) 4px
          )
        `,
      }}
    />
  );
}
