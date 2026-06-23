/**
 * archiveStore.js
 *
 * Client-side persistence for the Community Gallery.
 * All data lives in localStorage — no server, no cost.
 *
 * Entry shape:
 *   { id, photo (base64), title, category, firstImpression,
 *     observation, archetype, keywords, caption,
 *     creatorName, isPublic,
 *     publishedAt (ms timestamp) }
 *
 * Note shape (per entry):
 *   { id, author, text, timestamp (ms) }
 *   author is optional — omitted notes show as anonymous
 *
 * Backward compatibility:
 *   Existing entries without isPublic are treated as public.
 *   Existing entries without creatorName show as anonymous.
 */

const ARCHIVE_KEY = 'firstphoto_archive'
const NOTES_KEY   = 'firstphoto_archive_notes'

export const CATEGORIES = [
  'Retrato',
  'Moda',
  'Calle',
  'Viaje',
  'Editorial',
  'Blanco y Negro',
  'Experimental',
  'Look Analógico',
]

export const CATEGORIES_EN = [
  'Portrait',
  'Fashion',
  'Street',
  'Travel',
  'Editorial',
  'Black & White',
  'Experimental',
  'Film Look',
]

// Archetype identities shown in the Visual Identities section
export const ARCHETYPES_ES = [
  'Poeta Visual', 'Narrador Urbano', 'Confianza Silenciosa',
  'Espíritu Independiente', 'Observador Cinematográfico', 'Rebelde Creativo',
  'Nómada Moderno', 'Nostalgia Suave', 'Minimalista Elegante', 'Presencia Magnética',
  'Líder Silencioso',
]

export const ARCHETYPES_EN = [
  'Visual Poet', 'Urban Storyteller', 'Quiet Confidence',
  'Independent Spirit', 'Cinematic Observer', 'Creative Rebel',
  'Modern Nomad', 'Soft Nostalgia', 'Elegant Minimalist', 'Magnetic Presence',
  'Silent Leader',
]

// ─── Entries ──────────────────────────────────────────────────────────────────

export function getEntries() {
  try {
    return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]')
  } catch {
    return []
  }
}

/** All entries that are publicly visible in the gallery. */
export function getPublicEntries() {
  return getEntries().filter((e) => e.isPublic !== false)
}

/**
 * Prepend a new entry. Returns the saved entry with its id.
 */
export function addEntry({
  photo, title, category, firstImpression, observation,
  archetype, keywords, caption = '', creatorName = '', isPublic = false, isCurated = false,
}) {
  const entry = {
    id:              crypto.randomUUID(),
    photo,
    title:           title?.trim()       ?? '',
    category,
    firstImpression,
    observation,
    archetype:       archetype           ?? '',
    keywords:        Array.isArray(keywords) ? keywords : [],
    caption:         caption?.trim()     ?? '',
    creatorName:     creatorName?.trim() ?? '',
    isPublic,
    isCurated,
    publishedAt:     Date.now(),
  }
  const entries = getEntries()
  entries.unshift(entry)
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries))
  return entry
}

export function getEntry(id) {
  return getEntries().find((e) => e.id === id) ?? null
}

// ─── Community Notes ──────────────────────────────────────────────────────────

export function getNotes(entryId) {
  try {
    const all = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}')
    return all[entryId] ?? []
  } catch {
    return []
  }
}

export function getNoteCount(entryId) {
  return getNotes(entryId).length
}

/**
 * Prepend a note to the entry's note list (newest first). Returns the note.
 */
export function addNote(entryId, text, author = '') {
  try {
    const all  = JSON.parse(localStorage.getItem(NOTES_KEY) || '{}')
    const note = {
      id:        crypto.randomUUID(),
      author:    author.trim(),
      text:      text.trim(),
      timestamp: Date.now(),
    }
    all[entryId] = [note, ...(all[entryId] ?? [])]
    localStorage.setItem(NOTES_KEY, JSON.stringify(all))
    return note
  } catch {
    return null
  }
}

// ─── Gallery helpers ──────────────────────────────────────────────────────────

/** Returns public entries sorted by note count (descending). */
export function getByNoteCount() {
  const entries = getPublicEntries()
  return entries
    .map((e) => ({ ...e, _noteCount: getNoteCount(e.id) }))
    .sort((a, b) => b._noteCount - a._noteCount)
}

/** Returns the top N most-discussed public entries. */
export function getMostDiscussed(n = 3) {
  return getByNoteCount()
    .filter((e) => e._noteCount > 0)
    .slice(0, n)
}

/** Returns entries explicitly flagged as curator picks (isCurated = true). */
export function getCuratorPicks(n = 6) {
  return getPublicEntries()
    .filter((e) => e.isCurated === true)
    .slice(0, n)
}

/** Returns the top N featured entries (curated first, then most notes). */
export function getFeatured(n = 1) {
  const curated = getCuratorPicks(n)
  if (curated.length >= n) return curated.slice(0, n)
  const byNotes = getMostDiscussed(n).filter((e) => !curated.find((c) => c.id === e.id))
  return [...curated, ...byNotes].slice(0, n)
}

/** Returns the N newest public entries. */
export function getNewest(n = 9) {
  return getPublicEntries()
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, n)
}

/** Returns public entries whose archetype matches (case-insensitive partial). */
export function getEntriesByArchetype(archetype) {
  const needle = archetype.toLowerCase()
  return getPublicEntries().filter(
    (e) => e.archetype?.toLowerCase().includes(needle)
  )
}

/** Returns public entries for a given category. */
export function getEntriesByCategory(category) {
  return getPublicEntries().filter((e) => e.category === category)
}

/** Returns a map of { archetype: count } for all public entries. */
export function getArchetypeCounts() {
  const counts = {}
  getPublicEntries().forEach((e) => {
    if (e.archetype) counts[e.archetype] = (counts[e.archetype] ?? 0) + 1
  })
  return counts
}
