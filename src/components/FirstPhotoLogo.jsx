/**
 * FirstPhotoLogo
 *
 * The FirstPhoto mark: a thin photograph frame with a single focal point.
 * The square = the photograph. The circle = the eye, the moment, the impression.
 *
 * Props
 *   size       'icon' | 'small' | 'medium' | 'large'  — default 'small'
 *   showText   boolean — render "FIRSTPHOTO" wordmark beside / below the mark
 *   className  extra classes on the root element
 */

const MARK_SIZES = {
  icon:   'h-[18px] w-[18px]',
  small:  'h-6 w-6',
  medium: 'h-8 w-8',
  large:  'h-12 w-12',
}

const TEXT_SIZES = {
  icon:   'text-[9px]  tracking-[0.20em]',
  small:  'text-[10px] tracking-[0.22em]',
  medium: 'text-[11px] tracking-[0.22em]',
  large:  'text-sm     tracking-[0.22em]',
}

function Mark({ sizeClass, className = '' }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${sizeClass} ${className}`}
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

export default function FirstPhotoLogo({
  size      = 'small',
  showText  = false,
  className = '',
}) {
  const markClass = MARK_SIZES[size] ?? MARK_SIZES.small
  const textClass = TEXT_SIZES[size] ?? TEXT_SIZES.small
  const isLarge   = size === 'large'

  if (!showText) {
    return <Mark sizeClass={markClass} className={className} />
  }

  if (isLarge) {
    /* Large: mark stacked above wordmark */
    return (
      <div className={`flex flex-col items-start gap-3 ${className}`}>
        <Mark sizeClass={markClass} />
        <p className={`font-medium uppercase ${textClass} text-[#0f0f0f]`}>
          FirstPhoto
        </p>
      </div>
    )
  }

  /* Default: mark + wordmark side by side */
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Mark sizeClass={markClass} />
      <p className={`font-medium uppercase ${textClass} text-[#0f0f0f]`}>
        FirstPhoto
      </p>
    </div>
  )
}
