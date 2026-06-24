/** @typedef {'keep' | 'maybe' | 'reject'} CullVerdict */

/**
 * @typedef {Object} CullSignals
 * @property {number} sharpness      0–100
 * @property {number} blur           0–100 (inverse of sharpness emphasis)
 * @property {number} exposure       0–100
 * @property {number} eyeRisk        0–100 (higher = more likely closed eyes)
 * @property {boolean} isDuplicate
 * @property {string|null} duplicateOf  id of kept image in group
 */

/**
 * @typedef {Object} CullPhotoResult
 * @property {string} id
 * @property {string} name
 * @property {number} rank           0–100 composite
 * @property {CullVerdict} verdict
 * @property {CullSignals} signals
 * @property {string[]} flags        human-readable reason keys
 */

/**
 * @typedef {Object} CullSessionMeta
 * @property {string} id
 * @property {number} total
 * @property {number} keep
 * @property {number} maybe
 * @property {number} reject
 * @property {number} startedAt
 * @property {number} finishedAt
 */

export const CULL_FLAGS = {
  BLUR:           'blur',
  CLOSED_EYES:    'closed_eyes',
  DUPLICATE:      'duplicate',
  WEAK_EXPOSURE:  'weak_exposure',
  WEAK_TECHNICAL: 'weak_technical',
}
