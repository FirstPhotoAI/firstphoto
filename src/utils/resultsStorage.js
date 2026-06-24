/**
 * resultsStorage.js
 *
 * Persists study results between UploadPage and ResultsPage via sessionStorage.
 * sessionStorage is the source of truth — do NOT pass full payloads via router state
 * (history.state size limit ~640KB truncates multi-photo base64 series).
 */

import { normalizeStudy } from './normalizeStudy.js'

const STORAGE_KEY = 'firstphoto_results'

function slimAnalysis(analysis) {
  if (!analysis) return analysis
  const { scores, editorial, overall } = analysis
  return { scores, editorial, overall }
}

function stripFile(photo) {
  const { file: _file, ...rest } = photo
  return rest
}

function buildPayload(ranked, portfolio) {
  const clean = ranked.map(stripFile)

  const photos = clean.map(({ id, preview, name, rank }) => ({
    id,
    preview: preview ?? '',
    name:    name ?? '',
    rank:    rank ?? 0,
  }))

  const rankedLean = clean.map(({ id, name, rank, analysis }) => ({
    id,
    name:     name ?? '',
    rank:     rank ?? 0,
    analysis: slimAnalysis(analysis),
  }))

  return {
    v:          2,
    photoCount: photos.length,
    photos,
    ranked:     rankedLean,
    portfolio,
  }
}

function slimPortfolio(portfolio) {
  if (!portfolio) return portfolio
  const {
    selected_image,
    visual_identity,
    selection_reason,
    suggested_sequence,
    series_observation,
    what_makes_the_winner_stronger,
    future_exploration,
  } = portfolio
  return {
    selected_image,
    visual_identity,
    selection_reason,
    suggested_sequence,
    series_observation,
    what_makes_the_winner_stronger,
    future_exploration,
  }
}

function buildSlimPayload(ranked, portfolio) {
  const payload = buildPayload(ranked, portfolio)
  return { ...payload, portfolio: slimPortfolio(portfolio) }
}

export function saveStudyResults(ranked, portfolio) {
  if (!ranked?.length) {
    throw new Error('No photos to save')
  }

  const attempts = [
    () => buildPayload(ranked, portfolio),
    () => buildSlimPayload(ranked, portfolio),
  ]

  let lastError = null

  for (const build of attempts) {
    try {
      const payload = build()
      const json    = JSON.stringify(payload)
      sessionStorage.setItem(STORAGE_KEY, json)

      const loaded = loadStudyResults()
      if (!loaded?.photos?.length) {
        throw new Error('Photos missing after save')
      }
      if (loaded.photos.length !== ranked.length) {
        throw new Error(
          `Photo count mismatch: saved ${loaded.photos.length}, expected ${ranked.length}`
        )
      }
      const withPreview = loaded.photos.filter((p) => p.preview?.startsWith('data:'))
      if (withPreview.length !== ranked.length) {
        throw new Error(
          `Preview count mismatch: ${withPreview.length} of ${ranked.length} have previews`
        )
      }

      return loaded
    } catch (err) {
      lastError = err
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }

  throw lastError ?? new Error('Could not save study results')
}

export function loadStudyResults() {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)

    if (Array.isArray(parsed)) {
      return normalizeStudy({ ranked: parsed, photos: parsed, photoCount: parsed.length })
    }

    return normalizeStudy(parsed)
  } catch {
    return null
  }
}

export function clearStudyResults() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export { normalizeStudy }
