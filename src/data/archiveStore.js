/**
 * archiveStore.js
 *
 * Client-side persistence for the Community Gallery.
 * All data lives in localStorage — no server, no cost.
 *
 * Entry shape:
 *   { id, photo (cover), photos (array), photoCount, title, category, firstImpression,
 *     observation, archetype, keywords, caption,
 *     creatorName, country, lang, isPublic, isCurated,
 *     publishedAt (ms timestamp) }
 *
 * Note shape (per entry):
 *   { id, author, text, timestamp (ms) }
 *   author is optional — omitted notes show as anonymous
 *
 * Backward compatibility:
 *   Existing entries without isPublic are treated as public.
 *   Existing entries without creatorName/country/lang are handled gracefully.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO: Shared Database Migration (Phase 2)
 * ─────────────────────────────────────────────────────────────────────────────
 * Currently all entries live in the user's own localStorage — meaning published
 * photos are visible only on that device. A future "public gallery" phase will
 * require migrating archive persistence to a shared backend.
 *
 * Recommended options (all have free tiers and work on Cloudflare Pages):
 *   • Supabase   — Postgres + row-level security. REST and realtime subscriptions.
 *                  Good choice if photos are stored in Supabase Storage.
 *   • Firebase   — Firestore (document store) + Firebase Storage for images.
 *                  Easy real-time sync across devices.
 *   • Cloudflare D1 / R2 — D1 (SQLite edge DB) + R2 (object storage for photos).
 *                  Best fit if staying fully within the Cloudflare ecosystem.
 *
 * Migration plan:
 *   1. Keep this file as the LOCAL store (works offline, zero latency).
 *   2. Create a `remoteArchiveStore.js` that mirrors this API (`addEntry`,
 *      `getPublicEntries`, etc.) but talks to the chosen backend.
 *   3. Add a feature flag (`VITE_USE_REMOTE_STORE=true`) to switch stores.
 *   4. On migration, seed the remote DB with existing localStorage entries
 *      so no community content is lost.
 *   5. Keep localStorage as a read-through cache for offline resilience.
 *
 * The current API surface is intentionally thin so it can be swapped out
 * without touching any component that calls it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { logSeries, summarizeEntry } from '../utils/debugSeries'

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

/** Normalize legacy + new entry shapes to always expose photos[], photo, photoCount. */
export function normalizeEntry(entry) {
  if (!entry) return entry

  const photos = Array.isArray(entry.photos) && entry.photos.length > 0
    ? entry.photos
    : entry.photo
      ? [entry.photo]
      : []

  const photo = photos[0] || entry.photo || null

  return {
    ...entry,
    photos,
    photo,
    photoCount: photos.length,
  }
}

export function getEntries() {
  try {
    const raw = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]')
    return Array.isArray(raw) ? raw.map(normalizeEntry) : []
  } catch {
    return []
  }
}

/** All entries that are publicly visible in the gallery. */
export function getPublicEntries() {
  return getEntries().filter((e) => e.isPublic !== false)
}

/** Returns all photographs for an entry (series-aware, backward compatible). */
export function getEntryPhotos(entry) {
  if (!entry) return []
  return normalizeEntry(entry).photos
}

/**
 * Prepend a new entry. Returns the saved entry with its id.
 */
export const ARCHIVE_UPDATED_EVENT = 'firstphoto:archive-updated'

export function addEntry(input) {
  logSeries('archiveStore: addEntry(input)', {
    photosLen: Array.isArray(input.photos) ? input.photos.length : 0,
    hasCover:  !!input.photo,
    isPublic:  input.isPublic,
  })

  const photos = Array.isArray(input.photos) && input.photos.length > 0
    ? input.photos
    : input.photo
      ? [input.photo]
      : []

  const photo = photos[0] || input.photo || null
  const now   = Date.now()

  const entry = normalizeEntry({
    id:              crypto.randomUUID(),
    photo,
    photos,
    photoCount:      photos.length,
    title:           input.title?.trim()       ?? '',
    category:        input.category,
    firstImpression: input.firstImpression,
    observation:     input.observation,
    archetype:       input.archetype           ?? '',
    keywords:        Array.isArray(input.keywords) ? input.keywords : [],
    caption:         input.caption?.trim()     ?? '',
    creatorName:     input.creatorName?.trim() ?? '',
    country:         input.country?.trim()     ?? '',
    lang:            input.lang                ?? 'es',
    isPublic:        input.isPublic            ?? false,
    isCurated:       input.isCurated           ?? false,
    publishedAt:     now,
    createdAt:       now,
  })

  const entries = getEntries()
  logSeries('archiveStore: entries before', entries.length)
  entries.unshift(entry)

  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries))
  } catch (err) {
    if (err?.name === 'QuotaExceededError') {
      throw new Error('QUOTA_EXCEEDED')
    }
    throw err
  }

  const saved = getEntries()
  logSeries('archiveStore: entries after', saved.length)
  logSeries('archiveStore: new entry', summarizeEntry(entry))

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ARCHIVE_UPDATED_EVENT, { detail: entry }))
  }

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

/** Returns a map of { country (lowercase): count } for all public entries with a country set. */
export function getCountryCounts() {
  const counts = {}
  getPublicEntries().forEach((e) => {
    if (e.country) {
      const key = e.country.trim().toLowerCase()
      if (key) counts[key] = (counts[key] ?? 0) + 1
    }
  })
  return counts
}

/**
 * Returns the N most recent public entries submitted within the last `days` days.
 * Falls back to the newest N entries if none are recent (e.g. seed data with old timestamps).
 */
export function getRecentEntries(n = 3, days = 30) {
  const all    = getPublicEntries().sort((a, b) => b.publishedAt - a.publishedAt)
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const recent = all.filter((e) => e.publishedAt >= cutoff)
  return (recent.length >= n ? recent : all).slice(0, n)
}

/** Returns the N newest public community (non-founder) entries. */
export function getCommunityEntries(n = 9) {
  return getPublicEntries()
    .filter((e) => !isFounderEntry(e))
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .slice(0, n)
}

/** Seed/founder content — used only to fill the archive until community submissions grow. */
export function isFounderEntry(entry) {
  return entry?.creatorName === 'FirstPhoto'
}

/**
 * Homepage recent works: community submissions first (newest), founder seed second.
 * As community entries accumulate they naturally replace founder photos in the grid.
 */
export function getHomepageRecentWorks(n = 12) {
  const limit = Math.min(Math.max(n, 6), 12)
  const byNewest = getPublicEntries().sort((a, b) => b.publishedAt - a.publishedAt)
  const community = byNewest.filter((e) => !isFounderEntry(e))
  const founder   = byNewest.filter((e) => isFounderEntry(e))
  return [...community, ...founder].slice(0, limit)
}
