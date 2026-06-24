import { CULL_LIMITS } from './constants.js'

const MAX_DIM = CULL_LIMITS.THUMB_DIM

export function clamp100(n) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function toBigInt(hash) {
  return typeof hash === 'bigint' ? hash : BigInt(hash)
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
  return { score, raw: avgEdge }
}

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

/** 8×8 average hash sampled from grayscale — no extra canvas. */
export function computeAHashFromGray(gray, width, height) {
  const lumas = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const x = Math.min(width - 1, Math.floor((col + 0.5) * width / 8))
      const y = Math.min(height - 1, Math.floor((row + 0.5) * height / 8))
      lumas.push(gray[y * width + x])
    }
  }
  const avg = lumas.reduce((a, b) => a + b, 0) / lumas.length
  let bits = 0n
  for (let i = 0; i < 64; i++) {
    if (lumas[i] >= avg) bits |= 1n << BigInt(i)
  }
  return bits
}

export function hammingDistance(a, b) {
  const x = toBigInt(a) ^ toBigInt(b)
  let count = 0
  let v = x
  while (v) {
    count += Number(v & 1n)
    v >>= 1n
  }
  return count
}

/**
 * Heuristic closed-eye risk in portrait-like frames.
 * Replace with face/eye ML in a future stage module.
 */
export function measureEyeRisk(data, width, height) {
  const gray = toGrayscale(data, width, height)
  const band = (y0, y1, x0, x1) => {
    let sum = 0
    let n = 0
    const yStart = Math.floor(height * y0)
    const yEnd = Math.floor(height * y1)
    const xStart = Math.floor(width * x0)
    const xEnd = Math.floor(width * x1)
    for (let y = yStart; y < yEnd; y++) {
      for (let x = xStart; x < xEnd; x++) {
        if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) continue
        const c = gray[y * width + x]
        const t = gray[(y - 1) * width + x]
        const b = gray[(y + 1) * width + x]
        const l = gray[y * width + (x - 1)]
        const r = gray[y * width + (x + 1)]
        sum += Math.abs(4 * c - t - b - l - r)
        n += 1
      }
    }
    return n ? sum / n : 0
  }

  const leftEye = band(0.22, 0.38, 0.22, 0.48)
  const rightEye = band(0.22, 0.38, 0.52, 0.78)
  const cheek = band(0.38, 0.58, 0.25, 0.75)
  const eyeAvg = (leftEye + rightEye) / 2
  if (cheek < 2) return 0

  const ratio = eyeAvg / cheek
  if (ratio < 0.35) return clamp100(85)
  if (ratio < 0.55) return clamp100(60)
  if (ratio < 0.75) return clamp100(35)
  return clamp100(15)
}

/** @deprecated Use loadFileImageData from loadImageData.js */
export { loadFileImageData } from './loadImageData.js'

export { MAX_DIM }
