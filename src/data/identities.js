/**
 * identities.js
 *
 * The Visual Identity Dictionary.
 * Every archetype has a name in three languages, a description tuned to that
 * language's photographic sensibility, and a list of thematically related identities.
 *
 * Japanese descriptions are written to feel native to Japanese photography
 * culture: understated, observational, focused on atmosphere and inner quality
 * rather than dramatic statement.
 */

export const IDENTITIES = [
  {
    slug:    'visual-poet',
    names:   { en: 'Visual Poet',    es: 'Poeta Visual',    ja: '視覚の詩人' },
    allNames: ['Visual Poet', 'Poeta Visual', '視覚の詩人'],
    descriptions: {
      en: 'Finds emotion and resonance within the everyday, expressing quiet beauty through light, space, and careful observation.',
      es: 'Encuentra emoción y resonancia en lo cotidiano, expresando belleza silenciosa a través de la luz, el espacio y la observación cuidadosa.',
      ja: '日常の中にある感情や余韻を見つけ出し、静かな美しさとして表現するタイプ。',
    },
    related: ['Soft Nostalgia', 'Cinematic Observer', 'Elegant Minimalist'],
  },
  {
    slug:    'urban-storyteller',
    names:   { en: 'Urban Storyteller', es: 'Narrador Urbano', ja: '街の語り部' },
    allNames: ['Urban Storyteller', 'Narrador Urbano', '街の語り部'],
    descriptions: {
      en: 'Captures the atmosphere and energy of places, conveying stories that exist only in that specific moment and location.',
      es: 'Captura la atmósfera y energía de los lugares, transmitiendo historias que solo existen en ese momento y lugar concretos.',
      ja: '街や人々の気配を写し取り、その場所にしかない物語を伝えるタイプ。',
    },
    related: ['Cinematic Observer', 'Modern Nomad', 'Creative Rebel'],
  },
  {
    slug:    'quiet-confidence',
    names:   { en: 'Quiet Confidence', es: 'Confianza Silenciosa', ja: '静かな自信' },
    allNames: ['Quiet Confidence', 'Confianza Silenciosa', '静かな自信'],
    descriptions: {
      en: 'Communicates presence without demanding attention — calm, grounded, and visually assured.',
      es: 'Comunica presencia sin exigir atención — sereno, estable y visualmente seguro de sí mismo.',
      ja: '大きく主張せずとも存在感が伝わる。落ち着きと安定感が写真に表れるタイプ。',
    },
    related: ['Silent Leader', 'Elegant Minimalist', 'Independent Spirit'],
  },
  {
    slug:    'independent-spirit',
    names:   { en: 'Independent Spirit', es: 'Espíritu Independiente', ja: '自由な探究者' },
    allNames: ['Independent Spirit', 'Espíritu Independiente', '自由な探究者'],
    descriptions: {
      en: 'Maintains a distinct personal perspective regardless of trends, guided by personal values and an instinct for curiosity.',
      es: 'Mantiene una perspectiva personal distinta independientemente de las tendencias, guiada por valores propios y un instinto de curiosidad.',
      ja: '流行に流されず、自分の視点や価値観を大切にするタイプ。',
    },
    related: ['Creative Rebel', 'Modern Nomad', 'Visual Poet'],
  },
  {
    slug:    'cinematic-observer',
    names:   { en: 'Cinematic Observer', es: 'Observador Cinematográfico', ja: '映画的観察者' },
    allNames: ['Cinematic Observer', 'Observador Cinematográfico', '映画的観察者'],
    descriptions: {
      en: 'Captures light, atmosphere, and the passage of time, building a cinematic world within a single frame.',
      es: 'Captura la luz, la atmósfera y el paso del tiempo, construyendo un mundo cinematográfico dentro de un solo encuadre.',
      ja: '光や空気感、時間の流れを捉え、一枚の写真に映画のような世界観を作り出すタイプ。',
    },
    related: ['Visual Poet', 'Urban Storyteller', 'Magnetic Presence'],
  },
  {
    slug:    'creative-rebel',
    names:   { en: 'Creative Rebel', es: 'Rebelde Creativo', ja: '創造的な挑戦者' },
    allNames: ['Creative Rebel', 'Rebelde Creativo', '創造的な挑戦者'],
    descriptions: {
      en: 'Refuses existing rules and experiments with new forms of expression, pushing the boundaries of visual language.',
      es: 'Se niega a seguir reglas existentes y experimenta con nuevas formas de expresión, ampliando los límites del lenguaje visual.',
      ja: '既存のルールにとらわれず、新しい表現方法を試みるタイプ。',
    },
    related: ['Independent Spirit', 'Visual Poet', 'Modern Nomad'],
  },
  {
    slug:    'modern-nomad',
    names:   { en: 'Modern Nomad', es: 'Nómada Moderno', ja: '現代の旅人' },
    allNames: ['Modern Nomad', 'Nómada Moderno', '現代の旅人'],
    descriptions: {
      en: 'Moves across places and cultures, continuously searching for a personal perspective through movement and encounter.',
      es: 'Se mueve a través de lugares y culturas, buscando continuamente una perspectiva personal a través del movimiento y el encuentro.',
      ja: '場所や文化を越えて移動しながら、自分らしい視点を探し続けるタイプ。',
    },
    related: ['Urban Storyteller', 'Independent Spirit', 'Cinematic Observer'],
  },
  {
    slug:    'elegant-minimalist',
    names:   { en: 'Elegant Minimalist', es: 'Minimalista Elegante', ja: '洗練されたミニマリスト' },
    allNames: ['Elegant Minimalist', 'Minimalista Elegante', '洗練されたミニマリスト'],
    descriptions: {
      en: 'Removes the unnecessary and captivates through essence alone — form, space, and quiet precision.',
      es: 'Elimina lo innecesario y cautiva solo con la esencia — forma, espacio y precisión silenciosa.',
      ja: '余計な要素を削ぎ落とし、本質だけで魅せるタイプ。',
    },
    related: ['Quiet Confidence', 'Silent Leader', 'Visual Poet'],
  },
  {
    slug:    'soft-nostalgia',
    names:   { en: 'Soft Nostalgia', es: 'Nostalgia Suave', ja: 'やさしいノスタルジア' },
    allNames: ['Soft Nostalgia', 'Nostalgia Suave', 'やさしいノスタルジア'],
    descriptions: {
      en: 'Gently expresses nostalgia and fragments of memory — photographs that feel like something half-remembered.',
      es: 'Expresa con suavidad la nostalgia y fragmentos de memoria — fotografías que parecen algo a medias recordado.',
      ja: '懐かしさや記憶の断片を穏やかに表現するタイプ。',
    },
    related: ['Visual Poet', 'Cinematic Observer', 'Elegant Minimalist'],
  },
  {
    slug:    'magnetic-presence',
    names:   { en: 'Magnetic Presence', es: 'Presencia Magnética', ja: '惹きつける存在感' },
    allNames: ['Magnetic Presence', 'Presencia Magnética', '惹きつける存在感'],
    descriptions: {
      en: 'Draws attention naturally and effortlessly — without dramatic staging, the gaze stays.',
      es: 'Atrae la atención de manera natural y sin esfuerzo — sin puesta en escena dramática, la mirada permanece.',
      ja: '強い演出がなくても自然と視線を集めるタイプ。',
    },
    related: ['Silent Leader', 'Quiet Confidence', 'Cinematic Observer'],
  },
  {
    slug:    'silent-leader',
    names:   { en: 'Silent Leader', es: 'Líder Silencioso', ja: '静かなるリーダー' },
    allNames: ['Silent Leader', 'Líder Silencioso', '静かなるリーダー'],
    descriptions: {
      en: 'Influences through bearing rather than words — a presence that shapes the surrounding space without announcing itself.',
      es: 'Influye a través de la postura más que de las palabras — una presencia que da forma al espacio circundante sin anunciarse.',
      ja: '言葉よりも佇まいで周囲に影響を与えるタイプ。',
    },
    related: ['Quiet Confidence', 'Magnetic Presence', 'Elegant Minimalist'],
  },
]

/** Returns the IDENTITIES entry for a given archetype name (any language). */
export function findIdentity(archetypeName) {
  if (!archetypeName) return null
  const needle = archetypeName.trim().toLowerCase()
  return IDENTITIES.find((id) =>
    id.allNames.some((n) => n.toLowerCase() === needle) ||
    id.allNames.some((n) => n.toLowerCase().includes(needle)) ||
    needle.includes(id.names.en.toLowerCase().split(' ')[0])
  ) ?? null
}

/** Dictionary page UI strings. */
export const DICT_LABELS = {
  es: {
    label:         'Identidades Visuales',
    h1:            'Diccionario de Identidades',
    tagline:       'Una guía de los lenguajes visuales que definen cómo los fotógrafos ven y expresan el mundo.',
    related:       'Identidades relacionadas',
    gallery_label: 'En la galería',
    no_entries:    'Todavía no hay entradas para esta identidad.',
    all_link:      '← Todas las identidades',
  },
  en: {
    label:         'Visual Identities',
    h1:            'Identity Dictionary',
    tagline:       'A guide to the visual languages that shape how photographers see and express.',
    related:       'Related identities',
    gallery_label: 'In the gallery',
    no_entries:    'No gallery entries yet for this identity.',
    all_link:      '← All identities',
  },
  ja: {
    label:         'ビジュアルアイデンティティ',
    h1:            'アイデンティティ辞典',
    tagline:       '写真家たちの見方と表現を形づくる、視覚言語のガイド。',
    related:       '関連するアイデンティティ',
    gallery_label: 'ギャラリーの作品',
    no_entries:    'まだこのアイデンティティの作品がありません。',
    all_link:      '← すべてのアイデンティティ',
  },
}
