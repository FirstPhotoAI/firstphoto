export function clamp100(n) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function toGrayscale(data, width, height) {
  const gray = new Float32Array(width * height)
  for (let i = 0; i < gray.length; i++) {
    const o = i * 4
    gray[i] = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]
  }
  return gray
}

/** Laplacian edge energy — higher = sharper. */
export function measureSharpness(data, width, height) {
  const gray = toGrayscale(data, width, height)
  let edgeSum = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const c = gray[y * width + x]
      const t = gray[(y - 1) * width + x]
      const b = gray[(y + 1) * width + x]
      const l = gray[y * width + (x - 1)]
      const r = gray[y * width + (x + 1)]
      edgeSum += Math.abs(4 * c - t - b - l - r)
      count += 1
    }
  }
  const avgEdge = count > 0 ? edgeSum / count : 0
  const score = clamp100((avgEdge / 15) * 100)
  return { score, raw: avgEdge, gray }
}

/**
 * @param {number} sharpness 0–100
 * @returns {'sharp' | 'soft' | 'unusable'}
 */
export function classifyBlur(sharpness, thresholds) {
  if (sharpness >= thresholds.SHARP) return 'sharp'
  if (sharpness >= thresholds.UNUSABLE) return 'soft'
  return 'unusable'
}
