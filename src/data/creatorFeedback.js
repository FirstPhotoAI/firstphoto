/**
 * Local persistence for Creator validation feedback.
 * Used during the photographer validation phase — no backend yet.
 *
 * Entry shape:
 *   { id, sessionId, sessionType, imageCount, processingDuration,
 *     keepCount, maybeCount, rejectCount, keepActualCount,
 *     importantRejected, timeSavedMinutes, photographerRating,
 *     useAgain, comments, submittedAt }
 */

const STORAGE_KEY = 'firstphoto_creator_feedback'

export const SESSION_TYPES = [
  'concert',
  'event',
  'fashion',
  'sports',
  'portrait',
  'other',
]

/**
 * @param {object} input
 * @returns {object}
 */
export function saveCreatorFeedback(input) {
  const entry = {
    id: crypto.randomUUID(),
    sessionId: input.sessionId ?? null,
    sessionType: input.sessionType ?? 'other',
    imageCount: Number(input.imageCount) || 0,
    processingDuration: Number(input.processingDuration) || 0,
    keepCount: Number(input.keepCount) || 0,
    maybeCount: Number(input.maybeCount) || 0,
    rejectCount: Number(input.rejectCount) || 0,
    keepActualCount: input.keepActualCount != null && input.keepActualCount !== ''
      ? Number(input.keepActualCount)
      : null,
    importantRejected: input.importantRejected ?? null,
    timeSavedMinutes: input.timeSavedMinutes != null && input.timeSavedMinutes !== ''
      ? Number(input.timeSavedMinutes)
      : null,
    photographerRating: input.photographerRating != null && input.photographerRating !== ''
      ? Number(input.photographerRating)
      : null,
    useAgain: input.useAgain ?? null,
    comments: String(input.comments ?? '').trim(),
    submittedAt: Date.now(),
  }

  const history = getCreatorFeedback()
  history.push(entry)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  console.info('[FirstPhoto Creator Feedback]', entry)
  return entry
}

export function getCreatorFeedback() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getFeedbackForSession(sessionId) {
  return getCreatorFeedback().filter((e) => e.sessionId === sessionId)
}

/** Dev helper — call window.__exportCreatorFeedback() in the console. */
export function exportCreatorFeedbackJson() {
  return JSON.stringify(getCreatorFeedback(), null, 2)
}

if (typeof window !== 'undefined') {
  window.__getCreatorFeedback = getCreatorFeedback
  window.__exportCreatorFeedback = exportCreatorFeedbackJson
}

/**
 * Build feedback defaults from a completed cull session meta object.
 * @param {object} meta
 */
export function feedbackFromSessionMeta(meta) {
  return {
    sessionId: meta.id,
    imageCount: meta.total,
    processingDuration: meta.durationMs ?? 0,
    keepCount: meta.keep,
    maybeCount: meta.maybe,
    rejectCount: meta.reject,
  }
}
