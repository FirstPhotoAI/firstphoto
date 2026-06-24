/**
 * gallerySeeder.js
 *
 * Seeds the Community Gallery with 5 founder photographs that establish
 * the visual culture of FirstPhoto.
 *
 * These are real photographs stored as static assets in /public/gallery/.
 * They demonstrate: atmosphere, storytelling, experimentation, visual identity,
 * and creative risk — not the person's appearance.
 *
 * Seeding runs once on first visit (checked via SEEDED_KEY in localStorage).
 * Bump SEEDED_KEY version to re-seed across existing installs.
 */

import { addEntry, getPublicEntries } from './archiveStore'

const SEEDED_KEY = 'firstphoto_gallery_seeded_v4'

// Static public assets in /public/gallery-seed/ — served by Vite, no localStorage size cost
const PHOTOS = {
  entry01: '/gallery-seed/founder-cinematic-carousel.jpg',
  entry02: '/gallery-seed/founder-double-exposure-carousel.jpg',
  entry03: '/gallery-seed/founder-forest-walk.jpg',
  entry04: '/gallery-seed/founder-monument-portrait.jpg',
  entry05: '/gallery-seed/founder-suit-editorial.jpg',
}

// ─── Seed entries ──────────────────────────────────────────────────────────────
// Added in reverse order (05 → 01) so Entry 01 sits first (newest) in the gallery.

const SEED_ENTRIES = [
  // ── Entry 01 — Cinematic carousel (Hero) ─────────────────────────────────────
  {
    photo:           PHOTOS.entry01,
    title:           '',
    category:        'Editorial',
    firstImpression: 'neutral',
    observation:     'Una figura inmóvil rodeada de movimiento. La fotografía explora la presencia en medio del caos y crea una sensación cinematográfica del tiempo que pasa.',
    archetype:       'Observador Cinematográfico',
    keywords:        ['cinematográfico', 'movimiento', 'presencia', 'caos', 'editorial'],
    caption:         'Una figura inmóvil rodeada de movimiento. La fotografía explora la presencia en medio del caos y crea una sensación cinematográfica del tiempo que pasa.',
    creatorName:     'FirstPhoto',
    country:         'México',
    lang:            'es',
    isCurated:       true,
  },

  // ── Entry 02 — Double exposure carousel ──────────────────────────────────────
  {
    photo:           PHOTOS.entry02,
    title:           '',
    category:        'Experimental',
    firstImpression: 'neutral',
    observation:     'Capas de luz, memoria y movimiento se fusionan, creando un retrato que se siente más recordado que observado.',
    archetype:       'Poeta Visual',
    keywords:        ['doble exposición', 'experimental', 'capas', 'memoria', 'luz'],
    caption:         'Capas de luz, memoria y movimiento se fusionan, creando un retrato que se siente más recordado que observado.',
    creatorName:     'FirstPhoto',
    country:         'México',
    lang:            'es',
    isCurated:       true,
  },

  // ── Entry 03 — Forest walking ─────────────────────────────────────────────────
  {
    photo:           PHOTOS.entry03,
    title:           '',
    category:        'Retrato',
    firstImpression: 'approachable',
    observation:     'El entorno se convierte en parte de la historia. La imagen sugiere movimiento, exploración e independencia silenciosa.',
    archetype:       'Nómada Moderno',
    keywords:        ['naturaleza', 'movimiento', 'exploración', 'independencia', 'bosque'],
    caption:         'El entorno se convierte en parte de la historia. La imagen sugiere movimiento, exploración e independencia silenciosa.',
    creatorName:     'FirstPhoto',
    country:         'México',
    lang:            'es',
    isCurated:       true,
  },

  // ── Entry 04 — Monument seated (not curated, normal public entry) ─────────────
  {
    photo:           PHOTOS.entry04,
    title:           '',
    category:        'Retrato',
    firstImpression: 'neutral',
    observation:     'Un retrato construido sobre la quietud y la autoposesión más que sobre la actuación.',
    archetype:       'Espíritu Independiente',
    keywords:        ['quietud', 'monumento', 'presencia', 'retrato', 'historia'],
    caption:         'Un retrato construido sobre la quietud y la autoposesión más que sobre la actuación.',
    creatorName:     'FirstPhoto',
    country:         'México',
    lang:            'es',
    isCurated:       false,
  },

  // ── Entry 05 — Suit portrait ──────────────────────────────────────────────────
  {
    photo:           PHOTOS.entry05,
    title:           '',
    category:        'Editorial',
    firstImpression: 'neutral',
    observation:     'Estructura limpia, confianza contenida y fuerte presencia visual crean un retrato editorial atemporal.',
    archetype:       'Líder Silencioso',
    keywords:        ['editorial', 'estructura', 'confianza', 'presencia', 'atemporal'],
    caption:         'Estructura limpia, confianza contenida y fuerte presencia visual crean un retrato editorial atemporal.',
    creatorName:     'FirstPhoto',
    country:         'México',
    lang:            'es',
    isCurated:       true,
  },
]

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Seeds the gallery on first visit. Safe to call on every app launch.
 * Checks SEEDED_KEY to avoid re-seeding unless the version is bumped.
 */
export function initializeGallery() {
  try {
    if (localStorage.getItem(SEEDED_KEY)) return
    const existing = getPublicEntries()
    const hadOldSeed = localStorage.getItem('firstphoto_gallery_seeded_v1')
                    || localStorage.getItem('firstphoto_gallery_seeded_v2')
                    || localStorage.getItem('firstphoto_gallery_seeded_v3')
    if (existing.length > 0 && !hadOldSeed) {
      // Real user content already exists (pre-seed install) — mark as done, leave untouched
      localStorage.setItem(SEEDED_KEY, '1')
      return
    }
    // Clear any previous seed version and re-seed with the real named photographs
    if (hadOldSeed) {
      localStorage.removeItem('firstphoto_archive')
      localStorage.removeItem('firstphoto_gallery_seeded_v1')
      localStorage.removeItem('firstphoto_gallery_seeded_v2')
      localStorage.removeItem('firstphoto_gallery_seeded_v3')
    }
    // Add entries oldest-first so Entry 01 ends up at top (newest)
    ;[...SEED_ENTRIES].reverse().forEach((entry) => addEntry({ ...entry, isPublic: true }))
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Clears gallery data and re-seeds with founder photographs.
 * For development use. Call from browser console: window.__resetGallery()
 */
export function resetAndSeedGallery() {
  try {
    localStorage.removeItem(SEEDED_KEY)
    localStorage.removeItem('firstphoto_gallery_seeded_v1')
    localStorage.removeItem('firstphoto_gallery_seeded_v2')
    localStorage.removeItem('firstphoto_gallery_seeded_v3')
    localStorage.removeItem('firstphoto_archive')
    initializeGallery()
    window.location.reload()
  } catch {
    // noop
  }
}
