import { CULL_FLAGS, DUPLICATE_THRESHOLDS } from './constants.js'

export function toBigInt(hash) {
  return typeof hash === 'bigint' ? hash : BigInt(hash)
}

/** 8×8 average hash sampled from grayscale. */
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
 * @param {number} dist
 * @returns {'exact' | 'near' | 'burst' | null}
 */
export function classifyDuplicate(dist) {
  if (dist <= DUPLICATE_THRESHOLDS.EXACT) return 'exact'
  if (dist <= DUPLICATE_THRESHOLDS.NEAR) return 'near'
  if (dist <= DUPLICATE_THRESHOLDS.BURST) return 'burst'
  return null
}

function hashSliceKeys(hash) {
  const h = toBigInt(hash)
  return [
    Number((h >> 48n) & 0xFFFFn),
    Number((h >> 32n) & 0xFFFFn),
    Number((h >> 16n) & 0xFFFFn),
    Number(h & 0xFFFFn),
  ]
}

/**
 * Mark near-duplicates; keep highest sharpness in each cluster.
 * @param {Array<object>} items
 */
export function resolveDuplicates(items) {
  const used = new Set()
  const sorted = [...items].sort((a, b) => b.sharpness - a.sharpness)
  /** @type {Map<number, object[]>} */
  const buckets = new Map()

  for (const item of sorted) {
    for (const key of hashSliceKeys(item.aHash)) {
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(item)
    }
  }

  for (const a of sorted) {
    if (used.has(a.id)) continue
    const seen = new Set()

    for (const key of hashSliceKeys(a.aHash)) {
      for (const b of buckets.get(key) ?? []) {
        if (b.id === a.id || used.has(b.id) || seen.has(b.id)) continue
        if (b.sharpness > a.sharpness) continue
        seen.add(b.id)

        const dist = hammingDistance(a.aHash, b.aHash)
        const dupType = classifyDuplicate(dist)
        if (dupType) {
          b.isDuplicate = true
          b.duplicateOf = a.id
          b.duplicateType = dupType
          b.flags = [...(b.flags ?? []), CULL_FLAGS.DUPLICATE]
          used.add(b.id)
        }
      }
    }
  }

  return items
}
