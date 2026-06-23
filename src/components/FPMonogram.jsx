/**
 * FPMonogram — the FirstPhoto mark as a bare SVG.
 *
 * A thin photograph frame with a single focal point.
 * The square = the photograph. The circle = the eye, the moment, the impression.
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
      {/* Photograph frame */}
      <rect
        x="1.5" y="1.5"
        width="29" height="29"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Focal point — the eye, the impression, the aperture */}
      <circle cx="16" cy="15" r="3" fill="currentColor" />
    </svg>
  )
}
