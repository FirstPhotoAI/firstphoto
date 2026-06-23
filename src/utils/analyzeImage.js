/**
 * analyzeImage.js
 *
 * Pure Canvas API image analysis. No external dependencies. No Math.random.
 * All scores are deterministic: the same image always produces the same output.
 *
 * Primary export:
 *   analyzeImage(src: string) → Promise<AnalysisResult>
 *
 * Batch export:
 *   analyzeAll(photos: PhotoObject[]) → Promise<RankedPhoto[]>
 *
 * PhotoObject shape (from PhotoUploader):
 *   { id: string, preview: string, name: string, file: File }
 *
 * AnalysisResult shape:
 *   {
 *     scores: {
 *       brightness:   { score: number, raw: number, observation: string },
 *       contrast:     { score: number, raw: number, observation: string },
 *       saturation:   { score: number, raw: number, observation: string },
 *       composition:  { score: number, raw: number, observation: string },
 *       sharpness:    { score: number, raw: number, observation: string },
 *       total:        number,
 *     },
 *     overall: string,
 *   }
 */

// ─── Canvas size ─────────────────────────────────────────────────────────────
// All images are drawn into a fixed bounding box before analysis.
// Aspect ratio is preserved. Using 300 gives enough pixel density for
// sharpness detection while staying fast on mobile hardware.
const MAX_DIM = 300

// ─── Image loading ────────────────────────────────────────────────────────────

/**
 * Load an image from a blob URL or data URL into an ImageData object.
 * The image is scaled proportionally to fit within MAX_DIM × MAX_DIM.
 */
function loadImageData(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      // Preserve aspect ratio within the MAX_DIM bounding box
      const scale = Math.min(MAX_DIM / img.naturalWidth, MAX_DIM / img.naturalHeight, 1)
      const w = Math.max(1, Math.round(img.naturalWidth * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, w, h)

      resolve(ctx.getImageData(0, 0, w, h))
    }

    img.onerror = () => reject(new Error(`analyzeImage: failed to load "${src}"`))
    img.src = src
  })
}

// ─── Pixel helpers ────────────────────────────────────────────────────────────

/**
 * Walk the raw RGBA buffer once and extract parallel arrays for
 * R, G, B channels and perceptual luminance (ITU-R BT.709 coefficients).
 * This single pass is shared by brightness, contrast, and saturation analyzers.
 */
function extractChannels(data) {
  const len = data.length / 4
  const r    = new Float32Array(len)
  const g    = new Float32Array(len)
  const b    = new Float32Array(len)
  const luma = new Float32Array(len)

  for (let i = 0; i < len; i++) {
    const offset = i * 4
    const rv = data[offset]
    const gv = data[offset + 1]
    const bv = data[offset + 2]
    r[i]    = rv
    g[i]    = gv
    b[i]    = bv
    luma[i] = 0.2126 * rv + 0.7152 * gv + 0.0722 * bv
  }

  return { r, g, b, luma }
}

/** Arithmetic mean of a typed array. */
function mean(arr) {
  let sum = 0
  for (let i = 0; i < arr.length; i++) sum += arr[i]
  return sum / arr.length
}

/** Population standard deviation of a typed array, given a precomputed mean. */
function stdDev(arr, mu) {
  let sum = 0
  for (let i = 0; i < arr.length; i++) sum += (arr[i] - mu) ** 2
  return Math.sqrt(sum / arr.length)
}

/** Convert a single RGB triplet (0–255 each) to HSL. Returns [h, s, l] where s and l are 0–1. */
function rgbToHsl(rv, gv, bv) {
  const r = rv / 255
  const g = gv / 255
  const b = bv / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l   = (max + min) / 2

  if (max === min) return [0, 0, l]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else                h = ((r - g) / d + 4) / 6

  return [h, s, l]
}

/** Clamp a float to an integer in the range [0, 100]. */
function clamp100(v) {
  return Math.max(0, Math.min(100, Math.round(v)))
}

// ─── Individual analyzers ─────────────────────────────────────────────────────

/**
 * BRIGHTNESS
 * Measures average perceptual luminance (0–255).
 * Optimal band: 90–170. Score peaks at 130, falls linearly to 0 at the extremes.
 *
 * Why 90–170?
 *   Below 90 the image reads as dark/closed-off.
 *   Above 170 detail is lost; the image looks washed out.
 *   130 sits midway — typical well-exposed skin tone region.
 */
function analyzeBrightness(luma) {
  const avg  = mean(luma)
  const PEAK = 130
  const HALF = 65  // distance at which score falls to 0

  const distance = Math.abs(avg - PEAK)
  const score    = clamp100(Math.max(0, 1 - distance / HALF) * 100)

  return { score, raw: avg }
}

/**
 * CONTRAST
 * Measures population standard deviation of luminance values.
 * Higher std dev = more tonal separation between subject and background.
 *
 * Calibration:
 *   std dev < 15  → very flat (score ≈ 0)
 *   std dev = 45  → solid contrast (score ≈ 67)
 *   std dev ≥ 65  → strong contrast (score = 100)
 */
function analyzeContrast(luma) {
  const mu  = mean(luma)
  const sd  = stdDev(luma, mu)
  const MIN_SD = 15
  const MAX_SD = 65
  const clamped = Math.max(0, sd - MIN_SD)
  const score   = clamp100((clamped / (MAX_SD - MIN_SD)) * 100)

  return { score, raw: sd }
}

/**
 * SATURATION
 * Average HSL saturation across all pixels.
 * Optimal band: 0.22–0.65 (natural warmth, not oversaturated).
 *
 * Score is 100 inside the band, falls linearly outside it.
 * Very desaturated photos feel cold or clinical.
 * Oversaturated photos feel processed or unnatural.
 */
function analyzeSaturation(r, g, b) {
  const len    = r.length
  let totalSat = 0

  for (let i = 0; i < len; i++) {
    const [, s] = rgbToHsl(r[i], g[i], b[i])
    totalSat += s
  }

  const avg  = totalSat / len
  const LOW  = 0.22
  const HIGH = 0.65

  let score
  if (avg >= LOW && avg <= HIGH) {
    score = 100
  } else if (avg < LOW) {
    score = (avg / LOW) * 100
  } else {
    score = Math.max(0, (1 - (avg - HIGH) / (1 - HIGH)) * 100)
  }

  return { score: clamp100(score), raw: avg }
}

/**
 * COMPOSITION
 * Rule-of-thirds analysis. The image is divided into a 3×3 grid.
 * The four intersection points ("power points") are:
 *   (w/3, h/3), (2w/3, h/3), (w/3, 2h/3), (2w/3, 2h/3)
 *
 * Each power point zone (radius = w/8) has its average luminance measured.
 * If the zone average is higher than the global average, the subject is likely
 * in a strong compositional position.
 *
 * Score = how much the average power-point luminance exceeds the global average.
 *
 * Why luminance rather than edge density for composition?
 * Faces and subjects tend to be brighter than backgrounds in well-lit photos.
 * This is a lightweight proxy that avoids a full saliency map.
 */
function analyzeComposition(data, width, height) {
  const RADIUS = Math.max(2, Math.floor(width / 8))

  const powerPoints = [
    [Math.floor(width  / 3), Math.floor(height / 3)],
    [Math.floor(width  * 2 / 3), Math.floor(height / 3)],
    [Math.floor(width  / 3), Math.floor(height * 2 / 3)],
    [Math.floor(width  * 2 / 3), Math.floor(height * 2 / 3)],
  ]

  // Global average luminance
  let globalSum = 0
  const pixelCount = width * height
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4
    globalSum += 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]
  }
  const globalAvg = globalSum / pixelCount

  // Average luminance at each power point zone
  function zoneLuma(cx, cy) {
    let sum = 0, count = 0
    const x0 = Math.max(0, cx - RADIUS)
    const x1 = Math.min(width  - 1, cx + RADIUS)
    const y0 = Math.max(0, cy - RADIUS)
    const y1 = Math.min(height - 1, cy + RADIUS)

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const o = (y * width + x) * 4
        sum   += 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]
        count += 1
      }
    }
    return count > 0 ? sum / count : globalAvg
  }

  const zoneAvgs = powerPoints.map(([cx, cy]) => zoneLuma(cx, cy))
  const zoneAvg  = zoneAvgs.reduce((s, v) => s + v, 0) / zoneAvgs.length

  // Ratio > 1 means power zones are brighter than average → subject likely placed well
  const ratio = globalAvg > 0 ? zoneAvg / globalAvg : 1

  // Normalize: ratio 0.85 → 0, ratio 1.0 → 50, ratio 1.25+ → 100
  const score = clamp100(((ratio - 0.85) / 0.40) * 100)

  return { score, raw: ratio }
}

/**
 * SHARPNESS
 * Discrete Laplacian edge detection on a grayscale copy of the image.
 * Kernel applied at every interior pixel:
 *   [ 0  -1   0 ]
 *   [-1   4  -1 ]
 *   [ 0  -1   0 ]
 *
 * Average absolute response measures the density of edges.
 * High edge density = sharp image.
 * Low edge density = blurry, soft, or heavily filtered image.
 *
 * Calibration (empirically tuned on real photos):
 *   avgEdge < 2   → very blurry (score ≈ 0)
 *   avgEdge = 8   → acceptable sharpness (score ≈ 53)
 *   avgEdge ≥ 15  → clearly sharp (score = 100)
 */
function analyzeSharpness(data, width, height) {
  // Build a grayscale Float32Array
  const gray = new Float32Array(width * height)
  for (let i = 0; i < gray.length; i++) {
    const o    = i * 4
    gray[i]    = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]
  }

  let edgeSum = 0
  let count   = 0

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = gray[y       * width + x    ]
      const top    = gray[(y - 1) * width + x    ]
      const bottom = gray[(y + 1) * width + x    ]
      const left   = gray[y       * width + (x-1)]
      const right  = gray[y       * width + (x+1)]

      edgeSum += Math.abs(4 * center - top - bottom - left - right)
      count   += 1
    }
  }

  const avgEdge   = count > 0 ? edgeSum / count : 0
  const MAX_EDGE  = 15
  const score     = clamp100((avgEdge / MAX_EDGE) * 100)

  return { score, raw: avgEdge }
}

// ─── Observation text ─────────────────────────────────────────────────────────

function brightnessObs(score, raw) {
  if (raw < 50)  return 'Severely underexposed — the image reads as dark and closed-off.'
  if (raw < 90)  return 'Underlit — lifting exposure would improve immediate presence.'
  if (raw > 210) return 'Overexposed — highlight detail is lost and the image reads flat.'
  if (raw > 175) return 'Slightly bright — watch for blown-out highlight areas.'
  if (score >= 80) return 'Exposure is well-balanced — light is actively working in this photo\'s favor.'
  return 'Exposure is adequate; moderate brightening would improve the first-impression read.'
}

function contrastObs(score, raw) {
  if (raw < 12) return 'Very low contrast — the image is flat with almost no tonal separation.'
  if (raw < 25) return 'Low contrast — adding tonal depth would improve visual definition.'
  if (score >= 80) return 'Strong contrast — the subject reads with clarity and confidence.'
  if (score >= 55) return 'Moderate contrast — the image holds attention but could be sharper tonally.'
  return 'Below-average contrast; a slight curves adjustment would add visual weight.'
}

function saturationObs(score, raw) {
  if (raw < 0.08) return 'Near-monochrome — the absence of color reduces warmth and perceived energy.'
  if (raw < 0.20) return 'Muted palette — desaturation creates emotional distance between subject and viewer.'
  if (raw > 0.78) return 'Oversaturated — color intensity is distracting and reads as heavily processed.'
  if (raw > 0.68) return 'Slightly oversaturated — pulling back color slightly would look more natural.'
  if (score >= 80) return 'Color balance is natural and warm — it supports approachability and credibility.'
  return 'Saturation is in an acceptable range; a slight warmth shift may improve tone.'
}

function compositionObs(score, raw) {
  if (score >= 80) return 'Subject occupies a rule-of-thirds power point — composition feels intentional and confident.'
  if (score >= 55) return 'Composition is reasonable; the subject approaches a strong zone but doesn\'t fully commit.'
  if (score >= 35) return 'Subject appears centered or drifting from power zones — composition feels static.'
  return 'Visual weight is distributed away from strong compositional zones — the image lacks anchor.'
}

function sharpnessObs(score, raw) {
  if (score >= 80) return 'Image is sharp — edges are defined, the subject reads clearly at any size.'
  if (score >= 55) return 'Moderate sharpness — some softness present but not immediately distracting.'
  if (score >= 30) return 'Noticeable softness — the image may appear blurry at full size.'
  return 'Low sharpness — the image reads as out of focus or heavily filtered.'
}

/**
 * Generate a one- to two-sentence overall observation by identifying
 * the strongest and weakest scoring dimensions. Entirely deterministic.
 */
function overallObs(scores) {
  const dims = [
    { name: 'exposure',     score: scores.brightness.score },
    { name: 'contrast',     score: scores.contrast.score   },
    { name: 'color balance', score: scores.saturation.score },
    { name: 'composition',  score: scores.composition.score },
    { name: 'sharpness',    score: scores.sharpness.score  },
  ].sort((a, b) => b.score - a.score)

  const best   = dims[0]
  const worst  = dims[dims.length - 1]
  const total  = scores.total

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

  if (total >= 80) {
    return `Strong photo overall. ${cap(best.name)} is the standout quality here. The one area to address is ${worst.name}.`
  }
  if (total >= 62) {
    return `Solid photo with clear room to improve. ${cap(best.name)} is working well; ${worst.name} is the primary limitation.`
  }
  if (total >= 44) {
    return `This photo has potential. ${cap(best.name)} is its strongest quality, but ${worst.name} significantly weakens the first impression.`
  }
  return `This photo faces real challenges. ${cap(worst.name)} is the dominant issue. Consider replacing or reshooting before this photo leads a profile.`
}

// ─── Main exports ─────────────────────────────────────────────────────────────

/**
 * Analyze a single image.
 *
 * @param {string} src - A blob URL (`URL.createObjectURL(file)`) or data URL.
 * @returns {Promise<AnalysisResult>}
 */
export async function analyzeImage(src) {
  const imageData = await loadImageData(src)
  const { data, width, height } = imageData
  const { r, g, b, luma } = extractChannels(data)

  const brightness  = analyzeBrightness(luma)
  const contrast    = analyzeContrast(luma)
  const saturation  = analyzeSaturation(r, g, b)
  const composition = analyzeComposition(data, width, height)
  const sharpness   = analyzeSharpness(data, width, height)

  const total = clamp100(
    brightness.score  * 0.25 +
    contrast.score    * 0.25 +
    saturation.score  * 0.20 +
    composition.score * 0.20 +
    sharpness.score   * 0.10
  )

  const scores = {
    brightness:  { score: brightness.score,  raw: brightness.raw,  observation: brightnessObs(brightness.score,  brightness.raw)  },
    contrast:    { score: contrast.score,    raw: contrast.raw,    observation: contrastObs(contrast.score,    contrast.raw)    },
    saturation:  { score: saturation.score,  raw: saturation.raw,  observation: saturationObs(saturation.score,  saturation.raw)  },
    composition: { score: composition.score, raw: composition.raw, observation: compositionObs(composition.score, composition.raw) },
    sharpness:   { score: sharpness.score,   raw: sharpness.raw,   observation: sharpnessObs(sharpness.score,   sharpness.raw)   },
    total,
  }

  return {
    scores,
    overall: overallObs(scores),
  }
}

/**
 * Analyze all photos in a set and return them ranked by total score (highest first).
 * This is the primary entry point for UploadPage.
 *
 * @param {Array<{id: string, preview: string, name: string}>} photos
 * @returns {Promise<Array<{id, preview, name, rank, analysis}>>}
 */
export async function analyzeAll(photos) {
  const withAnalysis = await Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      analysis: await analyzeImage(photo.preview),
    }))
  )

  // Sort by total score descending, then assign rank (1 = strongest)
  withAnalysis.sort((a, b) => b.analysis.scores.total - a.analysis.scores.total)

  return withAnalysis.map((photo, index) => ({
    ...photo,
    rank: index + 1,
  }))
}
