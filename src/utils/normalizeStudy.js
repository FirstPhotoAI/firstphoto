/**
 * Normalize study result shape for ResultsPage + downstream components.
 * Ensures photos[], photo (cover preview), and photoCount are always consistent.
 */
export function normalizeStudy(raw) {
  if (!raw) return null

  const rankedLean = raw.ranked ?? []

  const photos = (raw.photos?.length
    ? raw.photos
    : rankedLean.map(({ id, preview, name, rank }) => ({ id, preview, name, rank }))
  ).map((p, i) => {
    if (typeof p === 'string') {
      return { id: `photo-${i}`, preview: p, name: '', rank: i + 1 }
    }
    return {
      id:      p.id      ?? rankedLean[i]?.id ?? `photo-${i}`,
      preview: p.preview ?? rankedLean[i]?.preview ?? '',
      name:    p.name    ?? rankedLean[i]?.name ?? '',
      rank:    p.rank    ?? rankedLean[i]?.rank ?? i + 1,
    }
  })

  const previewById = Object.fromEntries(photos.map((p) => [p.id, p.preview]))

  const ranked = rankedLean.map((r, i) => ({
    ...r,
    preview: r.preview || previewById[r.id] || photos[i]?.preview || '',
  }))

  const previews = photos.map((p) => p.preview).filter(Boolean)

  return {
    ...raw,
    photos,
    ranked,
    portfolio:  raw.portfolio ?? null,
    photo:      previews[0] ?? raw.photo ?? null,
    photoCount: raw.photoCount ?? photos.length,
  }
}
