/** Dev-only tracing for photo series data flow. Enabled on localhost / vite dev. */
export const SERIES_DEBUG = import.meta.env.DEV

export function logSeries(step, detail) {
  if (!SERIES_DEBUG) return
  console.log(`[FP series] ${step}`, detail)
}

export function summarizeStudy(data) {
  if (!data) return null
  const photos = data.photos ?? []
  const previews = photos.map((p) => (typeof p === 'string' ? p : p.preview)).filter(Boolean)
  return {
    photoCount: data.photoCount ?? photos.length,
    photosLen:  photos.length,
    previewsLen: previews.length,
    rankedLen:  data.ranked?.length ?? 0,
    hasPortfolio: !!data.portfolio,
    cover: previews[0] ? `${previews[0].slice(0, 32)}…` : null,
  }
}

export function summarizeEntry(entry) {
  if (!entry) return null
  return {
    id: entry.id,
    photoCount: entry.photoCount,
    photosLen: Array.isArray(entry.photos) ? entry.photos.length : 0,
    hasCover: !!entry.photo,
    isPublic: entry.isPublic,
  }
}
