import { clamp100 } from './blur.js'

export function measureExposure(gray) {
  let sum = 0
  for (let i = 0; i < gray.length; i++) sum += gray[i]
  const luma = gray.length ? sum / gray.length : 128
  let score = 100
  if (luma < 55) score = clamp100((luma / 55) * 70)
  else if (luma > 210) score = clamp100(100 - ((luma - 210) / 45) * 70)
  else if (luma >= 90 && luma <= 175) score = clamp100(75 + ((175 - Math.abs(luma - 132)) / 43) * 25)
  else score = clamp100(60)
  return { score, luma }
}

export function measureContrast(gray) {
  let sum = 0
  for (let i = 0; i < gray.length; i++) sum += gray[i]
  const mean = gray.length ? sum / gray.length : 0
  let variance = 0
  for (let i = 0; i < gray.length; i++) {
    const d = gray[i] - mean
    variance += d * d
  }
  const std = gray.length ? Math.sqrt(variance / gray.length) : 0
  const score = clamp100((std / 55) * 100)
  return { score, std }
}

/**
 * @returns {'normal' | 'severe_under' | 'severe_over'}
 */
export function classifyExposure(luma, score, thresholds) {
  if (luma < thresholds.LUMA_SEVERE_LOW && score < thresholds.SCORE_REJECT) {
    return 'severe_under'
  }
  if (luma > thresholds.LUMA_SEVERE_HIGH && score < thresholds.SCORE_REJECT) {
    return 'severe_over'
  }
  return 'normal'
}
