export const CULL_LIMITS = {
  MAX_FILES:    2000,
  MIN_FILES:    import.meta.env.DEV ? 50 : 500,
  RECOMMENDED:  500,
  TARGET_KEEP_MIN: 30,
  TARGET_KEEP_MAX: 100,
  THUMB_DIM:    128,
  WORKER_COUNT: typeof navigator !== 'undefined'
    ? Math.min(8, Math.max(2, navigator.hardwareConcurrency ?? 4))
    : 4,
}

/** Realistic MVP targets — speed optimization comes later. */
export const PERFORMANCE_TARGETS_MS = {
  500:  300_000,
  1000: 600_000,
  2000: 900_000,
}

export function performanceTargetMs(count) {
  if (count <= 500) return PERFORMANCE_TARGETS_MS[500]
  if (count <= 1000) return PERFORMANCE_TARGETS_MS[1000]
  return PERFORMANCE_TARGETS_MS[2000]
}

export const BLUR_THRESHOLDS = {
  SHARP:     38,
  UNUSABLE:  22,
}

export const EXPOSURE_THRESHOLDS = {
  LUMA_SEVERE_LOW:  55,
  LUMA_SEVERE_HIGH: 210,
  SCORE_REJECT:     35,
}

export const DUPLICATE_THRESHOLDS = {
  EXACT:  0,
  NEAR:   4,
  BURST:  7,
}

export const RANK_THRESHOLDS = {
  CONTRAST_REJECT: 18,
  SHARPNESS_MAYBE: 38,
}

export const CULL_FLAGS = {
  BLUR:           'blur',
  DUPLICATE:      'duplicate',
  WEAK_EXPOSURE:  'weak_exposure',
  WEAK_TECHNICAL: 'weak_technical',
}
