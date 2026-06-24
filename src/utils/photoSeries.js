/**
 * Shared helpers for resolving uploaded photo series across results + publish.
 */

export function getSeriesPreviews(uploadedPhotos, ranked) {
  const source = uploadedPhotos?.length ? uploadedPhotos : ranked ?? []
  return source.map((p) => p.preview).filter(Boolean)
}

export function getOrderedPreviews(ranked, portfolio, uploadedPhotos) {
  const source   = uploadedPhotos?.length ? uploadedPhotos : ranked ?? []
  const count    = source.length
  const order    = portfolio?.suggested_sequence?.order
  const byId     = Object.fromEntries(source.map((p) => [p.id, p.preview]))
  const rankedById = Object.fromEntries((ranked ?? []).map((p) => [p.id, p.preview]))

  if (order?.length === count) {
    return order.map((i) => {
      const id = ranked?.[i]?.id ?? source[i]?.id
      return ranked?.[i]?.preview
        ?? rankedById[id]
        ?? byId[id]
        ?? source[i]?.preview
    }).filter(Boolean)
  }

  return getSeriesPreviews(uploadedPhotos, ranked)
}
