import { getEntryPhotos } from '../data/archiveStore'

/**
 * Preview strip for archive cards — up to 3 images side by side.
 * Falls back to a single image for legacy single-photo entries.
 */
export default function SeriesPhotoStrip({
  entry,
  alt = '',
  className = '',
  hover = true,
}) {
  const photos = getEntryPhotos(entry)
  const hoverClass = hover ? 'transition-opacity duration-300 group-hover:opacity-88' : ''

  if (photos.length <= 1) {
    return (
      <div className={`overflow-hidden border border-[rgba(15,15,15,0.10)] ${className}`}>
        <img
          src={photos[0]}
          alt={alt}
          className={`aspect-[3/4] w-full object-cover ${hoverClass}`}
        />
      </div>
    )
  }

  const preview = photos.slice(0, 3)
  const cols    = preview.length === 2 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div
      className={`grid ${cols} gap-px overflow-hidden border border-[rgba(15,15,15,0.10)] bg-[rgba(15,15,15,0.08)] ${className}`}
    >
      {preview.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={alt ? `${alt} ${i + 1}` : ''}
          className={`aspect-[3/4] w-full object-cover ${hoverClass}`}
        />
      ))}
    </div>
  )
}

/**
 * Full series grid for detail / results pages — shows every photograph.
 */
export function SeriesPhotoGrid({ photos, alt = '', className = '' }) {
  if (!photos?.length) return null

  const cols =
    photos.length === 1 ? 'grid-cols-1 max-w-xs' :
    photos.length === 2 ? 'grid-cols-2' :
    photos.length === 4 ? 'grid-cols-2 sm:grid-cols-4' :
    'grid-cols-2 sm:grid-cols-3'

  return (
    <div className={`grid ${cols} gap-2 ${className}`}>
      {photos.map((src, i) => (
        <div key={i} className="overflow-hidden border border-[rgba(15,15,15,0.10)]">
          <img
            src={src}
            alt={alt ? `${alt} ${i + 1}` : ''}
            className="aspect-[3/4] w-full object-cover"
          />
        </div>
      ))}
    </div>
  )
}
