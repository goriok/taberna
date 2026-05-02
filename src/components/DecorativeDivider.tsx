"use client";

import React from "react";

interface DecorativeDividerProps {
  /**
   * Width of the divider line. Defaults to 100%.
   */
  width?: string;
  /**
   * Optional additional className.
   */
  className?: string;
}

/**
 * DecorativeDivider — an Art Nouveau ornamental line built with CSS only.
 * Features a central diamond flanked by inward-curving arcs and thin gold lines.
 */
export function DecorativeDivider({
  width = "100%",
  className = "",
}: DecorativeDividerProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width }}
      role="separator"
      aria-hidden="true"
    >
      {/* Left line */}
      <span
        className="block flex-1"
        style={{
          height: "1px",
          backgroundImage:
            "linear-gradient(to right, transparent, var(--color-accent))",
        }}
      />

      {/* Left ornamental arc */}
      <span
        className="mx-1 block"
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          borderTop: "1px solid var(--color-accent)",
          borderLeft: "1px solid transparent",
          borderRight: "1px solid transparent",
          borderBottom: "1px solid transparent",
          transform: "rotate(-45deg)",
        }}
      />

      {/* Central diamond */}
      <span
        className="mx-2 block"
        style={{
          width: "8px",
          height: "8px",
          backgroundColor: "var(--color-accent)",
          transform: "rotate(45deg)",
        }}
      />

      {/* Right ornamental arc */}
      <span
        className="mx-1 block"
        style={{
          width: "12px",
          height: "12px",
          borderRadius: "50%",
          borderTop: "1px solid var(--color-accent)",
          borderLeft: "1px solid transparent",
          borderRight: "1px solid transparent",
          borderBottom: "1px solid transparent",
          transform: "rotate(45deg)",
        }}
      />

      {/* Right line */}
      <span
        className="block flex-1"
        style={{
          height: "1px",
          backgroundImage:
            "linear-gradient(to left, transparent, var(--color-accent))",
        }}
      />
    </div>
  );
}
