import { CATEGORIES, CATEGORIES_EN } from '../data/archiveStore'
import { analyzeSeriesContext } from './seriesAnalysis'
import { buildCuratorCaption } from './analyzeImage'

const CATEGORY_BY_SERIES = {
  es: {
    'retrato editorial': 'Retrato',
    'identidad visual':  'Editorial',
    'vida cotidiana':    'Calle',
    'serie mixta':       'Experimental',
    'archivo personal':  'Look Analógico',
  },
  en: {
    'retrato editorial': 'Portrait',
    'identidad visual':  'Editorial',
    'vida cotidiana':    'Street',
    'serie mixta':       'Experimental',
    'archivo personal':  'Film Look',
  },
}

const TITLE_BY_SERIES = {
  es: {
    'retrato editorial': 'Retrato editorial',
    'identidad visual':  'Identidad visual',
    'vida cotidiana':    'Vida cotidiana',
    'serie mixta':       'Serie mixta',
    'archivo personal':  'Archivo personal',
  },
  en: {
    'retrato editorial': 'Editorial portrait',
    'identidad visual':  'Visual identity',
    'vida cotidiana':    'Daily life',
    'serie mixta':       'Mixed series',
    'archivo personal':  'Personal archive',
  },
  ja: {
    'retrato editorial': 'エディトリアルポートレート',
    'identidad visual':  'ビジュアルアイデンティティ',
    'vida cotidiana':    '日常',
    'serie mixta':       'ミックスシリーズ',
    'archivo personal':  '個人アーカイブ',
  },
}

/**
 * Auto-generate identity type key from series analysis.
 * @returns {'quiet_presence'|'urban_explorer'|'editorial_minimalist'|'warm_observer'|'personal_archive'|'mixed_story'}
 */
export function buildIdentityTypeKey(context, archetype = '') {
  const a = archetype.toLowerCase()

  if (/urbano|urban|nómada|nomad|narrador urbano|modern nomad/i.test(a)) {
    return 'urban_explorer'
  }
  if (/minimal|minimalista|elegante/i.test(a) || (context.avgSaturation < 42 && context.consistencyLevel === 'alta')) {
    return 'editorial_minimalist'
  }
  if (context.seriesType === 'serie mixta' || (context.hasMixedSubjects && context.uniqueKinds?.length >= 2)) {
    return 'mixed_story'
  }
  if (context.seriesType === 'archivo personal' || (context.hasAnimalOrPet && context.hasMixedSubjects)) {
    return 'personal_archive'
  }
  if (context.seriesType === 'vida cotidiana' || /nostalgia|cálido|warm|observador/i.test(a)) {
    return 'warm_observer'
  }
  if (context.seriesType === 'retrato editorial' && context.consistencyLevel === 'alta') {
    return context.avgSaturation < 45 ? 'editorial_minimalist' : 'quiet_presence'
  }
  if (context.seriesType === 'identidad visual' || /presencia|confidence|confianza|silenc|poeta|poet/i.test(a)) {
    return 'quiet_presence'
  }

  return 'quiet_presence'
}

export const IDENTITY_TYPE_LABELS = {
  quiet_presence:       { es: 'Presencia Silenciosa', en: 'Quiet Presence',       ja: '静かな存在感' },
  urban_explorer:       { es: 'Explorador Urbano',    en: 'Urban Explorer',       ja: 'アーバンエクスプローラー' },
  editorial_minimalist: { es: 'Minimalista Editorial', en: 'Editorial Minimalist', ja: 'エディトリアルミニマリスト' },
  warm_observer:        { es: 'Observador Cálido',    en: 'Warm Observer',        ja: '温かい観察者' },
  personal_archive:     { es: 'Archivo Personal',     en: 'Personal Archive',     ja: '個人アーカイブ' },
  mixed_story:          { es: 'Historia Mixta',       en: 'Mixed Story',          ja: 'ミックスストーリー' },
}

export function getIdentityTypeLabel(key, lang = 'es') {
  return IDENTITY_TYPE_LABELS[key]?.[lang]
    ?? IDENTITY_TYPE_LABELS[key]?.en
    ?? key
}

function pickCategory(context, lang) {
  const map = CATEGORY_BY_SERIES[lang === 'es' ? 'es' : 'en']
  const list = lang === 'es' ? CATEGORIES : CATEGORIES_EN

  if (context.avgSaturation < 35) {
    return lang === 'es' ? 'Blanco y Negro' : 'Black & White'
  }

  return map[context.seriesType] ?? list[0]
}

function pickTitle(context, portfolio, lang) {
  const titles = TITLE_BY_SERIES[lang] ?? TITLE_BY_SERIES.en
  const fromType = titles[context.seriesType]
  if (fromType) return fromType

  const mood = portfolio?.series_observation?.mood?.trim()
  if (mood && mood.length <= 80) return mood

  return lang === 'es' ? 'Observación visual' : lang === 'ja' ? '視覚的観察' : 'Visual observation'
}

/**
 * Auto-generate archive fields from series analysis — no user input.
 */
export function buildArchiveMetadata(ranked, portfolio, lang = 'es') {
  const top = ranked?.[0]
  const context = portfolio?.series_context ?? analyzeSeriesContext(ranked ?? [])
  const { editorial, scores } = top?.analysis ?? {}
  const archetype = editorial?.archetype ?? ''
  const category = pickCategory(context, lang)
  const title = pickTitle(context, portfolio, lang)
  const identityType = buildIdentityTypeKey(context, archetype)
  const obs = portfolio?.series_observation

  const observation = obs?.narrative
    ?? editorial?.curatorReview
    ?? top?.analysis?.overall
    ?? ''

  const caption = obs?.narrative
    ? [obs.mood, obs.narrative].filter(Boolean).join(' ')
    : buildCuratorCaption(archetype, category, scores, lang)

  return {
    category,
    title,
    observation,
    caption,
    archetype,
    identityType,
    keywords: editorial?.keywords ?? [],
    suggested_sequence: portfolio?.suggested_sequence ?? null,
    series_context: context,
  }
}
