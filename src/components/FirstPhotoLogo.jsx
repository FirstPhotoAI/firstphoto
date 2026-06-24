/**
 * FirstPhotoLogo
 *
 * The FirstPhoto mark: FP monogram.
 *
 * Two elements:
 *   1. A closed rectangular P bowl with an extended vertical stem.
 *      – Read as P: vertical + top arm + closed bowl (right side + bottom).
 *      – Read as F: the same vertical + top arm + bowl-bottom acting as middle arm.
 *   2. A shorter horizontal bar below the bowl (F's own crossbar).
 *      – Makes the F explicitly legible independent of the P bowl.
 *      – Positioned at the midpoint between bowl-bottom and mark-bottom.
 *      – Spans ~55% of total width — shorter than the top arm, as in a real F.
 *
 * The two elements together read unambiguously as FP at all sizes from 18 px up.
 *
 * Props
 *   size       'icon' | 'small' | 'medium' | 'large'  — default 'small'
 *   showText   boolean — render "FIRSTPHOTO" wordmark beside / below the mark
 *   className  extra Tailwind classes on the root element (use for color overrides)
 *   color      explicit color string — defaults to #0f0f0f
 *
 * Sizing uses explicit SVG width/height attributes so the mark is never collapsed
 * by Tailwind purging or missing CSS.
 */

const PIXEL_SIZES = {
  icon:   20,
  small:  28,
  medium: 36,
  large:  52,
}

const TEXT_STYLES = {
  icon:   { fontSize: '9px',  letterSpacing: '0.20em' },
  small:  { fontSize: '11px', letterSpacing: '0.22em' },
  medium: { fontSize: '12px', letterSpacing: '0.22em' },
  large:  { fontSize: '14px', letterSpacing: '0.22em' },
}

function Mark({ px }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* ① P bowl + shared vertical stem ─────────────────────────────────────
           Bowl: x 6→25, y 3→16  (19 px wide × 13 px tall — squarish)
           Stem: x=6, y 3→29
           Reading: P (closed bowl + stem) / F (top arm + middle arm = bowl bottom)
      */}
      <path
        d="M 6 29 L 6 3 L 25 3 L 25 16 L 6 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      {/* ② F's own crossbar ─────────────────────────────────────────────────
           Shorter than the top arm — spans only ~55% of total width.
           Positioned at the midpoint between bowl-bottom (16) and mark-bottom (29).
           This element is what makes the F legible on its own.
      */}
      <line
        x1="6"  y1="23"
        x2="17" y2="23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  )
}

export default function FirstPhotoLogo({
  size      = 'small',
  showText  = false,
  className = '',
  color     = '#0f0f0f',
}) {
  const px        = PIXEL_SIZES[size]  ?? PIXEL_SIZES.small
  const textStyle = TEXT_STYLES[size]  ?? TEXT_STYLES.small
  const isLarge   = size === 'large'

  /* ── Mark only ─────────────────────────────────────── */
  if (!showText) {
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', color }}
      >
        <Mark px={px} />
      </span>
    )
  }

  /* ── Large: mark stacked above wordmark ─────────────── */
  if (isLarge) {
    return (
      <div
        className={className}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', color }}
      >
        <Mark px={px} />
        <p style={{ fontWeight: 500, textTransform: 'uppercase', ...textStyle, margin: 0 }}>
          FirstPhoto
        </p>
      </div>
    )
  }

  /* ── Default: mark + wordmark side by side ──────────── */
  return (
    <div
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', color }}
    >
      <Mark px={px} />
      <p style={{ fontWeight: 500, textTransform: 'uppercase', ...textStyle, margin: 0 }}>
        FirstPhoto
      </p>
    </div>
  )
}
