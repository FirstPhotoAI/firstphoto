import {
  CULL_FLAGS,
  CULL_LIMITS,
  BLUR_THRESHOLDS,
  EXPOSURE_THRESHOLDS,
  RANK_THRESHOLDS,
} from './constants.js'

function clamp100(n) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** Composite quality score for ranking. */
export function rankPhotos(items) {
  return items.map((item) => {
    if (item.isDuplicate) {
      return { ...item, rank: 0 }
    }

    let rank = (
      item.sharpness * 0.45 +
      item.exposure * 0.35 +
      item.contrast * 0.20
    )

    if (item.blurClass === 'soft') rank *= 0.85
    if (item.blurClass === 'unusable') rank *= 0.5
    if (item.exposureClass !== 'normal') rank *= 0.7

    return { ...item, rank: clamp100(rank) }
  })
}

/** Assign Keep / Maybe / Reject with target 30–100 keep images. */
export function assignVerdicts(items) {
  const total = items.length
  const targetKeep = Math.min(
    CULL_LIMITS.TARGET_KEEP_MAX,
    Math.max(CULL_LIMITS.TARGET_KEEP_MIN, Math.round(total * 0.06))
  )

  const enriched = items.map((item) => {
    const flags = [...(item.flags ?? [])]

    if (item.isDuplicate) {
      return { ...item, flags, verdict: 'reject' }
    }
    if (item.blurClass === 'unusable') {
      flags.push(CULL_FLAGS.BLUR)
      return { ...item, flags, verdict: 'reject' }
    }
    if (item.exposureClass === 'severe_under' || item.exposureClass === 'severe_over') {
      flags.push(CULL_FLAGS.WEAK_EXPOSURE)
      return { ...item, flags, verdict: 'reject' }
    }
    if (item.contrast < RANK_THRESHOLDS.CONTRAST_REJECT && item.sharpness < 45) {
      flags.push(CULL_FLAGS.WEAK_TECHNICAL)
      return { ...item, flags, verdict: 'reject' }
    }
    if (item.blurClass === 'soft') {
      flags.push(CULL_FLAGS.BLUR)
    }
    if (item.exposureClass !== 'normal' && item.exposure < 50) {
      flags.push(CULL_FLAGS.WEAK_EXPOSURE)
    }

    return { ...item, flags, verdict: null }
  })

  const pool = enriched
    .filter((i) => !i.verdict)
    .sort((a, b) => b.rank - a.rank)

  const keepIds = new Set(pool.slice(0, targetKeep).map((i) => i.id))
  const maybeCount = Math.min(150, Math.max(0, pool.length - targetKeep))

  return enriched.map((item) => {
    if (item.verdict) return item
    if (keepIds.has(item.id)) return { ...item, verdict: 'keep' }
    const idx = pool.findIndex((p) => p.id === item.id)
    if (idx >= targetKeep && idx < targetKeep + maybeCount) {
      return { ...item, verdict: 'maybe' }
    }
    return { ...item, verdict: 'reject' }
  })
}
