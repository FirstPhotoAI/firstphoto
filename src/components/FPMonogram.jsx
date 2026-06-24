/**
 * FPMonogram — the FirstPhoto mark as a bare SVG.
 *
 * FP monogram: F and P fused. Shared vertical stem.
 * Closed rectangular bowl reads as P. Stem below reads as F.
 *
 * Uses currentColor so colour is controlled by the parent via Tailwind text-* classes.
 * Renders cleanly from 16 px (favicon) through 48 px (hero).
 */
export default function FPMonogram({ className = '' }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 6 29 L 6 3 L 25 3 L 25 16 L 6 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <line
        x1="6" y1="23"
        x2="17" y2="23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  )
}
