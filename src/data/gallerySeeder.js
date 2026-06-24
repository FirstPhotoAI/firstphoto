/**
 * Gallery seeding disabled — Play is private-only; no founder/sample photos are added.
 * Archive routes redirect to home.
 */

const SEEDED_KEY = 'firstphoto_gallery_seeded_v4'

export function initializeGallery() {
  try {
    localStorage.setItem(SEEDED_KEY, '1')
  } catch {
    // noop
  }
}

/** Dev helper — clears legacy archive data without re-seeding. */
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
