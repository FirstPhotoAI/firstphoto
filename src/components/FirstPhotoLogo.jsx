/**
 * FirstPhotoLogo
 *
 * The FirstPhoto mark: a thin photograph frame with a single focal point.
 * The square = the photograph. The circle = the eye, the moment, the impression.
 *
 * Props
 *   size       'icon' | 'small' | 'medium' | 'large'  — default 'small'
 *   showText   boolean — render "FIRSTPHOTO" wordmark beside / below the mark
 *   className  extra Tailwind classes on the root element (use for color overrides)
 *
 * Sizing uses explicit SVG width/height attributes so the mark is never collapsed
 * by Tailwind purging or missing CSS. Color defaults to #0f0f0f via inline style
 * but is overridable via className (e.g. "text-[rgba(15,15,15,0.28)]").
 */

const PIXEL_SIZES = {
  icon:   18,
  small:  24,
  medium: 32,
  large:  48,
}

const TEXT_STYLES = {
  icon:   { fontSize: '9px',  letterSpacing: '0.20em' },
  small:  { fontSize: '10px', letterSpacing: '0.22em' },
  medium: { fontSize: '11px', letterSpacing: '0.22em' },
  large:  { fontSize: '13px', letterSpacing: '0.22em' },
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
