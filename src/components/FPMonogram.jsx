/**
 * FPMonogram
 *
 * Stroke-based SVG monogram. Uses currentColor so it inherits
 * text-[#0f0f0f] or any other color set on the parent element.
 *
 * ViewBox 0 0 60 42  (landscape, ~10:7 ratio)
 *
 * F  — two strokes: outer shape + middle bar
 * P  — single open path: stem → top rail → semicircle bowl
 *       Arc maths: from (46, 2.5) to (46, 25.5), r=11.5 → perfect semicircle
 *       Rightmost point: (57.5, 14)  ← fits within viewBox width 60
 */
export default function FPMonogram({ className = '' }) {
  return (
    <svg
      viewBox="0 0 60 42"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* ── F ─────────────────────────────────────── */}
      {/* Top-right → top-left → bottom of stem */}
      <path
        d="M 22,2.5 H 2.5 V 39.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      {/* Middle bar */}
      <line
        x1="2.5" y1="20" x2="16" y2="20"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="butt"
      />

      {/* ── P ─────────────────────────────────────── */}
      {/* Bottom of stem → top → bowl arc → back to stem */}
      <path
        d="M 28,39.5 V 2.5 H 46 A 11.5,11.5 0 0 1 46,25.5 H 28"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
    </svg>
  )
}
