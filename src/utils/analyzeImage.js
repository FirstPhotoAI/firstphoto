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

// ─── Technical dimension observations (used in collapsed Study Notes) ─────────

function brightnessObs(score, raw, lang) {
  if (lang === 'es') {
    if (raw < 50)    return 'Muy subexpuesta — la imagen se lee oscura y cerrada.'
    if (raw < 90)    return 'Poca luz — aumentar la exposición abriría la imagen considerablemente.'
    if (raw > 210)   return 'Sobreexpuesta — el detalle en las altas luces se pierde y la imagen se ve plana.'
    if (raw > 175)   return 'Ligeramente brillante — atención a las altas luces quemadas.'
    if (score >= 80) return 'La exposición está bien equilibrada — la luz trabaja activamente a favor de esta fotografía.'
    return 'La exposición es adecuada; un ajuste modesto de brillo mejoraría la lectura inmediata.'
  }
  if (raw < 50)    return 'Severely underexposed — the image reads as dark and closed-off.'
  if (raw < 90)    return 'Underlit — lifting exposure would open the image considerably.'
  if (raw > 210)   return 'Overexposed — highlight detail is lost and the image reads flat.'
  if (raw > 175)   return 'Slightly bright — watch for blown-out highlight areas.'
  if (score >= 80) return 'Exposure is well-balanced — light is actively working in this photograph\'s favor.'
  return 'Exposure is adequate; a modest brightness lift would improve the immediate read.'
}

function contrastObs(score, raw, lang) {
  if (lang === 'es') {
    if (raw < 12)    return 'Contraste muy bajo — la imagen es plana con casi ninguna separación tonal.'
    if (raw < 25)    return 'Bajo contraste — añadir profundidad tonal mejoraría la definición visual.'
    if (score >= 80) return 'Contraste fuerte — el sujeto y el fondo se leen con claridad y confianza.'
    if (score >= 55) return 'Contraste moderado — la imagen mantiene la atención pero podría ser más nítida tonalmente.'
    return 'Contraste por debajo de la media; un pequeño ajuste de curvas añadiría peso visual.'
  }
  if (raw < 12)    return 'Very low contrast — the image is flat with almost no tonal separation.'
  if (raw < 25)    return 'Low contrast — adding tonal depth would improve visual definition.'
  if (score >= 80) return 'Strong contrast — subject and background read with clarity and confidence.'
  if (score >= 55) return 'Moderate contrast — the image holds attention but could be sharper tonally.'
  return 'Below-average contrast; a slight curves adjustment would add visual weight.'
}

function saturationObs(score, raw, lang) {
  if (lang === 'es') {
    if (raw < 0.08)  return 'Casi monocroma — la ausencia de color traslada la imagen a un registro gráfico y editorial.'
    if (raw < 0.20)  return 'Paleta apagada — la saturación contenida crea distancia emocional y frialdad editorial.'
    if (raw > 0.78)  return 'Sobresaturada — la intensidad del color compite con el sujeto por la atención visual.'
    if (raw > 0.68)  return 'Ligeramente sobresaturada — reducir el color daría a la imagen una calidad más considerada.'
    if (score >= 80) return 'El equilibrio de color es natural — la saturación apoya la imagen sin dominarla.'
    return 'La saturación está en un rango funcional; un ligero ajuste de calidez puede mejorar el estado tonal.'
  }
  if (raw < 0.08)  return 'Near-monochrome — the absence of color shifts the image into a graphic, editorial register.'
  if (raw < 0.20)  return 'Muted palette — the restrained saturation creates emotional distance and editorial coolness.'
  if (raw > 0.78)  return 'Oversaturated — color intensity competes with the subject for visual attention.'
  if (raw > 0.68)  return 'Slightly oversaturated — pulling back color slightly would give the image a more considered quality.'
  if (score >= 80) return 'Color balance is natural — saturation supports the image without overpowering it.'
  return 'Saturation is within a functional range; a slight warmth adjustment may improve the tonal mood.'
}

function compositionObs(score, raw, lang) {
  if (lang === 'es') {
    if (score >= 80) return 'El sujeto ocupa un punto de poder del tercio — el encuadre es intencional y espacialmente seguro.'
    if (score >= 55) return 'La composición es razonable; el sujeto se acerca a una zona compositiva fuerte sin comprometerse del todo.'
    if (score >= 35) return 'El sujeto parece centrado o desplazado de las zonas de poder — el encuadre crea una energía visual estática.'
    return 'El peso visual se distribuye sin una dirección clara — al encuadre le falta un ancla compositiva decisiva.'
  }
  if (score >= 80) return 'Subject occupies a rule-of-thirds power point — the framing is intentional and spatially confident.'
  if (score >= 55) return 'Composition is reasonable; the subject approaches a strong compositional zone without fully committing.'
  if (score >= 35) return 'Subject appears centered or displaced from power zones — the framing creates a static visual energy.'
  return 'Visual weight is distributed without clear direction — the frame lacks a decisive compositional anchor.'
}

function sharpnessObs(score, raw, lang) {
  if (lang === 'es') {
    if (score >= 80) return 'La imagen es nítida — los bordes están bien definidos y el sujeto se lee claramente en cualquier tamaño.'
    if (score >= 55) return 'Nitidez moderada — hay cierta suavidad pero no distrae significativamente de la imagen.'
    if (score >= 30) return 'Suavidad notable — la imagen puede leerse borrosa a tamaño completo; puede ser intencional.'
    return 'Baja nitidez — la imagen se lee suave o difusa. En ciertos contextos esto es una elección estética deliberada.'
  }
  if (score >= 80) return 'The image is sharp — edges are well-defined and the subject reads clearly at any display size.'
  if (score >= 55) return 'Moderate sharpness — some softness is present but does not significantly distract from the image.'
  if (score >= 30) return 'Noticeable softness — the image may read as blurry at full size; may be intentional.'
  return 'Low sharpness — the image reads as soft or diffused. In certain contexts this is a deliberate aesthetic choice.'
}

// ─── Editorial feedback engine ────────────────────────────────────────────────
//
// Generates the full Visual Curator output: archetype, first_impression,
// curator_review, creative_highlights, growth_suggestions, keywords.
//
// All output is fully deterministic — same Canvas scores always produce the
// same feedback. No Math.random is used. Phrase selection uses a seed derived
// from the five dimension scores.

/** Deterministic seed from scores — no Math.random. */
function editorialSeed(scores) {
  const s = scores.brightness.score  * 7
          + scores.contrast.score    * 13
          + scores.saturation.score  * 11
          + scores.composition.score * 17
          + scores.sharpness.score   * 3
  return Math.floor(Math.abs(s)) % 997
}

/** Pick one item from an array using a deterministic index offset. */
function pick(n, offset, arr) {
  return arr[Math.abs(n + offset * 31) % arr.length]
}

/** Pick three distinct items from a pool, starting at a deterministic position. */
function pickThree(n, offset, pool) {
  const len = pool.length
  if (len === 0) return ['', '', '']
  if (len <= 3)  return [...pool, ...pool, ...pool].slice(0, 3)
  const a = Math.abs(n + offset) % len
  return [pool[a], pool[(a + 1) % len], pool[(a + 2) % len]]
}

// ─── Style detection ──────────────────────────────────────────────────────────

/**
 * Classify the photographic style from raw measurements.
 * Returns: 'cinematic' | 'minimalist' | 'film' | 'vibrant' | 'editorial' | 'natural'
 */
function detectStyle(scores) {
  const br = scores.brightness.raw
  const cr = scores.contrast.raw
  const sr = scores.saturation.raw
  const bs = scores.brightness.score
  const hs = scores.sharpness.score
  if (sr < 0.12)                         return 'minimalist'
  if (br < 100 && cr > 40)               return 'cinematic'
  if (cr < 28 && sr < 0.40 && hs < 60)  return 'film'
  if (sr > 0.65 && bs > 50)             return 'vibrant'
  if (bs > 60 && cr > 30)               return 'editorial'
  return 'natural'
}

// ─── Archetype determination ───────────────────────────────────────────────────

const ARCHETYPE_LIST = [
  'Quiet Confidence', 'Urban Storyteller', 'Creative Rebel',
  'Magnetic Presence', 'Elegant Minimalist', 'Cinematic Observer',
  'Modern Nomad', 'Visual Poet', 'Independent Spirit', 'Soft Nostalgia',
]

const ARCHETYPE_ES = {
  'Quiet Confidence':   'Confianza Silenciosa',
  'Urban Storyteller':  'Narrador Urbano',
  'Creative Rebel':     'Rebelde Creativo',
  'Magnetic Presence':  'Presencia Magnética',
  'Elegant Minimalist': 'Minimalista Elegante',
  'Cinematic Observer': 'Observador Cinematográfico',
  'Modern Nomad':       'Nómada Moderno',
  'Visual Poet':        'Poeta Visual',
  'Independent Spirit': 'Espíritu Independiente',
  'Soft Nostalgia':     'Nostalgia Suave',
}

function determineArchetype(scores, lang) {
  const bs = scores.brightness.score
  const cr = scores.contrast.raw
  const sr = scores.saturation.raw
  const ps = scores.composition.score
  const hs = scores.sharpness.score

  const t = {}
  ARCHETYPE_LIST.forEach(a => { t[a] = 0 })

  if (bs < 40) { t['Cinematic Observer'] += 28; t['Creative Rebel'] += 14 }
  else if (bs < 58) { t['Cinematic Observer'] += 14; t['Elegant Minimalist'] += 10 }
  else if (bs > 72) { t['Modern Nomad'] += 10; t['Urban Storyteller'] += 8 }

  if (cr > 55) { t['Magnetic Presence'] += 26; t['Cinematic Observer'] += 14; t['Creative Rebel'] += 8 }
  else if (cr > 35) { t['Quiet Confidence'] += 12; t['Urban Storyteller'] += 10 }
  else { t['Visual Poet'] += 8; t['Elegant Minimalist'] += 6 }

  if (sr < 0.10) { t['Soft Nostalgia'] += 32; t['Visual Poet'] += 24; t['Elegant Minimalist'] += 14 }
  else if (sr < 0.22) { t['Elegant Minimalist'] += 22; t['Visual Poet'] += 14; t['Cinematic Observer'] += 8 }
  else if (sr > 0.65) { t['Modern Nomad'] += 26; t['Creative Rebel'] += 10 }
  else if (sr > 0.50) { t['Modern Nomad'] += 14; t['Urban Storyteller'] += 10 }
  else { t['Quiet Confidence'] += 10; t['Independent Spirit'] += 10; t['Urban Storyteller'] += 6 }

  if (ps > 65) { t['Quiet Confidence'] += 20; t['Elegant Minimalist'] += 14; t['Magnetic Presence'] += 10 }
  else if (ps > 45) { t['Urban Storyteller'] += 14; t['Independent Spirit'] += 10 }
  else { t['Creative Rebel'] += 10; t['Independent Spirit'] += 6 }

  if (hs < 25) { t['Visual Poet'] += 20; t['Creative Rebel'] += 10 }

  const key = Object.entries(t).sort((a, b) => b[1] - a[1])[0][0]
  return lang === 'es' ? (ARCHETYPE_ES[key] ?? key) : key
}

// ─── First impression phrases ─────────────────────────────────────────────────

function buildFirstImpression(n, style, lang) {
  const OPENERS = lang === 'es' ? {
    cinematic:  ['Esta imagen transmite una gravedad inmediata — el contraste tonal crea una urgencia silenciosa que retiene la atención.', 'La fotografía se anuncia con sombra. Los tonos oscuros y el fuerte contraste generan un peso atmosférico que permanece en el espectador.', 'Una sensación de profundidad psicológica define esta imagen — el equilibrio de luz y oscuridad invita a leer bajo la superficie.'],
    minimalist: ['El color ha sido reducido, permitiendo que la forma y la estructura carguen con todo el peso de la imagen — una decisión editorial considerada.', 'La fotografía opera en un registro casi monocromático, dándole una cualidad gráfica que la sitúa en la tradición editorial.', 'Al reducir el color a tonos casi neutros, la imagen dirige la atención enteramente a la composición, la forma y la presencia del sujeto.'],
    film:       ['Los tonos suaves y el rango dinámico comprimido evocan la estética de la fotografía analógica — deliberadamente imprecisa y emocionalmente resonante.', 'Hay una cualidad soñadora y fílmica en la paleta — el contraste difuso y la saturación suave crean una imagen que parece recordada más que registrada.', 'La fotografía opera en un registro analógico y delicado — suave y cálido de una manera que favorece el trabajo íntimo e introspectivo.'],
    vibrant:    ['La paleta de color es audaz y declarativa — esta imagen hace una afirmación visual inmediata y no pide ser ignorada.', 'Saturada, luminosa y energéticamente presente — las elecciones de color dan a la imagen una confianza vívida y accesible.', 'La fotografía se anuncia a través del color — la saturación rica y el brillo fuerte le dan una energía inmediata y directa.'],
    editorial:  ['Esta imagen tiene la cualidad controlada de una entrega editorial — cada elemento visible parece considerado más que accidental.', 'La fotografía proyecta una autoridad tranquila. La composición y la exposición están en diálogo, creando una imagen que sabe lo que es.', 'Hay una precisión deliberada aquí — el encuadre y la luz han sido tratados como herramientas más que como valores predeterminados.'],
    natural:    ['La fotografía lleva una facilidad naturalista — los tonos equilibrados y el color honesto le dan un sentido inmediato de presencia.', 'La luz y el color trabajan juntos sin dramatismo, creando una imagen que se lee como no forzada y genuinamente ella misma.', 'La imagen tiene una cualidad cándida — el equilibrio tonal y el color se sienten menos como decisiones calculadas y más como documentación honesta.'],
  } : {
    cinematic:  ['There is an immediate gravity to this image — the tonal contrast creates a quiet urgency that holds the attention.', 'The photograph announces itself with shadow. Dark tones and strong contrast generate an atmospheric weight that stays with the viewer.', 'A sense of psychological depth defines this image — the balance of light and darkness invites the viewer to read beneath the surface.'],
    minimalist: ['Color has been stripped back, allowing form and structure to carry the full weight of the image — a considered editorial decision.', 'The photograph operates in a near-monochromatic register, giving it a graphic quality that places it in the editorial tradition.', 'By reducing color to near-neutral tones, the image directs attention entirely to composition, form, and the subject\'s own presence.'],
    film:       ['The soft tones and compressed dynamic range recall the aesthetic of analog photography — deliberately imprecise and emotionally resonant.', 'There is a dreamy, filmic quality to the palette — diffused contrast and gentle saturation create an image that feels remembered rather than recorded.', 'The photograph operates in a gentle, analog register — soft and warm in a way that favors introspective, intimate subject matter.'],
    vibrant:    ['The color palette is bold and declarative — this image makes an immediate visual statement and does not ask to be ignored.', 'Saturated, luminous, and energetically present — the color choices give the image a vivid and accessible confidence.', 'The photograph announces itself through color — rich saturation and strong brightness give it an immediate, forward energy.'],
    editorial:  ['This image has the controlled quality of an editorial submission — each visible element appears considered rather than accidental.', 'The photograph projects quiet authority. Composition and exposure are in conversation, creating an image that knows what it is.', 'There is deliberate precision here — framing and light have been treated as tools rather than defaults.'],
    natural:    ['The photograph carries a naturalistic ease — balanced tones and honest color give it an immediate sense of presence.', 'Light and color work together without drama, creating an image that reads as unforced and genuinely itself.', 'The image has a candid quality — the tonal balance and color feel less like calculated decisions and more like honest documentation.'],
  }
  const CLOSERS = lang === 'es' ? {
    cinematic:  ['El estado de ánimo es inmediatamente legible — esta imagen comunica antes de ser procesada conscientemente.', 'La atmósfera es el activo más poderoso de la imagen.'],
    minimalist: ['Comunica mediante la contención — diciendo más al incluir menos.', 'La economía visual aquí es el punto; todo lo innecesario ha sido eliminado.'],
    film:       ['Hay una nostalgia en esta imagen que no depende del contenido — viene de la luz misma.', 'La fotografía se siente como un recuerdo — suave en los bordes, emocionalmente inmediata en el centro.'],
    vibrant:    ['Hay una accesibilidad en esta imagen que no requiere traducción.', 'El color solo crea la primera conexión emocional.'],
    editorial:  ['Hay una preparación en esta imagen — cada decisión visual parece tomada más que llegada.', 'La imagen resiste la visión prolongada, que es la marca del trabajo visual deliberado.'],
    natural:    ['Se lee como honesta — y en fotografía, la autenticidad crea su propia autoridad.', 'La imagen gana su simplicidad en lugar de recurrir a ella.'],
  } : {
    cinematic:  ['The mood is immediately legible — this image communicates before it is consciously processed.', 'The atmosphere is the image\'s most powerful asset.'],
    minimalist: ['It communicates through restraint — saying more by including less.', 'The visual economy here is the point; everything unnecessary has been removed.'],
    film:       ['There is a nostalgia to this image that does not depend on content — it comes from the light itself.', 'The photograph feels like a memory — soft at the edges, emotionally immediate at the centre.'],
    vibrant:    ['There is an accessibility to this image that requires no translation.', 'Color alone creates the first emotional connection.'],
    editorial:  ['There is a readiness to this image — every visual decision feels made rather than arrived at.', 'The image holds up to extended viewing, which is the mark of deliberate visual work.'],
    natural:    ['It reads as honest — and in photography, authenticity creates its own authority.', 'The image earns its simplicity rather than defaulting to it.'],
  }
  const ops = OPENERS[style] || OPENERS.natural
  const cls = CLOSERS[style] || CLOSERS.natural
  return `${pick(n, 0, ops)} ${pick(n, 1, cls)}`
}

// ─── Curator review paragraphs ────────────────────────────────────────────────

function buildCuratorReview(n, style, scores, lang) {
  const cr    = scores.contrast.raw
  const sr    = scores.saturation.raw
  const ps    = scores.composition.score
  const total = scores.total

  const es = lang === 'es'

  const compHigh = es ? [
    'El encuadre refleja un instinto espacial seguro — el sujeto ha sido colocado con intención deliberada, y el espacio circundante se usa más que simplemente ocupa.',
    'Composicionalmente, la imagen revela una inteligencia visual real: el peso del sujeto ancla el marco sin dominarlo, y el espacio negativo se trata como un elemento productivo.',
    'La disposición espacial crea tensión natural — el sujeto dialoga con el marco restante en lugar de simplemente llenarlo, una decisión que da autoridad a la imagen.',
  ] : [
    'The framing reflects a confident spatial instinct — the subject has been placed with deliberate intention, and the surrounding space is used rather than simply occupied.',
    'Compositionally, the image reveals real visual intelligence: the weight of the subject anchors the frame without dominating it, and the negative space is treated as a productive element.',
    'The spatial arrangement creates natural tension — the subject sits in dialogue with the remaining frame rather than simply filling it, a decision that gives the image its authority.',
  ]
  const compMid = es ? [
    'El encuadre es funcional pero aún no del todo comprometido — el sujeto es claramente legible, pero el espacio circundante no ha sido aprovechado suficientemente.',
    'Composicionalmente, la imagen es competente sin ser decisiva. Una relación más considerada entre sujeto y fondo fortalecería la afirmación visual general.',
    'El marco sostiene el sujeto con claridad, pero las decisiones espaciales parecen llegadas más que planeadas — un ángulo o recorte ligeramente diferente podría introducir considerablemente más tensión.',
  ] : [
    'The framing is workable but not yet fully committed — the subject is clearly readable, but the surrounding space hasn\'t been made to work hard enough.',
    'Compositionally, the image is competent without being decisive. A more considered relationship between subject and background would strengthen the overall visual statement.',
    'The frame holds the subject clearly, but the spatial decisions feel arrived at rather than planned — a slightly different angle or crop could introduce considerably more tension.',
  ]
  const compLow = es ? [
    'La composición es donde esta imagen tiene mayor potencial de crecimiento — la colocación central crea una energía estática que un encuadre más asimétrico resolvería considerablemente.',
    'La disposición espacial necesita más intención. Anclar el sujeto en una intersección de tercios crearía una lectura visual más sofisticada y dinámica.',
    'El encuadre distribuye el peso visual sin dirigirlo. Tratar los bordes del marco como decisiones compositivas activas profundizaría la imagen considerablemente.',
  ] : [
    'Composition is where this image has the most potential to grow — central placement creates a static energy that more asymmetrical framing would resolve considerably.',
    'The spatial arrangement needs more intention. Anchoring the subject at a rule-of-thirds intersection would create a more sophisticated and dynamic visual read.',
    'The framing distributes visual weight without directing it. Treating the edges of the frame as active compositional decisions would deepen the image considerably.',
  ]
  const compPhrase = ps >= 60 ? pick(n, 10, compHigh) : ps >= 38 ? pick(n, 10, compMid) : pick(n, 10, compLow)

  const toneHigh = es ? [
    'El contraste tonal es audaz e intencionado — la separación entre luz y sombra crea autoridad visual que da a la imagen un carácter editorial inmediato.',
    'La sombra y la luz trabajan juntas en lugar de competir — el drama tonal está controlado y contribuye directamente a la intención atmosférica.',
  ] : [
    'The tonal contrast is bold and purposeful — the separation between light and shadow creates visual authority that gives the image an immediate editorial character.',
    'Shadow and highlight work together rather than competing — the tonal drama is controlled and contributes directly to the atmospheric intent.',
  ]
  const toneMid = es ? [
    'El rango tonal es medido — ni plano ni dramático, la imagen ocupa un término medio naturalista que se adapta a la fotografía documental y honesta.',
    'El nivel de contraste da a la imagen una cualidad factual y presente — limpia y directa sin buscar efecto dramático.',
  ] : [
    'The tonal range is measured — neither flat nor dramatic, the image occupies a naturalistic middle ground that suits documentary and honest portraiture.',
    'The contrast level gives the image a factual, present quality — clean and direct without reaching for dramatic effect.',
  ]
  const toneLow = es ? [
    'El rango tonal plano da a la imagen una suavidad que se lee como atmosférica — una estética asociada con la fotografía analógica, la niebla y el trabajo editorial introspectivo.',
    'El rango tonal comprimido crea un estado de ánimo suave y difuso — sea deliberado o circunstancial, da a la imagen una delicadeza particular que puede funcionar a su favor.',
  ] : [
    'The flat tonal range gives the image a softness that reads as atmospheric — an aesthetic associated with analog photography, fog, and introspective editorial work.',
    'The compressed tonal range creates a gentle, diffused mood — whether deliberate or circumstantial, it gives the image a particular delicacy that can work in its favor.',
  ]
  const tonePhrase = cr > 48 ? pick(n, 20, toneHigh) : cr > 28 ? pick(n, 20, toneMid) : pick(n, 20, toneLow)

  const colorPhrase = sr < 0.12 ? pick(n, 30, es ? [
    'La paleta casi monocromática desplaza la lectura enteramente hacia la forma y la luz — una elección editorial clásica con raíces profundas tanto en fotografía de moda como documental.',
    'El color ha sido casi completamente eliminado, colocando esta imagen en la tradición gráfica de la fotografía en blanco y negro — la estructura y la textura se convierten en el lenguaje visual primario.',
  ] : [
    'The near-monochromatic palette shifts the reading entirely to form and light — a classic editorial choice with deep roots in both fashion and documentary photography.',
    'Color has been almost entirely removed, placing this image in the graphic tradition of black-and-white photography — structure and texture become the primary visual language.',
  ]) : sr < 0.22 ? pick(n, 30, es ? [
    'La paleta de color apagada crea distancia emocional — un lenguaje visual asociado con el trabajo introspectivo, documental y editorial de moda.',
    'La saturación contenida da a la imagen una cualidad fría y considerada — el color está presente pero es subordinado, permitiendo que la forma y la luz lideren.',
  ] : [
    'The muted color palette creates emotional distance — a visual language associated with introspective, documentary, and fashion editorial work.',
    'The restrained saturation gives the image a cool, considered quality — color is present but subordinate, allowing form and light to lead.',
  ]) : sr < 0.55 ? pick(n, 30, es ? [
    'El color se usa con contención y honestidad — lo suficientemente presente para contribuir al estado de ánimo sin abrumar la afirmación visual.',
    'El nivel de saturación refleja una sensibilidad fiel a la cámara — la imagen se lee como genuina más que procesada.',
  ] : [
    'Color is used with restraint and honesty — present enough to contribute to mood without overwhelming the visual statement.',
    'The saturation level reflects a camera-faithful sensibility — the image reads as genuine rather than processed.',
  ]) : sr < 0.72 ? pick(n, 30, es ? [
    'La paleta de color es vívida e inmediata — la saturación rica da a la imagen una energía visual segura que atrae al espectador hacia el sujeto.',
    'El color funciona como un elemento compositivo activo — la riqueza de la paleta es parte de la identidad visual de la imagen más que ruido de fondo.',
  ] : [
    'The color palette is vivid and immediate — rich saturation gives the image a confident visual energy that draws the viewer toward the subject.',
    'Color is working as an active compositional element — the palette\'s richness is part of the image\'s visual identity rather than background noise.',
  ]) : pick(n, 30, es ? [
    'El nivel de saturación es audaz, aunque su intensidad comienza a competir con el sujeto por la atención — una reducción modesta restauraría el equilibrio compositivo.',
    'El color vívido crea energía comercial, aunque la intensidad actual puede reducir el registro editorial de la imagen — la contención en la paleta típicamente se lee como más considerada.',
  ] : [
    'The saturation level is bold, though its intensity begins to compete with the subject for attention — a modest reduction would restore compositional balance.',
    'Vivid color creates commercial energy, though the current intensity may reduce the image\'s editorial register — restraint in the palette typically reads as more considered.',
  ])

  const adviceHigh = es ? [
    'La imagen está en una posición sólida — el siguiente paso natural es extender este nivel de control visual a través de un cuerpo de trabajo consistente. Las series y secuencias revelan una voz fotográfica más claramente que las imágenes individuales.',
    'Desde esta base, considera trabajar más deliberadamente con la fuente y dirección de la luz. La confianza compositiva está establecida; la luz direccional añadiría profundidad dimensional que define el retrato de calidad de galería.',
    'El trabajo técnico y compositivo aquí soporta cualquier sujeto colocado frente al objetivo. Introducir más contexto narrativo — entorno, objeto o movimiento — daría al sujeto una historia en lugar de simplemente una presencia.',
  ] : [
    'The image is in a strong position — the natural next step is to extend this level of visual control across a consistent body of work. Series and sequences reveal a photographic voice more clearly than single images.',
    'From this foundation, consider working more deliberately with light source and direction. The compositional confidence is established; directional light would add dimensional depth that defines gallery-quality portraiture.',
    'The technical and compositional work here supports whatever subject is placed in front of the lens. Introducing more narrative context — environment, object, or movement — would give the subject a story rather than simply a presence.',
  ]
  const adviceMid = es ? [
    'La mayor oportunidad de desarrollo está en el encuadre — experimentar con una colocación más asimétrica y más atención a los bordes del marco fortalecería significativamente el impacto visual.',
    'Introducir un pensamiento compositivo más deliberado elevaría esta imagen considerablemente — disparar varios fotogramas a diferentes distancias y ángulos, y luego compararlos, a menudo revela la opción más fuerte inmediatamente.',
    'Los cimientos son sólidos. Trabajar en la relación entre sujeto y fondo — separándolos tonalmente o incluyendo contexto ambiental — movería la imagen de técnicamente adecuada a visualmente convincente.',
  ] : [
    'The strongest opportunity for development lies in the framing — experimenting with more asymmetrical placement and closer attention to the edges of the frame would significantly strengthen the visual impact.',
    'Introducing more deliberate compositional thinking would elevate this image considerably — shooting several frames at different distances and angles, then comparing them, often reveals the strongest option immediately.',
    'The foundations are solid. Working on the relationship between subject and background — separating them tonally or including environmental context — would move the image from technically adequate to visually compelling.',
  ]
  const adviceLow = es ? [
    'La imagen tiene cualidades visuales que vale la pena preservar — el estado de ánimo y el carácter tonal son genuinamente interesantes. Centrarse en la composición y la colocación de la luz en la próxima sesión daría a esas cualidades una estructura más sólida.',
    'El cambio más impactante sería compositivo — comprometerse con la colocación del sujeto y eliminar el ruido visual de los bordes del marco. Un recorte más ajustado o un cambio de ángulo es un punto de partida productivo.',
    'La atmósfera aquí es real — comunica algo. Canalizar ese instinto en un encuadre más preciso y una luz controlada daría a la calidad emocional de la imagen una base técnica más sólida.',
  ] : [
    'The image has visual qualities worth preserving — the mood and tonal character are genuinely interesting. Focusing on composition and light placement in the next session would give those qualities a stronger structure to operate within.',
    'The most impactful single change would be compositional — committing to the subject\'s placement and eliminating visual noise from the edges of the frame. A tighter crop or change of angle is a productive starting point.',
    'The atmosphere here is real — it communicates something. Channeling that instinct into more precise framing and controlled light would give the image\'s emotional quality a stronger technical foundation.',
  ]
  const advicePhrase = total >= 72 ? pick(n, 40, adviceHigh) : total >= 50 ? pick(n, 40, adviceMid) : pick(n, 40, adviceLow)

  return `${compPhrase} ${tonePhrase} ${colorPhrase} ${advicePhrase}`
}

// ─── Creative highlights ──────────────────────────────────────────────────────

function buildCreativeHighlights(n, style, scores, lang) {
  const cr = scores.contrast.raw
  const sr = scores.saturation.raw
  const ps = scores.composition.score
  const hs = scores.sharpness.score
  const es = lang === 'es'

  const pool = []

  if (ps >= 65) {
    pool.push(es ? 'El encuadre demuestra una verdadera conciencia espacial — el sujeto está colocado con intención y el espacio negativo contribuye activamente al significado de la imagen.' : 'The framing demonstrates genuine spatial awareness — the subject is placed with intention and the negative space actively contributes to the image\'s meaning.')
    pool.push(es ? 'La estructura compositiva crea una jerarquía visual que guía el ojo naturalmente sin sentirse mecánica o artificiosa.' : 'The compositional structure creates a visual hierarchy that guides the eye naturally without feeling mechanical or contrived.')
  } else if (ps >= 45) {
    pool.push(es ? 'El sujeto está colocado claramente dentro del marco — inmediatamente legible, lo que forma una base compositiva sólida sobre la que construir.' : 'The subject is placed clearly within the frame — immediately readable, which forms a reliable compositional foundation to build on.')
  }

  if (cr > 50) {
    pool.push(es ? 'El contraste tonal entre sujeto y entorno crea el tipo de separación visual que define la fotografía editorial y cinematográfica.' : 'The tonal contrast between subject and environment creates the kind of visual separation that defines editorial and cinematic photography.')
    pool.push(es ? 'El rango tonal oscuro y comprimido genera una profundidad atmosférica que da a la imagen un fuerte carácter cinematográfico.' : 'The dark, compressed tonal range generates an atmospheric depth that gives the image a strong cinematic character.')
  } else if (cr > 28) {
    pool.push(es ? 'El equilibrio tonal refleja una comprensión de cómo la luz puede servir a un sujeto sin dominarlo — una valiosa contención compositiva.' : 'The tonal balance reflects an understanding of how light can serve a subject without overpowering it — a valuable compositional restraint.')
  }

  if (sr < 0.12) {
    pool.push(es ? 'La paleta casi monocromática posiciona la imagen en la tradición editorial gráfica — al eliminar el color, la imagen obliga a cada otro elemento visual a cargar más peso.' : 'The near-monochromatic palette positions the image in the graphic editorial tradition — by removing color, the image forces every other visual element to carry more weight.')
    pool.push(es ? 'La decisión de trabajar casi en blanco y negro demuestra confianza — la forma, la luz y la estructura se convierten en el argumento visual completo.' : 'The decision to work in near-black-and-white demonstrates confidence — form, light, and structure become the entire visual argument.')
  } else if (sr < 0.22) {
    pool.push(es ? 'La paleta de color apagada crea una calidad introspectiva y editorial — la saturación contenida es una elección estética deliberada y efectiva.' : 'The muted color palette creates an introspective, editorial quality — the restrained saturation is a deliberate and effective aesthetic choice.')
  } else if (sr <= 0.55) {
    pool.push(es ? 'El nivel de saturación natural sugiere un ojo para el color auténtico más que para la mejora procesada — la imagen se lee como honesta y presente.' : 'The natural saturation level suggests an eye for authentic color rather than processed enhancement — the image reads as honest and present.')
  } else {
    pool.push(es ? 'La paleta de color vívida tiene un impacto visual inmediato — el color se usa como elemento activo de narración más que como cualidad superficial pasiva.' : 'The vivid color palette makes an immediate visual impact — color is used as an active storytelling element rather than a passive surface quality.')
  }

  if (hs >= 70) pool.push(es ? 'La ejecución técnica es segura — la imagen es nítida y bien definida, dando al trabajo compositivo y de color pleno espacio para expresarse.' : 'Technical execution is confident — the image is sharp and well-defined, giving the compositional and color work full room to express itself.')
  if (hs < 30)  pool.push(es ? 'La calidad de enfoque suave crea una dimensión fílmica y atmosférica — técnicamente imprecisa de una manera que amplía el registro emocional de la imagen.' : 'The soft focus quality creates a filmic, atmospheric dimension — technically imprecise in a way that expands the emotional register of the image.')

  if (style === 'cinematic') pool.push(es ? 'El estado de ánimo es inmediatamente legible — la imagen comunica un registro emocional distinto antes de que el espectador haya procesado conscientemente las decisiones técnicas.' : 'The mood is immediately legible — the image communicates a distinct emotional register before the viewer has consciously processed the technical choices.')
  if (style === 'film')      pool.push(es ? 'La cualidad analógica y fílmica da a la imagen un carácter atemporal — la estética se sitúa fuera de la tendencia y más cerca de la tradición fotográfica.' : 'The analog, filmic quality gives the image a timeless character — the aesthetic sits outside of trend and closer to photographic tradition.')
  if (style === 'editorial') pool.push(es ? 'La imagen tiene una disposición editorial — las decisiones visuales reflejan un enfoque considerado del sujeto, la luz y el espacio que va más allá de la simple documentación.' : 'The image has an editorial readiness — the visual decisions reflect a considered approach to subject, light, and space that goes beyond simple documentation.')

  if (pool.length < 3) {
    pool.push(es ? 'La imagen tiene una lógica visual coherente — la relación entre la luz, el espacio y el sujeto principal se lee como considerada más que accidental.' : 'The image has a coherent visual logic — the relationship between light, space, and the main subject reads as considered rather than accidental.')
    pool.push(es ? 'Hay una autenticidad en esta imagen que la sola precisión técnica no puede fabricar — la fotografía se siente presente e intencionada más que construida.' : 'There is an authenticity to this image that technical precision alone cannot manufacture — the photograph feels present and purposeful rather than constructed.')
    pool.push(es ? "El estado de ánimo de la imagen es su cualidad más fuerte — la atmósfera y el registro emocional están presentes y son consistentes en todo el marco." : 'The image\'s mood is its strongest quality — atmosphere and emotional register are present and consistent throughout the frame.')
  }

  return pickThree(n, 50, pool)
}

// ─── Growth suggestions ───────────────────────────────────────────────────────

function buildGrowthSuggestions(n, scores, lang) {
  const cr = scores.contrast.raw
  const sr = scores.saturation.raw
  const ps = scores.composition.score
  const hs = scores.sharpness.score
  const bs = scores.brightness.score
  const es = lang === 'es'

  const pool = []

  if (ps < 65) {
    pool.push(es ? 'Experimenta colocando el sujeto en una intersección de tercios en lugar de en el centro del marco — este único cambio crea significativamente más tensión visual y movimiento.' : 'Experiment with placing the subject at a rule-of-thirds intersection rather than in the centre of the frame — this single shift creates significantly more visual tension and movement.')
    pool.push(es ? 'Dispara varios fotogramas a diferentes distancias y ángulos dentro de la misma sesión y compáralos al editar — las decisiones compositivas a menudo se revelan a través de la variación más que de la planificación.' : 'Shoot several frames at different distances and angles within the same session and compare them in editing — compositional decisions often reveal themselves through variation rather than planning.')
    pool.push(es ? 'Trabaja con los bordes del marco más deliberadamente — lo que se excluye de una imagen es tan importante como lo que se incluye. Un recorte más ajustado puede fortalecer considerablemente el material existente.' : 'Work with the edges of the frame more deliberately — what is excluded from an image is as important as what is included. A tighter crop may considerably strengthen the existing material.')
    pool.push(es ? 'Intenta disparar desde un ángulo más bajo de lo que se siente natural — los cambios de perspectiva alteran la relación de poder entre el sujeto y el entorno, produciendo a menudo una disposición espacial más dinámica.' : 'Try shooting from a lower angle than feels natural — perspective shifts alter the power relationship between subject and environment, often producing a more dynamic spatial arrangement.')
  }

  if (cr < 35) {
    pool.push(es ? 'Introduce una sola fuente de luz direccional — luz de ventana, una lámpara o luz solar directa — en lugar de luz ambiente difusa. Las sombras que crea definirán la forma del sujeto y añadirán profundidad visual significativa.' : 'Introduce a single, directional light source — window light, a lamp, or direct sunlight — rather than diffused ambient lighting. The shadows it creates will define the subject\'s form and add significant visual depth.')
    pool.push(es ? 'Revisa tus imágenes convertidas a blanco y negro — la separación tonal se vuelve inmediatamente visible sin la distracción del color, facilitando identificar dónde se necesita contraste.' : 'Review your images converted to black and white — tonal separation becomes immediately visible without the distraction of color, making it easier to identify where contrast is needed.')
    pool.push(es ? 'Intenta disparar durante la hora dorada o la hora azul, cuando la luz disponible introduce contraste natural y calidez tonal que la luz del mediodía o interior raramente ofrece.' : 'Try shooting during golden hour or blue hour, when available light introduces natural contrast and tonal warmth that midday or indoor light rarely offers.')
  }

  if (sr > 0.70) {
    pool.push(es ? 'Considera reducir la saturación entre un 10–20% en postprocesado — una paleta de color más sutil a menudo se lee como más considerada y extiende la longevidad visual de la imagen.' : 'Consider reducing the saturation by 10–20% in post-processing — a subtler color palette often reads as more considered and extends the image\'s visual longevity.')
    pool.push(es ? 'Experimenta en entornos donde el color está naturalmente limitado — fondos neutros, cielos nublados — y observa cómo el sujeto se lee diferente cuando el color no compite por la atención.' : 'Experiment with shooting in environments where color is naturally limited — neutral backgrounds, overcast skies — and observe how the subject reads differently when color is not competing for attention.')
  } else if (sr < 0.15) {
    pool.push(es ? 'Introduce un solo acento de color — un objeto, un elemento de fondo o una prenda — y observa cómo una elección de color deliberada puede transformar la temperatura emocional de una imagen.' : 'Introduce a single color accent — an object, a background element, or a piece of wardrobe — and observe how one deliberate color choice can transform the emotional temperature of an image.')
  } else {
    pool.push(es ? 'Considera el color de la vestimenta y el fondo como decisiones fotográficas activas — un fondo neutro o de un solo color da a la imagen una lectura visual más limpia y considerada.' : 'Consider wardrobe and background color as active photographic decisions — a neutral or single-color background gives the image a cleaner, more considered visual read.')
  }

  if (hs < 40) {
    pool.push(es ? 'Experimenta con enfoque manual o bloqueo de enfoque en el punto más cercano de interés visual — la zona más nítida del marco es donde el ojo del espectador descansa primero naturalmente, por lo que la decisión de enfoque también es una decisión compositiva.' : 'Experiment with manual focus or focus-lock on the nearest point of visual interest — the sharpest area in the frame is where the viewer\'s eye naturally rests first, so the focus decision is also a compositional one.')
    pool.push(es ? 'Usa una velocidad de obturación ligeramente más alta para eliminar el movimiento de cámara — la suavidad por movimiento y la suavidad por enfoque deliberado son herramientas diferentes que producen efectos emocionales diferentes.' : 'Use a slightly higher shutter speed to eliminate camera shake — softness from motion and softness from deliberate focus are different tools that produce different emotional effects, and distinguishing between them gives more precise control.')
  }

  if (bs < 45) {
    pool.push(es ? 'Introduce una fuente de luz secundaria — un reflector, una lámpara o una ventana más brillante — para levantar las áreas de sombra sin eliminar el estado de ánimo atmosférico que el bajo contraste crea.' : 'Introduce a secondary light source — a reflector, a lamp, or a brighter window — to lift the shadow areas without eliminating the atmospheric mood that the low key creates.')
  }

  pool.push(es ? 'Dispara más fotogramas dentro de la misma sesión — el primer fotograma raramente es el más fuerte. La imagen se encuentra a sí misma a medida que la sesión continúa, y los marcos más convincentes a menudo aparecen una vez que se han tomado y probado las decisiones iniciales.' : 'Shoot more frames within the same session — the first frame is rarely the strongest. The image finds itself as the session continues, and the most compelling frames often appear once the initial decisions have been made and tested.')
  pool.push(es ? 'Introduce un elemento ambiental — una textura, un trozo de arquitectura, una fuente de luz visible — que dé a la imagen contexto y un sentido de lugar más allá del sujeto inmediato.' : 'Introduce an environmental element — a texture, a piece of architecture, a visible light source — that gives the image context and a sense of place beyond the immediate subject.')
  pool.push(es ? 'Estudia el trabajo de un fotógrafo cuya estética resuene con la tuya y analiza específicamente cómo usa el espacio, la luz y el tiempo — el análisis del trabajo existente es una de las rutas más rápidas para desarrollar una voz fotográfica.' : 'Study the work of one photographer whose aesthetic resonates with yours and analyse specifically how they use space, light, and timing — analysis of existing work is one of the fastest routes to developing a photographic voice.')
  pool.push(es ? 'Piensa en el estado emocional que quieres que la imagen comunique antes de disparar — luego toma cada decisión técnica en servicio de esa sensación más que en servicio de la corrección técnica.' : 'Think about the emotional state you want the image to communicate before you shoot — then make every technical decision in service of that feeling rather than in service of technical correctness.')

  return pickThree(n, 60, pool)
}

// ─── Keywords ─────────────────────────────────────────────────────────────────

function buildKeywords(n, style, scores, lang) {
  const sr = scores.saturation.raw
  const cr = scores.contrast.raw
  const bs = scores.brightness.score
  const ps = scores.composition.score
  const hs = scores.sharpness.score
  const es = lang === 'es'

  const pool = []
  if (style === 'cinematic')  pool.push(...(es ? ['cinematográfico', 'atmosférico', 'dramático', 'claroscuro', 'nocturno']    : ['cinematic', 'atmospheric', 'moody', 'chiaroscuro', 'nocturnal']))
  if (style === 'minimalist') pool.push(...(es ? ['minimalista', 'gráfico', 'monocromático', 'contenido', 'arquitectónico']   : ['minimalist', 'graphic', 'monochromatic', 'restrained', 'architectural']))
  if (style === 'film')       pool.push(...(es ? ['fílmico', 'analógico', 'nostálgico', 'suave', 'texturado']                 : ['filmic', 'analog', 'nostalgic', 'soft', 'textured']))
  if (style === 'vibrant')    pool.push(...(es ? ['vívido', 'energético', 'audaz', 'saturado', 'inmediato']                   : ['vivid', 'energetic', 'bold', 'saturated', 'immediate']))
  if (style === 'editorial')  pool.push(...(es ? ['editorial', 'compuesto', 'intencional', 'preciso', 'considerado']          : ['editorial', 'composed', 'intentional', 'precise', 'considered']))
  if (style === 'natural')    pool.push(...(es ? ['naturalista', 'cándido', 'honesto', 'cálido', 'documental']                : ['naturalistic', 'candid', 'honest', 'warm', 'documentary']))

  if (ps > 60)   pool.push(...(es ? ['intencional', 'estructurado', 'compuesto']       : ['intentional', 'structured', 'composed']))
  if (cr > 45)   pool.push(...(es ? ['dramático', 'alto contraste', 'definido']        : ['dramatic', 'high-contrast', 'defined']))
  if (sr < 0.18) pool.push(...(es ? ['desaturado', 'atemporal', 'gráfico']             : ['desaturated', 'timeless', 'graphic']))
  if (hs < 30)   pool.push(...(es ? ['suave', 'onírico', 'impresionista']              : ['soft', 'dreamy', 'impressionistic']))
  if (bs < 45)   pool.push(...(es ? ['oscuro', 'bajo contraste', 'juego de sombras']   : ['dark', 'low-key', 'shadow-play']))

  pool.push(...(es
    ? ['introspectivo', 'observacional', 'íntimo', 'contemplativo', 'pensativo']
    : ['introspective', 'observational', 'intimate', 'contemplative', 'pensive']
  ))

  const unique = [...new Set(pool)]
  return pickThree(n, 70, unique).concat([unique[(Math.abs(n) + 73) % unique.length]])
}

// ─── Main editorial builder ───────────────────────────────────────────────────

/**
 * Build the full Visual Curator feedback object from Canvas analysis scores.
 * No external API required — all output is deterministic.
 *
 * PERMANENT AUDIT RULE — applied before every phrase in this engine:
 *   "Would this feedback still make sense if the subject were not physically attractive?"
 *   If the answer is no, the phrase must be rewritten.
 *   All feedback addresses the photograph as a visual work, never the person's appearance.
 *
 * @param {object} scores — the scores object from analyzeImage
 * @param {string} lang   — 'es' (default) or 'en'
 * @returns {{ archetype, firstImpression, curatorReview, creativeHighlights, growthSuggestions, keywords }}
 */
function buildEditorialFeedback(scores, lang = 'es') {
  const n         = editorialSeed(scores)
  const style     = detectStyle(scores)
  const archetype = determineArchetype(scores, lang)

  return {
    archetype,
    firstImpression:    buildFirstImpression(n, style, lang),
    curatorReview:      buildCuratorReview(n, style, scores, lang),
    creativeHighlights: buildCreativeHighlights(n, style, scores, lang),
    growthSuggestions:  buildGrowthSuggestions(n, scores, lang),
    keywords:           buildKeywords(n, style, scores, lang),
  }
}

// ─── Portfolio feedback engine ────────────────────────────────────────────────
//
// Compares photos as a portfolio set and selects the strongest by narrative
// criteria (composition × 0.35, contrast × 0.30, saturation × 0.20,
// sharpness × 0.10, brightness × 0.05).  All output is deterministic.

function portfolioSeed(rankedPhotos) {
  let acc = 0
  rankedPhotos.forEach((p, i) => {
    const s = p.analysis.scores
    acc += s.total * (i + 1) * 7 + s.composition.score * 13 + s.contrast.score * 5
  })
  return Math.floor(Math.abs(acc)) % 997
}

function portfolioSelectionScore(scores) {
  return (
    scores.composition.score * 0.35 +
    scores.contrast.score    * 0.30 +
    scores.saturation.score  * 0.20 +
    scores.sharpness.score   * 0.10 +
    scores.brightness.score  * 0.05
  )
}

function buildSelectionReason(n, style, totalPhotos, lang) {
  const es = lang === 'es'
  const OPENERS = es ? {
    cinematic:  ['Entre las fotografías enviadas, esta imagen lleva el mayor peso narrativo.', 'De las imágenes revisadas, esta fotografía demuestra la atmósfera visual más deliberada.'],
    minimalist: ['Esta imagen logra algo que las demás no: dice más mostrando menos.', 'Donde las otras fotografías compiten por la atención, esta la gana a través de la contención.'],
    film:       ['Esta imagen se distingue por una cualidad tonal que las otras fotografías no poseen.', 'La paleta apagada y el tono medido dan a esta fotografía una profundidad a la que las demás aún aspiran.'],
    vibrant:    ['Entre las fotografías enviadas, esta imagen se compromete más plenamente con su energía visual.', 'Esta fotografía es la más decisiva en su uso del color y la atmósfera.'],
    editorial:  ['De las imágenes presentadas, esta fotografía muestra la intención editorial más clara.', 'Esta imagen es la más compuesta del conjunto — su estructura parece considerada más que incidental.'],
    natural:    ['Esta fotografía logra la relación más equilibrada entre sujeto y entorno.', 'Entre las imágenes revisadas, esta se siente más a gusto con su propio lenguaje visual.'],
  } : {
    cinematic:  ['Among the photographs submitted, this image carries the strongest narrative weight.', 'Of the images reviewed, this photograph demonstrates the most deliberate visual atmosphere.'],
    minimalist: ['This image achieves something the others do not: it says more by showing less.', 'Where the other photographs compete for attention, this one earns it through restraint.'],
    film:       ['This image distinguishes itself through a tonal quality the other photographs lack.', 'The subdued palette and measured tone give this photograph a depth the others are still reaching for.'],
    vibrant:    ['Among the photographs submitted, this image commits most fully to its visual energy.', 'This photograph is the most decisive in its use of color and atmosphere.'],
    editorial:  ['Of the images presented, this photograph shows the clearest editorial intention.', 'This image is the most composed of the set — its structure feels considered rather than incidental.'],
    natural:    ['This photograph achieves the most balanced relationship between subject and environment.', 'Among the images reviewed, this one feels the most at ease with its own visual language.'],
  }
  const BODIES = es ? {
    cinematic:  ['El contraste y la profundidad tonal crean una sensación de gravedad difícil de fabricar — o existe en una imagen o no. Aquí existe. Las otras fotografías son técnicamente competentes, pero esta tiene presencia.', 'Los tonos oscuros y las sombras controladas sugieren autoría. Cada decisión visual parece tomada más que accidental, dando al espectador algo específico a seguir.'],
    minimalist: ['La contención en fotografía es una de las cualidades más difíciles de lograr deliberadamente. Esta imagen demuestra una comprensión de que el marco en sí es una herramienta compositiva — lo que se excluye importa tanto como lo que se incluye.', 'La paleta desaturada elimina la distracción y dirige al espectador precisamente a donde la imagen quiere que mire. Este nivel de control editorial es aparente y efectivo.'],
    film:       ['La cualidad analógica de esta imagen refleja una elección sobre cómo deben representarse la memoria y la atmósfera. Las otras fotografías son más nítidas, pero la nitidez no es lo mismo que la claridad.', 'El rango tonal suave y el contraste comprimido dan a esta imagen una cualidad atemporal que las demás aún no han encontrado. Es la más distintamente autorada del conjunto.'],
    vibrant:    ['El color aquí es un lenguaje, no decoración. La saturación y la luminancia trabajan en acuerdo para crear una imagen que es inmediatamente legible y emocionalmente directa. Las otras fotografías son más cautelosas; esta tiene convicción.', 'Hay confianza en cómo esta imagen usa todo el rango de su historia de color. La decisión de comprometerse plenamente con esta energía visual es lo que la separa del resto del portfolio.'],
    editorial:  ['La claridad compositiva de esta imagen sugiere un fotógrafo que entiende cómo el ojo se mueve a través de un marco. Las otras fotografías tienen elementos individuales fuertes, pero esta parece arquitectónicamente completa.', 'Lo que distingue a esta fotografía no es ninguna decisión técnica singular sino el efecto acumulativo de varias decisiones correctas tomadas a la vez: luz, encuadre y tono trabajando juntos.'],
    natural:    ['Hay una cualidad de facilidad en esta imagen que las otras fotografías aún persiguen. Cuando una fotografía parece no artificiosa, es porque el fotógrafo ha aprendido a confiar en la escena — esa confianza es visible aquí.', 'El rango tonal natural y la composición abierta crean un sentido de luz y espacio que el espectador instintivamente confía. De las imágenes enviadas, esta es la más honesta consigo misma.'],
  } : {
    cinematic:  ['The contrast and tonal depth create a sense of gravity that is difficult to manufacture — it either exists in an image or it does not. Here, it does. The other photographs are technically competent, but this one has presence.', 'The dark tones and controlled shadows suggest authorship. Each visual decision appears made rather than accidental, giving the viewer something specific to follow.'],
    minimalist: ['Restraint in photography is one of the hardest qualities to achieve deliberately. This image demonstrates an understanding that the frame itself is a compositional tool — what is excluded matters as much as what is included.', 'The desaturated palette removes distraction and directs the viewer precisely where the image wants them to look. This level of editorial control is apparent and effective.'],
    film:       ['The film-adjacent quality of this image reflects a choice about how memory and atmosphere should be rendered. The other photographs are sharper, but sharpness is not the same as clarity.', 'The soft tonal range and compressed contrast give this image a timeless quality the others have not yet found. It is the most distinctly authored of the set.'],
    vibrant:    ['Color here is a language, not decoration. The saturation and luminance work in agreement to create an image that is immediately legible and emotionally direct. The other photographs are more cautious; this one has conviction.', 'There is confidence in how this image uses the full range of its color story. The decision to commit fully to this visual energy is what separates it from the rest of the portfolio.'],
    editorial:  ['The compositional clarity of this image suggests a photographer who understands how the eye moves through a frame. The other photographs have strong individual elements, but this one feels architecturally complete.', 'What sets this photograph apart is not any single technical decision but the cumulative effect of several right choices made at once: light, framing, and tone all working together.'],
    natural:    ['There is a quality of ease in this image that the other photographs are still pursuing. When a photograph feels uncontrived, it is because the photographer has learned to trust the scene — that confidence is visible here.', 'The natural tonal range and open composition create a sense of light and space that the viewer instinctively trusts. Of the images submitted, this one is the most honest with itself.'],
  }
  const CLOSERS = es ? [
    `De las ${totalPhotos} imágenes revisadas, esta es la que se recordará.`,
    'Esta es la imagen en el portfolio que más claramente sabe lo que es.',
    'Como primera fotografía, esta imagen posiciona el trabajo con intención y confianza.',
    'Un revisor que se encuentre con esta imagen por primera vez se detendría — y ese es el estándar que más importa.',
  ] : [
    `Of the ${totalPhotos} images reviewed, this is the one that will be remembered.`,
    'This is the image in the portfolio that most clearly knows what it is.',
    'As a first photograph, this image positions the work with intention and confidence.',
    'A reviewer encountering this image for the first time would stop — and that is the standard that matters most.',
  ]
  const pool  = OPENERS[style] || OPENERS.natural
  const bPool = BODIES[style]  || BODIES.natural
  return [pick(n, 0, pool), pick(n, 1, bPool), pick(n, 2, CLOSERS)].join(' ')
}

function buildImageReview(n, idx, style, lang) {
  const es = lang === 'es'
  const REVIEWS = es ? {
    cinematic:  ['El rango tonal aquí es su cualidad más distintiva — las áreas oscuras están manejadas con cuidado, y el contraste crea una sensación de profundidad que atrae el ojo hacia adentro.',
                 'Hay atmósfera en esta imagen. La exposición controlada y el manejo de sombras sugieren un fotógrafo pensando en el estado de ánimo, no solo en la claridad.',
                 'Esta fotografía lidera con sentimiento más que con información. La iluminación de bajo contraste y los tonos comprimidos crean una intensidad tranquila que la separa de interpretaciones más literales.'],
    minimalist: ['La simplicidad es la fortaleza de esta imagen. La paleta desaturada y el espacio negativo abierto crean espacio para la interpretación — una cualidad que recompensa la visión prolongada.',
                 'Esta fotografía pide al espectador que se detenga. La información mínima de color y la composición austera crean una cualidad contemplativa que es fácil de subestimar.',
                 'La contención aquí es su cualidad más comunicativa. Lo que la imagen elige no mostrar es tan intencional como lo que muestra — una señal de madurez compositiva.'],
    film:       ['El rango tonal suave da a esta imagen una cualidad que se siente más como memoria que como documentación. Las elecciones de procesado crean una distancia nostálgica que es estéticamente distintiva.',
                 'Hay una gentileza en esta fotografía que sus lecturas técnicas no capturan del todo. La paleta apagada y los bordes suaves crean una calidez atmosférica que es inmediatamente reconocible como un estilo visual.',
                 'Esta imagen tiene una calidad de observación sin prisa. El tono fílmico y la representación de bajo contraste le dan un sentido de tiempo y lugar que las imágenes más nítidas del portfolio no comparten.'],
    vibrant:    ['El color es el lenguaje principal de esta imagen. El nivel de saturación es confiado y comprometido — esta no es una fotografía que dude de su identidad visual.',
                 'La energía proviene de su pleno compromiso con la luminosidad y la presencia del color. Es la imagen más inmediatamente legible en términos de estado de ánimo: directa e inequívoca.',
                 'Esta fotografía tiene convicción en su uso del espectro de color. La vivacidad es una elección sobre cómo debe mostrarse el mundo, y se hace sin disculpas.'],
    editorial:  ['La estructura compositiva de esta imagen es su cualidad más fuerte. El encuadre y el equilibrio tonal crean una fotografía que parece intencionalmente construida más que capturada.',
                 'Hay una cualidad editorial en la luz y la composición aquí — esta imagen podría situarse cómodamente en un contexto de maquetación sin ajuste.',
                 'Esta fotografía demuestra claridad compositiva: los elementos están dispuestos para mover el ojo a través del marco con intención. Es la imagen más arquitectónicamente considerada del conjunto.'],
    natural:    ['Hay una cualidad no artificiosa en esta imagen. La luz natural y la composición abierta crean una fotografía que parece observada más que escenificada.',
                 'El rango tonal natural y la composición medida dan a esta fotografía un sentido de autenticidad — no intenta ser más de lo que es, y esa honestidad es visualmente legible.',
                 'Esta imagen funciona porque no parece estar funcionando. La facilidad compositiva y el manejo de la luz natural crean una fotografía que invita a la visión prolongada sin exigirla.'],
  } : {
    cinematic:  ['The tonal range here is its most distinctive quality — dark areas are handled with care, and the contrast creates a sense of depth that draws the eye inward.',
                 'There is atmosphere in this image. The controlled exposure and shadow management suggest a photographer thinking about mood, not just clarity.',
                 'This photograph leads with feeling rather than information. The low-key lighting and compressed tones create a quiet intensity that separates it from more literal interpretations.'],
    minimalist: ["Simplicity is this image's strength. The desaturated palette and open negative space create room for interpretation — a quality that rewards extended viewing.",
                 'This photograph asks the viewer to slow down. The minimal color information and spare composition create a contemplative quality that is easy to underestimate.',
                 "The restraint here is its most communicative quality. What the image chooses not to show is as intentional as what it shows — a sign of compositional maturity."],
    film:       ['The soft tonal range gives this image a quality that feels more like memory than documentation. The processing choices create a nostalgic distance that is aesthetically distinctive.',
                 'There is a gentleness to this photograph that its technical readings do not fully capture. The muted palette and soft edges create an atmospheric warmth that is immediately recognizable as a visual style.',
                 'This image has a quality of unhurried observation. The film-adjacent tone and low-contrast rendering give it a sense of time and place the sharper images in the portfolio do not share.'],
    vibrant:    ["Color is this image's primary language. The saturation level is confident and committed — this is not a photograph hedging its visual identity.",
                 'The energy comes from its full commitment to brightness and color presence. It is the most immediately legible image in terms of mood: direct and unambiguous.',
                 'This photograph has conviction in its use of the color spectrum. The vibrancy is a choice about how the world should be shown, and it is made without apology.'],
    editorial:  ['The compositional structure of this image is its strongest quality. The framing and tonal balance create a photograph that feels purposefully constructed rather than captured.',
                 'There is an editorial quality to the light and composition here — this image could sit comfortably in a layout context without adjustment.',
                 'This photograph demonstrates compositional clarity: the elements are arranged to move the eye through the frame with intention. It is the most architecturally considered image of the set.'],
    natural:    ['There is an uncontrived quality to this image. The natural light and open composition create a photograph that feels observed rather than staged.',
                 'The natural tonal range and measured composition give this photograph a sense of authenticity — it does not try to be more than it is, and that honesty is visually legible.',
                 'This image works because it does not appear to be working. The compositional ease and natural light handling create a photograph that invites extended looking without demanding it.'],
  }
  const pool = REVIEWS[style] || REVIEWS.natural
  return pool[Math.abs(n + idx * 31) % pool.length]
}

function buildWhatMakesWinnerStronger(n, winnerScores, otherScores, lang) {
  const avgComp = otherScores.length
    ? otherScores.reduce((s, o) => s + o.composition.score, 0) / otherScores.length : 0
  const avgCont = otherScores.length
    ? otherScores.reduce((s, o) => s + o.contrast.score,    0) / otherScores.length : 0
  const es = lang === 'es'

  const COMP_WIN = es ? ['Fuerte equilibrio compositivo', 'Uso deliberado del espacio negativo', 'Estructura espacial intencional', 'Decisiones de encuadre claras']
                      : ['Strong compositional balance', 'Deliberate use of negative space', 'Intentional spatial structure', 'Clear framing decisions']
  const COMP_PAR = es ? ['Profundidad atmosférica', 'Coherencia ambiental', 'Colocación de luz considerada']
                      : ['Atmospheric depth', 'Environmental coherence', 'Considered light placement']
  const CONT_WIN = es ? ['Atmósfera cinematográfica', 'Contraste tonal dinámico', 'Profundidad y dimensión fuertes', 'Calidad de luz dramática']
                      : ['Cinematic atmosphere', 'Dynamic tonal contrast', 'Strong depth and dimension', 'Dramatic light quality']
  const CONT_PAR = es ? ['Calidad tonal medida', 'Exposición controlada', 'Tono de luz consistente']
                      : ['Measured tonal quality', 'Controlled exposure', 'Consistent light tone']
  const IDENTITY = es ? ['Identidad visual clara', 'Perspectiva creativa distinta', 'Lenguaje visual consistente', 'Presencia autoral']
                      : ['Clear visual identity', 'Distinct creative perspective', 'Consistent visual language', 'Authorial presence']

  return [
    winnerScores.composition.score > avgComp + 8 ? pick(n, 0, COMP_WIN) : pick(n, 0, COMP_PAR),
    winnerScores.contrast.score    > avgCont + 8 ? pick(n, 1, CONT_WIN) : pick(n, 1, CONT_PAR),
    pick(n, 2, IDENTITY),
  ]
}

function buildFutureExploration(n, portfolioStyle, lang) {
  const es = lang === 'es'
  const SUGGESTIONS = es ? {
    cinematic:  ['Luz al atardecer o al amanecer', 'Focal más larga', 'Paleta de color consistente'],
    minimalist: ['Serie de un solo sujeto', 'Experimento con recorte cuadrado', 'Espacio negativo más profundo'],
    film:       ['ISO fijo, sin procesado', 'Trabajo en locación nublada', 'Documentación a largo plazo'],
    vibrant:    ['Paleta de color desconocida', 'Teoría del color aplicada', 'Estudio de luz todo el día'],
    editorial:  ['Serie temática de seis imágenes', 'Composición consciente del diseño', 'Tres encuadres, una escena'],
    natural:    ['Volver a un mismo lugar', 'Práctica de seguir la luz', 'Observación sin prisa'],
  } : {
    cinematic:  ['Dusk or dawn lighting', 'Longer focal length', 'Consistent color grade'],
    minimalist: ['Single-subject series', 'Square crop experiment', 'Deeper negative space'],
    film:       ['Fixed ISO, no processing', 'Overcast location work', 'Long-form documentation'],
    vibrant:    ['Unfamiliar color palette', 'Applied color theory', 'Full-day light study'],
    editorial:  ['Six-image themed series', 'Layout-aware composition', 'Three framings, one scene'],
    natural:    ['Return to one location', 'Follow-the-light practice', 'Unhurried observation'],
  }
  return SUGGESTIONS[portfolioStyle] || SUGGESTIONS.natural
}

function atmosphereScore(scores) {
  return (
    scores.contrast.score    * 0.35 +
    scores.saturation.score  * 0.35 +
    scores.composition.score * 0.30
  )
}

function buildSequenceReason(n, role, style, lang) {
  const es = lang === 'es'
  const ja = lang === 'ja'

  const OPENING = es ? {
    cinematic:  'Establece el tono atmosférico de la serie. Su peso visual prepara al espectador para el estado de ánimo que siguen las demás imágenes.',
    minimalist: 'Abre con contención y claridad. Menos información al inicio deja espacio para que el resto de la serie respire.',
    film:       'Introduce la serie con una cualidad de memoria y tiempo. El tono suave orienta la lectura hacia la atmósfera más que hacia el detalle.',
    vibrant:    'Entra con energía visual inmediata. El color y la luminosidad definen el tono emocional antes de que las otras imágenes amplíen la historia.',
    editorial:  'Presenta la serie con intención compositiva clara. El encuadre guía al espectador desde la primera imagen.',
    natural:    'Abre con una lectura honesta y directa. La luz natural y la composición abierta invitan a entrar en la serie sin artificio.',
  } : ja ? {
    cinematic:  'シリーズの空気感を最初に示す一枚。視覚的な重みが、続く写真の読み方を整えます。',
    minimalist: '余白と抑制で始まる。冒頭の静けさが、後続の写真の呼吸を作ります。',
    film:       '記憶や時間の質感で始まる。柔らかなトーンが、細部よりも雰囲気を先に伝えます。',
    vibrant:    '色と明るさで即座に感情を示す。シリーズ全体の温度を最初に決めます。',
    editorial:  '構図の意図がはっきりした入口。最初の一枚が視線の動きを導きます。',
    natural:    '自然光と素直な構図で始まる。飾らない入り口がシリーズへの扉になります。',
  } : {
    cinematic:  'Sets the atmospheric tone of the series. Its visual weight prepares the viewer for the mood the other images follow.',
    minimalist: 'Opens with restraint and clarity. Less information at the start leaves room for the rest of the series to breathe.',
    film:       'Introduces the series with a quality of memory and time. The soft tone orients reading toward atmosphere over detail.',
    vibrant:    'Enters with immediate visual energy. Color and brightness define the emotional temperature before the other images expand the story.',
    editorial:  'Presents the series with clear compositional intention. The framing guides the viewer from the first image.',
    natural:    'Opens with an honest, direct read. Natural light and open composition invite entry without artifice.',
  }

  const SUPPORTING = es ? {
    cinematic:  'Mantiene la tensión visual entre apertura y cierre. Refuerza el tono sin repetir el mismo gesto.',
    minimalist: 'Sostiene el ritmo con quietud. Actúa como pausa entre la entrada y la conclusión.',
    film:       'Profundiza la atmósfera sin cerrar la historia. Conecta los tonos entre la primera y la última imagen.',
    vibrant:    'Amplía la paleta emocional. Aporta variación sin romper la coherencia del conjunto.',
    editorial:  'Desarrolla la estructura visual de la serie. Cada encuadre añade una capa al argumento fotográfico.',
    natural:    'Continúa la observación con la misma calma. Une las imágenes a través de la luz y el espacio.',
  } : ja ? {
    cinematic:  '冒頭と余韻の間に視覚的な緊張を保つ。同じ動きの反復ではなく、トーンを重ねます。',
    minimalist: '静けさでリズムを支える。入口と結びの間にある呼吸になります。',
    film:       '物語を閉じずに空気感を深める。最初と最後の写真をつなぎます。',
    vibrant:    '感情の幅を広げる。シリーズの統一感を保ちながら変化を加えます。',
    editorial:  '視覚的な構造を展開する。各フレームが写真の論点を一段深めます。',
    natural:    '同じ静かな観察を続ける。光と空間で前後の写真を結びます。',
  } : {
    cinematic:  'Holds visual tension between opening and closing. Reinforces tone without repeating the same gesture.',
    minimalist: 'Sustains rhythm through quiet. Acts as a pause between entry and conclusion.',
    film:       'Deepens atmosphere without closing the story. Connects tones between the first and last images.',
    vibrant:    'Expands the emotional palette. Adds variation without breaking the set\'s coherence.',
    editorial:  'Develops the series\' visual structure. Each frame adds a layer to the photographic argument.',
    natural:    'Continues observation with the same calm. Links images through light and space.',
  }

  const CLOSING = es ? {
    cinematic:  'Cierra con presencia y peso. La imagen deja una impresión que permanece después de ver la serie completa.',
    minimalist: 'Concluye con la misma contención del inicio. El cierre es silencioso pero memorable.',
    film:       'Termina con una sensación de tiempo detenido. La atmósfera queda suspendida en la memoria del espectador.',
    vibrant:    'Cierra con la mayor intensidad emocional del conjunto. El color y la luz sellan la lectura de la serie.',
    editorial:  'Concluye con la composición más resuelta. El último encuadre completa el arco visual de la serie.',
    natural:    'Cierra con una lectura serena y definitiva. La luz natural deja la serie en un punto de reposo.',
  } : ja ? {
    cinematic:  '存在感で締めくくる。シリーズ全体を見終えたあとも残る印象を残します。',
    minimalist: '冒頭と同じ抑制で終わる。静かだが記憶に残る結びです。',
    film:       '時間が止まった感覚で終わる。空気感が見終わった後も漂います。',
    vibrant:    '最も感情の強い一枚で締める。色と光がシリーズの読みを確定します。',
    editorial:  '最も整った構図で終わる。最後のフレームが視覚的な弧を完成させます。',
    natural:    '穏やかで確かな読みで終える。自然光がシリーズを静かな余韻で閉じます。',
  } : {
    cinematic:  'Closes with presence and weight. The image leaves an impression that stays after viewing the full series.',
    minimalist: 'Concludes with the same restraint as the opening. The ending is quiet but memorable.',
    film:       'Ends with a sense of stopped time. Atmosphere remains suspended in the viewer\'s memory.',
    vibrant:    'Closes with the set\'s strongest emotional intensity. Color and light seal the series reading.',
    editorial:  'Concludes with the most resolved composition. The final frame completes the visual arc.',
    natural:    'Closes with a calm, definitive read. Natural light leaves the series at a point of rest.',
  }

  const pool = role === 'opening' ? OPENING : role === 'closing' ? CLOSING : SUPPORTING
  return pool[style] || pool.natural
}

/**
 * Recommend a display order: opening → supporting → closing.
 * Returns items with indices into the rankedPhotos array.
 */
function buildSuggestedSequence(n, rankedPhotos, lang = 'es') {
  if (!rankedPhotos?.length) return { order: [], items: [] }

  if (rankedPhotos.length === 1) {
    const style = detectStyle(rankedPhotos[0].analysis.scores)
    return {
      order: [0],
      items: [{ index: 0, role: 'opening', reason: buildSequenceReason(n, 'opening', style, lang) }],
    }
  }

  const scored = rankedPhotos.map((photo, index) => ({
    index,
    photo,
    pScore: portfolioSelectionScore(photo.analysis.scores),
    atmScore: atmosphereScore(photo.analysis.scores),
  }))

  scored.sort((a, b) => b.pScore - a.pScore)
  const opener = scored[0]
  const rest   = scored.slice(1)

  rest.sort((a, b) => b.atmScore - a.atmScore)
  const closer = rest[0]
  const middle = rest.slice(1).sort((a, b) => b.pScore - a.pScore)

  const ordered = [opener, ...middle, closer]

  const items = ordered.map((slot, seqIdx) => {
    const role = seqIdx === 0
      ? 'opening'
      : seqIdx === ordered.length - 1
        ? 'closing'
        : 'supporting'
    const style = detectStyle(slot.photo.analysis.scores)
    return {
      index:  slot.index,
      role,
      reason: buildSequenceReason(n, role, style, lang),
    }
  })

  return { order: items.map((i) => i.index), items }
}

function buildSeriesObservation(n, rankedPhotos, portfolioStyle, lang = 'es') {
  const es = lang === 'es'
  const ja = lang === 'ja'
  const count = rankedPhotos.length

  const totals = rankedPhotos.map((p) => p.analysis.scores.total)
  const avgTotal = totals.reduce((s, v) => s + v, 0) / count
  const spread   = Math.max(...totals) - Math.min(...totals)

  const avgBr = rankedPhotos.reduce((s, p) => s + p.analysis.scores.brightness.raw,  0) / count
  const avgCr = rankedPhotos.reduce((s, p) => s + p.analysis.scores.contrast.raw,    0) / count
  const avgSat = rankedPhotos.reduce((s, p) => s + p.analysis.scores.saturation.raw, 0) / count

  const archetypes = [...new Set(rankedPhotos.map((p) => p.analysis.editorial.archetype).filter(Boolean))]

  const MOOD = es ? {
    dark:     'El conjunto se inclina hacia tonos contenidos y una atmósfera reflexiva. Las imágenes comparten un estado de ánimo más introspectivo que celebratorio.',
    bright:   'La serie respira luminosidad. Hay apertura visual y una sensación de claridad que atraviesa las fotografías como un hilo común.',
    muted:    'El estado de ánimo es contenido y uniforme. Las imágenes hablan en un registro visual bajo, coherente y deliberado.',
    vibrant:  'La energía emocional es visible en todo el conjunto. Color y luz trabajan juntos para crear una serie con temperatura alta.',
    balanced: 'El tono emocional se mantiene equilibrado entre las imágenes. Ni demasiado sombrío ni demasiado efusivo — una lectura moderada y consistente.',
  } : ja ? {
    dark:     '全体は抑えたトーンと内省的な空気感に傾いています。祝祭的というより、静かに見つめる系列です。',
    bright:   '明るさがシリーズを貫いています。開放的な視覚感覚が共通の糸になっています。',
    muted:    'ムードは控えめで統一されています。低い視覚的レジスターで、意図的に語りかけます。',
    vibrant:  '感情の温度が高い系列です。色と光が一体となってエネルギーを作っています。',
    balanced: '感情のトーンは中庸で安定しています。暗すぎず、派手すぎない一貫した読みです。',
  } : {
    dark:     'The set leans toward contained tones and a reflective atmosphere. The images share a more introspective than celebratory mood.',
    bright:   'The series breathes luminosity. Visual openness and clarity run through the photographs as a common thread.',
    muted:    'The mood is restrained and even. The images speak in a low, coherent, deliberate visual register.',
    vibrant:  'Emotional energy is visible across the set. Color and light work together to create a series with high temperature.',
    balanced: 'The emotional tone stays balanced across images. Neither too somber nor too effusive — a moderate, consistent read.',
  }

  let moodKey = 'balanced'
  if      (avgBr < 95 && avgCr > 38) moodKey = 'dark'
  else if (avgBr > 145)              moodKey = 'bright'
  else if (avgSat > 0.55)            moodKey = 'vibrant'
  else if (avgSat < 0.18)            moodKey = 'muted'

  const RHYTHM = es ? {
    even:    'Las imágenes mantienen un ritmo parejo. Ninguna rompe bruscamente con las demás — la serie se lee como una secuencia continua.',
    varied:  'Hay contraste de intensidad entre las fotografías. Esa variación crea un ritmo visual: momentos de calma alternados con mayor peso.',
    dynamic: 'El ritmo es claramente dinámico. Cada imagen aporta un cambio de energía que mantiene la atención a lo largo de la serie.',
  } : ja ? {
    even:    '各写真の強度はおおむね揃っています。系列は途切れず、一続きの流れとして読めます。',
    varied:  '写真ごとに強度の差があります。静と動の交替が、視覚的なリズムを生んでいます。',
    dynamic: 'リズムは明確にダイナミックです。各枚がエネルギーの変化を加え、注意を保ちます。',
  } : {
    even:    'The images maintain an even rhythm. None breaks sharply from the others — the series reads as a continuous sequence.',
    varied:  'There is contrast in intensity between photographs. That variation creates visual rhythm: moments of calm alternating with greater weight.',
    dynamic: 'The rhythm is clearly dynamic. Each image adds a shift in energy that holds attention across the series.',
  }

  let rhythmKey = 'even'
  if      (spread > 22) rhythmKey = 'dynamic'
  else if (spread > 12) rhythmKey = 'varied'

  const CONSISTENCY = es ? {
    tight:   'Las decisiones visuales se repiten con coherencia: tono, contraste y composición hablan el mismo idioma en todas las imágenes.',
    mixed:   'Hay una base visual compartida, con variaciones deliberadas. La serie se siente unificada pero no repetitiva.',
    diverse: 'Las imágenes exploran registros visuales distintos. La coherencia está en la intención, no en la repetición formal.',
  } : ja ? {
    tight:   'トーン、コントラスト、構図が一貫しています。視覚的な言語が系列全体で揃っています。',
    mixed:   '共通の基盤の上に、意図的な変化があります。統一感がありながら、単調ではありません。',
    diverse: '各写真は異なる視覚的レジスターを探ります。一致しているのは形式より意図です。',
  } : {
    tight:   'Visual decisions repeat with coherence: tone, contrast, and composition speak the same language across all images.',
    mixed:   'There is a shared visual foundation with deliberate variation. The series feels unified but not repetitive.',
    diverse: 'The images explore distinct visual registers. Coherence lives in intention, not formal repetition.',
  }

  let consistencyKey = 'mixed'
  if      (avgSat < 0.20 || portfolioStyle === 'minimalist') consistencyKey = 'tight'
  else if (archetypes.length >= Math.min(count, 3))          consistencyKey = 'diverse'

  const NARRATIVE = es ? {
    unified:  'Las fotografías cuentan una historia coherente. El espectador puede seguir un hilo emocional de principio a fin.',
    layered:  'La narrativa se construye en capas. Cada imagen añade una perspectiva distinta sobre el mismo territorio visual.',
    open:     'La serie deja preguntas abiertas. Las imágenes se relacionan por atmósfera más que por argumento lineal — y eso es intencional.',
  } : ja ? {
    unified:  '写真は一つの物語として読めます。感情の糸を最初から最後まで辿れます。',
    layered:  '物語は層を重ねて構築されます。各枚が同じ視覚的領域の異なる面を見せます。',
    open:     '系列は問いを開いたままにします。直線的な論理より空気感で結ばれています。',
  } : {
    unified:  'The photographs tell a coherent story. The viewer can follow an emotional thread from start to finish.',
    layered:  'The narrative builds in layers. Each image adds a different perspective on the same visual territory.',
    open:     'The series leaves questions open. The images relate through atmosphere more than linear argument — and that is intentional.',
  }

  let narrativeKey = 'layered'
  if      (archetypes.length <= 1) narrativeKey = 'unified'
  else if (archetypes.length >= count - 1) narrativeKey = 'open'

  return {
    mood:         MOOD[moodKey],
    rhythm:       RHYTHM[rhythmKey],
    consistency:  CONSISTENCY[consistencyKey],
    narrative:    NARRATIVE[narrativeKey],
  }
}

/**
 * Build a cross-portfolio comparative analysis.
 * Called after all photos are individually analyzed and ranked.
 *
 * @param {Array<{id, preview, name, rank, analysis}>} rankedPhotos
 * @returns {{ selected_image, visual_identity, selection_reason, image_reviews,
 *             what_makes_the_winner_stronger, future_exploration }}
 */
function buildPortfolioFeedback(rankedPhotos, lang = 'es') {
  if (!rankedPhotos || rankedPhotos.length === 0) return null

  const n = portfolioSeed(rankedPhotos)

  const scored = rankedPhotos.map((p, i) => ({
    index: i,
    photo: p,
    pScore: portfolioSelectionScore(p.analysis.scores),
  }))
  scored.sort((a, b) => b.pScore - a.pScore)
  const winner      = scored[0]
  const selectedImage = winner.index + 1

  const winnerScores = winner.photo.analysis.scores
  const winnerStyle  = detectStyle(winnerScores)
  const otherScores  = rankedPhotos
    .filter((_, i) => i !== winner.index)
    .map(p => p.analysis.scores)

  const avgSat = rankedPhotos.reduce((s, p) => s + p.analysis.scores.saturation.raw, 0) / rankedPhotos.length
  const avgBr  = rankedPhotos.reduce((s, p) => s + p.analysis.scores.brightness.raw,  0) / rankedPhotos.length
  const avgCr  = rankedPhotos.reduce((s, p) => s + p.analysis.scores.contrast.raw,    0) / rankedPhotos.length
  let portfolioStyle = winnerStyle
  if      (avgSat < 0.15)              portfolioStyle = 'minimalist'
  else if (avgBr  < 95 && avgCr > 38) portfolioStyle = 'cinematic'
  else if (avgSat > 0.60)              portfolioStyle = 'vibrant'

  return {
    selected_image:                 selectedImage,
    visual_identity:                winner.photo.analysis.editorial.archetype,
    selection_reason:               buildSelectionReason(n, winnerStyle, rankedPhotos.length, lang),
    image_reviews:                  rankedPhotos.map((p, i) => ({
      image:  i + 1,
      title:  p.analysis.editorial.archetype,
      review: buildImageReview(n, i, detectStyle(p.analysis.scores), lang),
    })),
    what_makes_the_winner_stronger: buildWhatMakesWinnerStronger(n, winnerScores, otherScores, lang),
    future_exploration:             buildFutureExploration(n, portfolioStyle, lang),
    suggested_sequence:             buildSuggestedSequence(n, rankedPhotos, lang),
    series_observation:             buildSeriesObservation(n, rankedPhotos, portfolioStyle, lang),
  }
}

// ─── Main exports ─────────────────────────────────────────────────────────────

/**
 * Analyze a single image.
 *
 * @param {string} src - A blob URL (`URL.createObjectURL(file)`) or data URL.
 * @returns {Promise<AnalysisResult>}
 */
export async function analyzeImage(src, lang = 'es') {
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
    brightness:  { score: brightness.score,  raw: brightness.raw,  observation: brightnessObs(brightness.score,  brightness.raw,  lang) },
    contrast:    { score: contrast.score,    raw: contrast.raw,    observation: contrastObs(contrast.score,    contrast.raw,    lang) },
    saturation:  { score: saturation.score,  raw: saturation.raw,  observation: saturationObs(saturation.score,  saturation.raw,  lang) },
    composition: { score: composition.score, raw: composition.raw, observation: compositionObs(composition.score, composition.raw, lang) },
    sharpness:   { score: sharpness.score,   raw: sharpness.raw,   observation: sharpnessObs(sharpness.score,   sharpness.raw,   lang) },
    total,
  }

  const editorial = buildEditorialFeedback(scores, lang)

  return {
    scores,
    overall: editorial.firstImpression,
    editorial,
  }
}

/**
 * Generate a one-sentence curator caption from archetype + category + scores.
 *
 * Format (EN): "A street photograph shaped by urban storyteller and cinematic atmosphere."
 * Format (ES): "Una fotografía callejera marcada por narrador urbano y atmósfera cinematográfica."
 *
 * @param {string} archetype — the localized archetype name (e.g. "Confianza Silenciosa")
 * @param {string} category  — the entry's category (ES or EN name)
 * @param {object} scores    — scores object from analyzeImage
 * @param {string} lang      — 'es' (default) or 'en'
 */
export function buildCuratorCaption(archetype, category, scores, lang = 'es') {
  if (!archetype) return ''

  const n     = editorialSeed(scores)
  const style = detectStyle(scores)

  // Scene noun — handles both ES and EN stored category names
  const SCENE = lang === 'es' ? {
    Portrait:        'retrato',                    Retrato:         'retrato',
    Fashion:         'imagen de moda',             Moda:            'imagen de moda',
    Street:          'fotografía callejera',       Calle:           'fotografía callejera',
    Travel:          'fotografía de viaje',        Viaje:           'fotografía de viaje',
    Editorial:       'imagen editorial',
    'Black & White': 'estudio en blanco y negro',  'Blanco y Negro': 'estudio en blanco y negro',
    Experimental:    'exploración visual',
    'Film Look':     'imagen analógica',           'Look Analógico': 'imagen analógica',
  } : {
    Portrait:        'portrait',                   Retrato:         'portrait',
    Fashion:         'fashion image',              Moda:            'fashion image',
    Street:          'street photograph',          Calle:           'street photograph',
    Travel:          'travel photograph',          Viaje:           'travel photograph',
    Editorial:       'editorial image',
    'Black & White': 'monochrome study',           'Blanco y Negro': 'monochrome study',
    Experimental:    'visual experiment',
    'Film Look':     'film-look image',            'Look Analógico': 'film-look image',
  }

  const scene = SCENE[category] ?? (lang === 'es' ? 'imagen' : 'photograph')

  // Atmosphere phrase by style
  const ATMOS_ES = {
    cinematic:  ['atmósfera cinematográfica', 'profundidad visual oscura', 'tensión dramática contenida'],
    minimalist: ['claridad gráfica deliberada', 'elegancia de línea formal', 'precisión estructural'],
    film:       ['calidez analógica', 'sensibilidad fílmica evocadora', 'textura de película suave'],
    vibrant:    ['energía cromática directa', 'luminosidad declarativa', 'viveza visual intensa'],
    editorial:  ['contención editorial', 'precisión narrativa', 'autoridad visual tranquila'],
    natural:    ['atmósfera contemplativa', 'luz auténtica y suave', 'presencia serena'],
  }
  const ATMOS_EN = {
    cinematic:  ['cinematic atmosphere', 'deep visual gravity', 'contained dramatic tension'],
    minimalist: ['deliberate graphic clarity', 'elegant formal restraint', 'structural precision'],
    film:       ['analog warmth', 'soft filmic texture', 'evocative grain'],
    vibrant:    ['direct chromatic energy', 'declarative luminosity', 'visual vitality'],
    editorial:  ['editorial restraint', 'narrative precision', 'quiet visual authority'],
    natural:    ['contemplative atmosphere', 'authentic light', 'serene presence'],
  }

  // ── Japanese: fixed gallery-wall captions per archetype ─────────────────────
  // Each sentence is a single curator observation — under 40 characters.
  // No score language, no attractiveness language, no exclamation marks.
  // Handles EN, ES, and JA stored archetype names.
  if (lang === 'ja') {
    const JA_CAPTIONS = {
      // EN names
      'Visual Poet':            'この写真には、言葉にならない感情の余韻が静かに残されている。',
      'Urban Storyteller':      '街の空気や人の気配が、一枚の中に自然に溶け込んでいる。',
      'Quiet Confidence':       '大きな主張はないが、確かな存在感が画面全体を支えている。',
      'Independent Spirit':     '周囲に合わせるのではなく、自分自身の視点を大切にした写真。',
      'Cinematic Observer':     'まるで映画のワンシーンのように、時間の流れを感じさせる。',
      'Creative Rebel':         '既存の表現にとらわれず、新しい見方を試みている。',
      'Modern Nomad':           '移動することそのものが、この写真の物語になっている。',
      'Elegant Minimalist':     '余計なものを削ぎ落とし、本質だけが残されている。',
      'Soft Nostalgia':         '記憶の断片をそっと呼び起こすような空気感がある。',
      'Magnetic Presence':      '強い演出がなくても自然と視線を引き寄せる。',
      'Silent Leader':          '言葉ではなく佇まいによって語る力を持った写真。',
      // ES names → same JA captions
      'Poeta Visual':               'この写真には、言葉にならない感情の余韻が静かに残されている。',
      'Narrador Urbano':            '街の空気や人の気配が、一枚の中に自然に溶け込んでいる。',
      'Confianza Silenciosa':       '大きな主張はないが、確かな存在感が画面全体を支えている。',
      'Espíritu Independiente':     '周囲に合わせるのではなく、自分自身の視点を大切にした写真。',
      'Observador Cinematográfico': 'まるで映画のワンシーンのように、時間の流れを感じさせる。',
      'Rebelde Creativo':           '既存の表現にとらわれず、新しい見方を試みている。',
      'Nómada Moderno':             '移動することそのものが、この写真の物語になっている。',
      'Minimalista Elegante':       '余計なものを削ぎ落とし、本質だけが残されている。',
      'Nostalgia Suave':            '記憶の断片をそっと呼び起こすような空気感がある。',
      'Presencia Magnética':        '強い演出がなくても自然と視線を引き寄せる。',
      'Líder Silencioso':           '言葉ではなく佇まいによって語る力を持った写真。',
      // JA names → same captions
      '視覚の詩人':       'この写真には、言葉にならない感情の余韻が静かに残されている。',
      '街の語り部':       '街の空気や人の気配が、一枚の中に自然に溶け込んでいる。',
      '静かな自信':       '大きな主張はないが、確かな存在感が画面全体を支えている。',
      '自由な探究者':     '周囲に合わせるのではなく、自分自身の視点を大切にした写真。',
      '映画的観察者':     'まるで映画のワンシーンのように、時間の流れを感じさせる。',
      '創造的な挑戦者':   '既存の表現にとらわれず、新しい見方を試みている。',
      '現代の旅人':       '移動することそのものが、この写真の物語になっている。',
      '洗練されたミニマリスト': '余計なものを削ぎ落とし、本質だけが残されている。',
      'やさしいノスタルジア': '記憶の断片をそっと呼び起こすような空気感がある。',
      '惹きつける存在感': '強い演出がなくても自然と視線を引き寄せる。',
      '静かなるリーダー': '言葉ではなく佇まいによって語る力を持った写真。',
    }
    return JA_CAPTIONS[archetype] ?? ''
  }

  // Caption phrase map — converts archetype names into editorial noun phrases.
  // Handles both ES-stored and EN-stored archetype values for either output language.
  const CAPTION_PHRASES_ES = {
    'Poeta Visual':               'poesía visual',
    'Narrador Urbano':            'narrativa urbana',
    'Confianza Silenciosa':       'confianza serena',
    'Espíritu Independiente':     'espíritu independiente',
    'Observador Cinematográfico': 'mirada cinematográfica',
    'Rebelde Creativo':           'rebeldía creativa',
    'Nómada Moderno':             'movimiento moderno',
    'Nostalgia Suave':            'nostalgia suave',
    'Minimalista Elegante':       'minimalismo elegante',
    'Presencia Magnética':        'presencia magnética',
    'Líder Silencioso':           'autoridad silenciosa',
    // EN archetype names → ES phrases (cross-language)
    'Visual Poet':            'poesía visual',
    'Urban Storyteller':      'narrativa urbana',
    'Quiet Confidence':       'confianza serena',
    'Independent Spirit':     'espíritu independiente',
    'Cinematic Observer':     'mirada cinematográfica',
    'Creative Rebel':         'rebeldía creativa',
    'Modern Nomad':           'movimiento moderno',
    'Soft Nostalgia':         'nostalgia suave',
    'Elegant Minimalist':     'minimalismo elegante',
    'Magnetic Presence':      'presencia magnética',
    'Silent Leader':          'autoridad silenciosa',
  }

  const CAPTION_PHRASES_EN = {
    'Visual Poet':            'visual poetry',
    'Urban Storyteller':      'urban storytelling',
    'Quiet Confidence':       'quiet confidence',
    'Independent Spirit':     'independent spirit',
    'Cinematic Observer':     'cinematic observation',
    'Creative Rebel':         'creative rebellion',
    'Modern Nomad':           'modern movement',
    'Soft Nostalgia':         'soft nostalgia',
    'Elegant Minimalist':     'elegant minimalism',
    'Magnetic Presence':      'magnetic presence',
    'Silent Leader':          'quiet authority',
    // ES archetype names → EN phrases (cross-language)
    'Poeta Visual':               'visual poetry',
    'Narrador Urbano':            'urban storytelling',
    'Confianza Silenciosa':       'quiet confidence',
    'Espíritu Independiente':     'independent spirit',
    'Observador Cinematográfico': 'cinematic observation',
    'Rebelde Creativo':           'creative rebellion',
    'Nómada Moderno':             'modern movement',
    'Nostalgia Suave':            'soft nostalgia',
    'Minimalista Elegante':       'elegant minimalism',
    'Presencia Magnética':        'magnetic presence',
    'Líder Silencioso':           'quiet authority',
  }

  const phraseMap = lang === 'es' ? CAPTION_PHRASES_ES : CAPTION_PHRASES_EN
  const atmoPool  = (lang === 'es' ? ATMOS_ES : ATMOS_EN)[style] ?? (lang === 'es' ? ATMOS_ES : ATMOS_EN).natural
  const atmo      = pick(n, 7, atmoPool)
  const arc       = phraseMap[archetype] ?? archetype.toLowerCase()

  if (lang === 'es') {
    // Feminine scenes: imagen, fotografía, exploración — masculine: retrato, estudio
    const isFem = /^(imagen|fotografía|exploración)/.test(scene)
    const VERBS_FEM  = ['definida por', 'marcada por', 'guiada por', 'construida sobre', 'tejida con']
    const VERBS_MASC = ['definido por',  'marcado por',  'guiado por',  'construido sobre', 'tejido con']
    const verb    = pick(n, 3, isFem ? VERBS_FEM : VERBS_MASC)
    const article = isFem ? 'Una' : 'Un'
    return `${article} ${scene} ${verb} ${arc} y ${atmo}.`
  } else {
    const VERBS = ['shaped by', 'defined by', 'guided by', 'marked by', 'anchored in']
    const verb    = pick(n, 3, VERBS)
    const article = /^[aeiou]/i.test(scene) ? 'An' : 'A'
    return `${article} ${scene} ${verb} ${arc} and ${atmo}.`
  }
}

/**
 * Analyze all photos in a set and return them ranked plus a portfolio-level review.
 * This is the primary entry point for UploadPage.
 *
 * @param {Array<{id: string, preview: string, name: string}>} photos
 * @returns {Promise<{ ranked: Array<{id, preview, name, rank, analysis}>, portfolio: object }>}
 */
export async function analyzeAll(photos, lang = 'es') {
  const withAnalysis = await Promise.all(
    photos.map(async (photo) => ({
      ...photo,
      analysis: await analyzeImage(photo.preview, lang),
    }))
  )

  // Sort by total score descending, then assign rank (1 = strongest)
  withAnalysis.sort((a, b) => b.analysis.scores.total - a.analysis.scores.total)

  const ranked = withAnalysis.map((photo, index) => ({
    ...photo,
    rank: index + 1,
  }))

  const portfolio = buildPortfolioFeedback(ranked, lang)

  return { ranked, portfolio }
}
