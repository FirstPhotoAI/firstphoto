/**
 * Lightweight heuristics for reading an uploaded photo set as a visual series.
 * No external APIs — uses filename, analysis scores, archetypes, and keywords.
 */

const ANIMAL_RE = /\b(cat|cats|gato|gata|gatos|kitten|kitty|pet|pets|perro|perros|dog|dogs|puppy|puppies|mascota|mascotas|animal|animals|bunny|conejo|rabbit|bird|pajaro|pájaro|ave|hamster|fish|pez)\b/i
const PORTRAIT_RE = /\b(portrait|portraits|retrato|retratos|selfie|selfies|face|faces|rostro|caras|cara|headshot|head|person|people|persona|gente|model|modelo|yo|me|mí)\b/i
const DAILY_RE = /\b(daily|cotidiano|cotidiana|vida|everyday|home|casa|coffee|cafe|café|food|comida|kitchen|cocina|objeto|object|still|street|calle|snap|random|phone|movil|móvil)\b/i
const LANDSCAPE_RE = /\b(landscape|paisaje|nature|naturaleza|mountain|montaña|sea|mar|sky|cielo|travel|viaje|vacation|vacaciones)\b/i

const PORTRAIT_ARCHETYPES = /retrato|portrait|presencia|confidence|confianza|poeta|poet|leader|líder|leader|magnetic|magnética|storyteller|narrador/i

/** @typedef {'portrait' | 'animal' | 'daily' | 'landscape' | 'other'} PhotoKind */

/**
 * Classify a single photo using filename + existing analysis metadata.
 * @param {{ name?: string, analysis?: object }} photo
 * @returns {PhotoKind}
 */
export function classifyPhotoKind(photo) {
  const name = (photo.name ?? '').toLowerCase()
  const keywords = (photo.analysis?.editorial?.keywords ?? []).join(' ').toLowerCase()
  const archetype = (photo.analysis?.editorial?.archetype ?? '').toLowerCase()
  const haystack = `${name} ${keywords} ${archetype}`

  if (ANIMAL_RE.test(haystack)) return 'animal'
  if (PORTRAIT_RE.test(haystack)) return 'portrait'
  if (LANDSCAPE_RE.test(haystack)) return 'landscape'
  if (DAILY_RE.test(haystack)) return 'daily'

  const scores = photo.analysis?.scores
  if (scores) {
    const comp = scores.composition?.score ?? 0
    const sharp = scores.sharpness?.score ?? 0
    const sat = scores.saturation?.score ?? 0
    if (PORTRAIT_ARCHETYPES.test(archetype) && comp >= 50) return 'portrait'
    if (sat >= 55 && comp >= 45 && sharp >= 40 && !LANDSCAPE_RE.test(haystack)) {
      if (name.length < 3) return 'portrait'
    }
  }

  return 'other'
}

/**
 * @param {Array<{ name?: string, analysis?: object }>} rankedPhotos
 */
export function analyzeSeriesContext(rankedPhotos) {
  const kinds = rankedPhotos.map(classifyPhotoKind)
  const uniqueKinds = [...new Set(kinds)]

  const hasPortraits = kinds.some((k) => k === 'portrait')
  const hasAnimalOrPet = kinds.some((k) => k === 'animal')
  const hasDaily = kinds.some((k) => k === 'daily' || k === 'other')
  const hasLandscape = kinds.some((k) => k === 'landscape')

  const totals = rankedPhotos.map((p) => p.analysis?.scores?.total ?? 0)
  const spread = totals.length ? Math.max(...totals) - Math.min(...totals) : 0

  const archetypes = [...new Set(
    rankedPhotos.map((p) => p.analysis?.editorial?.archetype).filter(Boolean)
  )]

  const avgBr = rankedPhotos.reduce((s, p) => s + (p.analysis?.scores?.brightness?.raw ?? 0), 0)
    / Math.max(rankedPhotos.length, 1)
  const avgSat = rankedPhotos.reduce((s, p) => s + (p.analysis?.scores?.saturation?.raw ?? 0), 0)
    / Math.max(rankedPhotos.length, 1)

  const kindCounts = kinds.reduce((acc, k) => { acc[k] = (acc[k] ?? 0) + 1; return acc }, {})
  const portraitRatio = (kindCounts.portrait ?? 0) / rankedPhotos.length
  const animalRatio = (kindCounts.animal ?? 0) / rankedPhotos.length

  const hasMixedSubjects = uniqueKinds.length >= 2
    && (hasAnimalOrPet || (hasPortraits && (hasDaily || hasLandscape || kindCounts.other > 0)))

  const hasVisualContrast = spread > 16
    || uniqueKinds.length >= 3
    || (hasPortraits && hasAnimalOrPet)
    || archetypes.length >= Math.min(rankedPhotos.length, 3)

  let consistencyLevel = 'media'
  if (portraitRatio >= 0.8 && spread <= 14 && archetypes.length <= 2 && !hasAnimalOrPet) {
    consistencyLevel = 'alta'
  } else if (hasMixedSubjects || hasAnimalOrPet || uniqueKinds.length >= 3 || spread > 22) {
    consistencyLevel = 'baja'
  }

  let seriesType = 'identidad visual'
  if (hasMixedSubjects && (hasAnimalOrPet || (hasPortraits && hasDaily))) {
    seriesType = hasAnimalOrPet ? 'archivo personal' : 'serie mixta'
  } else if (hasMixedSubjects) {
    seriesType = 'serie mixta'
  } else if (portraitRatio >= 0.85 && consistencyLevel === 'alta') {
    seriesType = 'retrato editorial'
  } else if (portraitRatio >= 0.6) {
    seriesType = 'identidad visual'
  } else if ((kindCounts.daily ?? 0) + (kindCounts.other ?? 0) >= rankedPhotos.length * 0.6) {
    seriesType = 'vida cotidiana'
  } else if (consistencyLevel === 'baja') {
    seriesType = 'archivo personal'
  }

  return {
    kinds,
    uniqueKinds,
    hasMixedSubjects,
    hasAnimalOrPet,
    hasPortraits,
    hasDaily,
    hasVisualContrast,
    consistencyLevel,
    seriesType,
    spread,
    archetypeCount: archetypes.length,
    avgBrightness: avgBr,
    avgSaturation: avgSat,
  }
}

function portfolioSelectionScore(scores) {
  return (scores.brightness?.score ?? 0) * 0.2
    + (scores.contrast?.score ?? 0) * 0.25
    + (scores.composition?.score ?? 0) * 0.3
    + (scores.sharpness?.score ?? 0) * 0.15
    + (scores.saturation?.score ?? 0) * 0.1
}

function atmosphereScore(scores) {
  return (scores.contrast?.score ?? 0) * 0.35
    + (scores.brightness?.score ?? 0) * 0.25
    + (scores.saturation?.score ?? 0) * 0.4
}

/**
 * Build suggested sequence order + contextual role copy.
 */
export function buildContextualSequence(rankedPhotos, lang = 'es') {
  const context = analyzeSeriesContext(rankedPhotos)

  if (!rankedPhotos?.length) {
    return { order: [], items: [], series_context: context }
  }

  if (rankedPhotos.length === 1) {
    const kind = context.kinds[0]
    return {
      order: [0],
      items: [{
        index:  0,
        role:   'opening',
        reason: sequenceReason('opening', kind, context, lang, 0, 1),
      }],
      series_context: context,
    }
  }

  const scored = rankedPhotos.map((photo, index) => ({
    index,
    photo,
    kind: context.kinds[index],
    pScore: portfolioSelectionScore(photo.analysis.scores),
    atmScore: atmosphereScore(photo.analysis.scores),
  }))

  let ordered

  if (context.hasMixedSubjects && context.hasAnimalOrPet && rankedPhotos.length >= 3) {
    const portraits = scored.filter((s) => s.kind === 'portrait')
    const animals   = scored.filter((s) => s.kind === 'animal')
    const others    = scored.filter((s) => s.kind !== 'portrait' && s.kind !== 'animal')

    const opener  = (portraits.sort((a, b) => b.pScore - a.pScore)[0]) ?? scored[0]
    const middle  = (animals[0] ?? others.sort((a, b) => b.atmScore - a.atmScore)[0] ?? scored.find((s) => s.index !== opener.index))
    const rest    = scored.filter((s) => s.index !== opener.index && s.index !== middle?.index)
    const closer  = rest.sort((a, b) => b.pScore - a.pScore)[0] ?? middle

    ordered = [opener, middle, ...rest.filter((s) => s.index !== closer.index), closer]
      .filter(Boolean)
      .filter((s, i, arr) => arr.findIndex((x) => x.index === s.index) === i)
  } else {
    scored.sort((a, b) => b.pScore - a.pScore)
    const opener = scored[0]
    const rest = scored.slice(1)
    rest.sort((a, b) => b.atmScore - a.atmScore)
    const closer = rest[0]
    const middle = rest.slice(1).sort((a, b) => b.pScore - a.pScore)
    ordered = [opener, ...middle, closer]
  }

  const items = ordered.map((slot, seqIdx) => {
    const role = seqIdx === 0
      ? 'opening'
      : seqIdx === ordered.length - 1
        ? 'closing'
        : 'supporting'
    return {
      index:  slot.index,
      role,
      reason: sequenceReason(role, slot.kind, context, lang, seqIdx, ordered.length),
    }
  })

  return {
    order:          items.map((i) => i.index),
    items,
    series_context: context,
  }
}

function sequenceReason(role, photoKind, context, lang, seqIdx, total) {
  const es = lang === 'es'
  const ja = lang === 'ja'

  const { seriesType, hasMixedSubjects, hasPortraits, hasAnimalOrPet, consistencyLevel } = context
  const allPortrait = (
    (hasPortraits && !hasAnimalOrPet && !hasMixedSubjects && seriesType === 'retrato editorial')
    || (hasPortraits && consistencyLevel === 'alta' && !hasAnimalOrPet && !hasMixedSubjects)
  )

  if (allPortrait || seriesType === 'retrato editorial' || seriesType === 'identidad visual') {
    if (!hasMixedSubjects && hasPortraits) {
      const PORTRAIT = es ? {
        opening:    'Presenta el rostro y la actitud principal de la serie.',
        supporting: total > 2
          ? 'Añade una variación de gesto, distancia o energía sin romper la línea del retrato.'
          : 'Añade una variación de gesto, distancia o energía.',
        closing:    'Cierra con una imagen más silenciosa o memorable.',
      } : ja ? {
        opening:    'シリーズの顔と主要な態度を提示します。',
        supporting: 'ジェスチャー、距離、エネルギーの変化を加えます。',
        closing:    'より静かで記憶に残る一枚で締めくくります。',
      } : {
        opening:    'Introduces the face and primary attitude of the series.',
        supporting: 'Adds a variation in gesture, distance, or energy.',
        closing:    'Closes with a quieter or more memorable image.',
      }
      return PORTRAIT[role]
    }
  }

  if (hasMixedSubjects || hasAnimalOrPet || seriesType === 'serie mixta' || seriesType === 'archivo personal') {
    const MIXED = es ? {
      opening_portrait:    'Abre con una presencia humana clara. Esta imagen establece identidad antes de introducir contraste.',
      opening_animal:      'Abre con una escena cotidiana inesperada. El contraste aparece desde la primera imagen.',
      opening_daily:       'Abre con un fragmento de vida cotidiana. La serie comienza lejos del registro editorial.',
      opening_other:       'Abre con una imagen que no define del todo la serie — eso ya es parte del mensaje.',
      supporting_portrait: 'Recupera la presencia humana y da pausa al contraste anterior.',
      supporting_animal:   'Introduce una pausa cotidiana. La imagen rompe el tono editorial y vuelve la serie más íntima.',
      supporting_daily:    'Añade un momento cotidiano que desacelera la lectura y humaniza el conjunto.',
      supporting_other:    'Actúa como puente entre registros distintos dentro del mismo archivo.',
      closing_portrait:    'Recupera el retrato y cierra la serie con una presencia más contenida.',
      closing_animal:      'Cierra con un gesto cotidiano que deja la serie en tono personal, no editorial.',
      closing_daily:       'Cierra con una escena cotidiana que confirma el carácter de archivo personal.',
      closing_other:       'Cierra sin resolver del todo la mezcla — la serie queda abierta, como un cuaderno visual.',
    } : ja ? {
      opening_portrait:    '明確な人物の存在感で始まります。アイデンティティを先に示します。',
      opening_animal:      '予想外の日常の一場面から始まります。最初から対比が生まれます。',
      opening_daily:       '日常の断片から始まります。エディトリアルから離れた入口です。',
      opening_other:       'シリーズを完全には定義しない一枚で始まります。',
      supporting_portrait: '人物の存在感を戻し、前後の対比に息づかいを与えます。',
      supporting_animal:   '日常の小さな中断を挟みます。親密さが増します。',
      supporting_daily:    '日常の瞬間がテンポを緩め、人間味を加えます。',
      supporting_other:    '異なるレジスター間の橋渡しになります。',
      closing_portrait:    'より控えめな人物像で静かに締めくくります。',
      closing_animal:      '個人的な余韻で終わります。',
      closing_daily:       '日常性を確認する結び方です。',
      closing_other:       '混在を解決せず、視覚的ノートのように終わります。',
    } : {
      opening_portrait:    'Opens with a clear human presence. This image establishes identity before introducing contrast.',
      opening_animal:      'Opens with an unexpected everyday scene. Contrast appears from the first frame.',
      opening_daily:       'Opens with a slice of daily life. The series starts away from an editorial register.',
      opening_other:       'Opens with an image that does not fully define the series — that is part of the message.',
      supporting_portrait: 'Brings human presence back and pauses the previous contrast.',
      supporting_animal:   'Introduces an everyday pause. The image breaks the editorial tone and makes the series more intimate.',
      supporting_daily:    'Adds an everyday moment that slows the reading and humanizes the set.',
      supporting_other:    'Acts as a bridge between different registers within the same archive.',
      closing_portrait:    'Returns to the portrait and closes the series with a more contained presence.',
      closing_animal:      'Closes with an everyday gesture that leaves the series personal, not editorial.',
      closing_daily:       'Closes with an everyday scene that confirms the personal-archive character.',
      closing_other:       'Closes without fully resolving the mix — the series stays open, like a visual notebook.',
    }

    const key = `${role}_${photoKind === 'landscape' ? 'daily' : photoKind}`
    return MIXED[key] ?? MIXED[`${role}_other`]
  }

  if (seriesType === 'vida cotidiana') {
    const DAILY = es ? {
      opening:    'Presenta el tono cotidiano que atraviesa la serie.',
      supporting: 'Añade variación dentro del mismo registro de vida diaria.',
      closing:    'Cierra con la escena más memorable del conjunto cotidiano.',
    } : ja ? {
      opening:    '日常のトーンを提示します。',
      supporting: '同じ日常性の中に変化を加えます。',
      closing:    '最も記憶に残る日常の場面で締めます。',
    } : {
      opening:    'Presents the everyday tone that runs through the series.',
      supporting: 'Adds variation within the same daily-life register.',
      closing:    'Closes with the most memorable everyday scene in the set.',
    }
    return DAILY[role]
  }

  const DEFAULT = es ? {
    opening:    'Establece la entrada visual de la serie.',
    supporting: 'Desarrolla el ritmo entre la apertura y el cierre.',
    closing:    'Concluye la lectura con la imagen más resuelta del conjunto.',
  } : ja ? {
    opening:    'シリーズの視覚的入口を確立します。',
    supporting: '冒頭と結びの間のリズムを作ります。',
    closing:    '最も整った読みで締めくくります。',
  } : {
    opening:    'Establishes the visual entry of the series.',
    supporting: 'Develops rhythm between opening and closing.',
    closing:    'Concludes with the most resolved image in the set.',
  }
  return DEFAULT[role]
}

/**
 * Build series observation fields from series context.
 */
export function buildContextualObservation(rankedPhotos, context, lang = 'es') {
  const es = lang === 'es'
  const ja = lang === 'ja'
  const count = rankedPhotos.length

  const {
    seriesType, hasMixedSubjects, hasPortraits, hasAnimalOrPet,
    consistencyLevel, hasVisualContrast, spread, archetypeCount,
  } = context

  if (hasMixedSubjects && (hasAnimalOrPet || (hasPortraits && seriesType !== 'retrato editorial'))) {
    const mixed = es ? {
      mood:         'La serie alterna registros distintos: retrato, pausa cotidiana y contraste visual.',
      rhythm:       hasAnimalOrPet
        ? 'El ritmo se interrumpe a propósito cuando aparece una imagen no editorial en el centro.'
        : 'El ritmo cambia entre presencia humana y escenas más abiertas o cotidianas.',
      consistency:  consistencyLevel === 'baja'
        ? 'La consistencia es baja: las imágenes no comparten un mismo registro formal.'
        : 'Hay una base visual parcial, pero la mezcla de asuntos domina la lectura.',
      narrative:    hasAnimalOrPet
        ? 'Esta serie combina retrato e imágenes de vida cotidiana. La mezcla no funciona como una editorial tradicional, pero sí como un archivo personal: identidad, pausa y presencia.'
        : 'Esta serie mezcla retrato y escenas cotidianas. No busca una editorial tradicional, sino un archivo personal con contraste y memoria.',
    } : ja ? {
      mood:         'ポートレートと日常の断片が交互に現れます。',
      rhythm:       '意図的な中断がリズムを作ります。',
      consistency:  '形式的一貫性は低く、題材の混在が読みを支配します。',
      narrative:    '人物の存在感と日常の場面が混ざる、個人的なアーカイブとして読めます。',
    } : {
      mood:         'The series alternates distinct registers: portrait, everyday pause, and visual contrast.',
      rhythm:       hasAnimalOrPet
        ? 'Rhythm breaks on purpose when a non-editorial image appears in the middle.'
        : 'Rhythm shifts between human presence and more open or everyday scenes.',
      consistency:  consistencyLevel === 'baja'
        ? 'Consistency is low: the images do not share the same formal register.'
        : 'There is a partial visual base, but the mix of subjects dominates the reading.',
      narrative:    hasAnimalOrPet
        ? 'This series combines portrait and everyday-life images. The mix does not work as a traditional editorial, but it does as a personal archive: identity, pause, and presence.'
        : 'This series mixes portrait and everyday scenes. It aims for a personal archive with contrast and memory, not a traditional editorial.',
    }
    return mixed
  }

  if (hasPortraits && consistencyLevel === 'alta' && seriesType === 'retrato editorial') {
    return es ? {
      mood:        'El conjunto mantiene un tono contenido y coherente entre retratos.',
      rhythm:      spread <= 12
        ? 'Las imágenes avanzan con un ritmo parejo; los gestos cambian, pero la presencia se mantiene.'
        : 'Hay variación de intensidad, pero siempre dentro del mismo registro de retrato.',
      consistency: 'Esta serie mantiene una dirección clara de retrato. Las imágenes comparten presencia, ritmo y una intención visual consistente.',
      narrative:   count === 3
        ? 'Tres retratos bastan para leer identidad, variación y cierre sin salir del mismo lenguaje visual.'
        : 'La serie se lee como una exploración de la misma presencia desde ángulos distintos.',
    } : ja ? {
      mood:        'ポートレート間で統一されたトーンが保たれています。',
      rhythm:      'ジェスチャーは変わっても、存在感は一貫しています。',
      consistency: '明確なポートレートの方向性と視覚的一貫性があります。',
      narrative:   '同じ存在感を異なる角度から探るシリーズです。',
    } : {
      mood:        'The set keeps a contained, coherent tone across portraits.',
      rhythm:      spread <= 12
        ? 'Images move at an even rhythm; gestures change, but presence holds.'
        : 'There is variation in intensity, but always within the same portrait register.',
      consistency: 'This series maintains a clear portrait direction. The images share presence, rhythm, and consistent visual intent.',
      narrative:   count === 3
        ? 'Three portraits are enough to read identity, variation, and closure without leaving the same visual language.'
        : 'The series reads as an exploration of the same presence from different angles.',
    }
  }

  if (seriesType === 'vida cotidiana') {
    return es ? {
      mood:        'La serie respira cotidianidad: escenas abiertas, luz natural y gestos informales.',
      rhythm:      'El ritmo es relajado; cada imagen aporta un fragmento distinto del mismo día o lugar.',
      consistency: 'Las imágenes comparten un registro cotidiano aunque los asuntos varíen.',
      narrative:   'Funciona como bitácora visual: menos editorial, más memoria y presencia del momento.',
    } : ja ? {
      mood:        '日常の空気感が全体を貫いています。',
      rhythm:      'ゆったりとしたリズムで、場面が積み重なります。',
      consistency: '題材は違っても、日常のレジスターは揃っています。',
      narrative:   'エディトリアルより記録・記憶に近いシリーズです。',
    } : {
      mood:        'The series breathes everyday life: open scenes, natural light, informal gestures.',
      rhythm:      'The rhythm is relaxed; each image adds a different fragment of the same day or place.',
      consistency: 'The images share an everyday register even when subjects vary.',
      narrative:   'It works as a visual log: less editorial, more memory and presence of the moment.',
    }
  }

  const fallback = es ? {
    mood:        hasVisualContrast
      ? 'Hay contraste de tono o intensidad entre las imágenes.'
      : 'El estado de ánimo se mantiene moderado a lo largo del conjunto.',
    rhythm:      spread > 18 ? 'El ritmo es variable: algunas imágenes pesan más que otras.' : 'El ritmo es bastante uniforme.',
    consistency: consistencyLevel === 'alta'
      ? 'Las decisiones visuales se repiten con coherencia.'
      : consistencyLevel === 'baja'
        ? 'La coherencia formal es limitada; predomina la mezcla de asuntos.'
        : 'Hay una base compartida con variaciones deliberadas.',
    narrative:   archetypeCount <= 1
      ? 'La serie se lee como un mismo territorio visual explorado en varias tomas.'
      : 'Cada imagen aporta un registro distinto; la unidad está en la selección, no en la repetición.',
  } : ja ? {
    mood:        'トーンや強度に差があります。',
    rhythm:      'リズムはやや変化に富みます。',
    consistency: '形式的一貫性は中程度です。',
    narrative:   '選択によって結ばれたシリーズです。',
  } : {
    mood:        hasVisualContrast ? 'There is contrast in tone or intensity between images.' : 'Mood stays moderate across the set.',
    rhythm:      spread > 18 ? 'Rhythm is variable: some images carry more weight.' : 'Rhythm is fairly even.',
    consistency: consistencyLevel === 'alta' ? 'Visual decisions repeat with coherence.' : 'Formal coherence is limited; subject mix dominates.',
    narrative:   archetypeCount <= 1 ? 'The series reads as one visual territory explored in several takes.' : 'Each image adds a distinct register; unity lives in the selection.',
  }
  return fallback
}

/**
 * 2–3 practical tips before publishing — selection, order, rhythm only.
 */
export function buildBeforePublishingAdvice(rankedPhotos, portfolio, sequence, lang = 'es') {
  const es = lang === 'es'
  const ja = lang === 'ja'
  const count = rankedPhotos.length
  if (!count) return []

  const context = portfolio?.series_context ?? analyzeSeriesContext(rankedPhotos)
  const items = sequence?.items ?? []
  const openingItem = items.find((i) => i.role === 'opening')
  const closingItem = items.find((i) => i.role === 'closing')
  const openingNum = (openingItem?.index ?? 0) + 1
  const closingNum = (closingItem?.index ?? count - 1) + 1
  const strongestNum = 1
  const weakestNum = count
  const tips = []

  if (openingNum !== strongestNum) {
    tips.push(es
      ? `Usa la imagen ${openingNum} como apertura: abre la serie con más claridad que la ${strongestNum}.`
      : ja
        ? `画像${openingNum}を冒頭に。${strongestNum}よりシリーズの入口として機能します。`
        : `Use image ${openingNum} as your opening — it introduces the series more clearly than image ${strongestNum}.`)
  } else {
    tips.push(es
      ? `La imagen ${strongestNum} funciona bien como apertura: es la más fuerte del conjunto.`
      : ja
        ? `最も強い画像${strongestNum}を冒頭に使うのが自然です。`
        : `Image ${strongestNum} works well as your opening — it is the strongest in the set.`)
  }

  if (context.hasVisualContrast || context.consistencyLevel === 'baja') {
    tips.push(es
      ? 'Evita publicar juntas imágenes con tonos demasiado diferentes — alterna las más editoriales con las más cotidianas.'
      : ja
        ? 'トーン差の大きい写真は連続投稿を避け、エディトリアルと日常を分けて見せてください。'
        : 'Avoid posting images with very different tones back-to-back — separate editorial frames from everyday ones.')
  }

  if (closingNum !== openingNum && closingNum !== strongestNum) {
    tips.push(es
      ? `La imagen ${closingNum} funciona mejor como cierre que como primera foto.`
      : ja
        ? `画像${closingNum}は最初より締めくくり向きです。`
        : `Image ${closingNum} works better as a closing frame than as your first photo.`)
  }

  if (context.hasMixedSubjects || context.seriesType === 'archivo personal') {
    if (tips.length < 3) {
      tips.push(es
        ? 'Si quieres una serie más editorial, elimina la imagen más cotidiana.'
        : ja
          ? 'よりエディトリアルにしたいなら、最も日常的な1枚を外してください。'
          : 'For a more editorial series, drop the most everyday image.')
    }
    if (tips.length < 3) {
      tips.push(es
        ? 'Si quieres una serie más personal, conserva el contraste entre registros.'
        : ja
          ? 'より個人的なトーンなら、レジスターの対比は残してください。'
          : 'For a more personal series, keep the contrast between registers.')
    }
  }

  if (tips.length < 2) {
    tips.push(es
      ? 'Revisa que apertura y cierre cuenten la misma historia antes de publicar.'
      : ja
        ? '公開前に、冒頭と締めが同じストーリーを語っているか確認してください。'
        : 'Before posting, confirm opening and closing tell the same story.')
  }

  return tips.slice(0, 3)
}

export function getConsistencyWarning(context, lang = 'es') {
  if (context?.consistencyLevel !== 'baja') return null

  if (lang === 'ja') {
    return 'この選択はエディトリアルより個人的なアーカイブ向きです。プロ向けの提示には、ポートレート・物体・日常の場面を分けるとよいでしょう。'
  }
  if (lang === 'en') {
    return 'This selection works better as a personal archive than as an editorial series. For a professional presentation, consider separating portraits, objects, and everyday scenes.'
  }
  return 'Esta selección funciona mejor como archivo personal que como serie editorial. Para una presentación profesional, convendría separar retratos, objetos y escenas cotidianas.'
}
