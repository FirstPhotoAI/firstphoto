/**
 * Simulates upload → sessionStorage → load → publish → localStorage
 * Run: node scripts/debug-flow.mjs
 */
import { readFileSync } from 'fs'
import { pathToFileURL } from 'url'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')

const store = {}
global.sessionStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: (k) => { delete store[k] },
}
global.localStorage = {
  getItem: (k) => store['ls:' + k] ?? null,
  setItem: (k, v) => { store['ls:' + k] = String(v) },
  removeItem: (k) => { delete store['ls:' + k] },
}
if (!globalThis.crypto?.randomUUID) {
  globalThis.crypto = { ...globalThis.crypto, randomUUID: () => 'test-' + Math.random().toString(36).slice(2) }
}
global.window = { dispatchEvent: () => {} }

// Minimal 1x1 jpeg data URLs (distinct)
const TINY = [
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCxAA//2Q==',
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCyAA//2Q==',
]

const { saveStudyResults, loadStudyResults } = await import(pathToFileURL(join(root, 'src/utils/resultsStorage.js')).href)
const { getSeriesPreviews, getOrderedPreviews } = await import(pathToFileURL(join(root, 'src/utils/photoSeries.js')).href)
const { addEntry, getEntries, getPublicEntries } = await import(pathToFileURL(join(root, 'src/data/archiveStore.js')).href)

function makeRanked(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `id-${i}`,
    preview: TINY[i],
    name: `photo-${i}.jpg`,
    rank: i + 1,
    analysis: {
      scores: { total: 80 - i, brightness: { score: 70 }, contrast: { score: 70 }, saturation: { score: 70 }, composition: { score: 70 }, sharpness: { score: 70 } },
      editorial: { archetype: 'Test', firstImpression: 'hi', curatorReview: 'cr', keywords: [], creativeHighlights: [], growthSuggestions: [] },
      overall: 'ok',
    },
  }))
}

const ranked = makeRanked(3)
const portfolio = {
  suggested_sequence: { order: [0, 1, 2], items: [{ index: 0, role: 'opening', reason: 'a' }, { index: 1, role: 'supporting', reason: 'b' }, { index: 2, role: 'closing', reason: 'c' }] },
  series_observation: { mood: 'm', narrative: 'n' },
}

console.log('=== UPLOAD SIM ===')
console.log('selected files', ranked.length)

const saved = saveStudyResults(ranked, portfolio)
console.log('result payload photos', saved.photos?.length)

const loaded = loadStudyResults()
console.log('loaded photos', loaded.photos?.length)
console.log('loaded ranked', loaded.ranked?.length)
console.log('previews with data:', loaded.photos.filter(p => p.preview?.startsWith('data:')).length)

const previews = getSeriesPreviews(loaded.photos, loaded.ranked)
console.log('getSeriesPreviews count', previews.length)

const ordered = getOrderedPreviews(loaded.ranked, loaded.portfolio, loaded.photos)
console.log('getOrderedPreviews count', ordered.length)

console.log('=== PUBLISH SIM ===')
const before = getEntries().length
const entry = addEntry({
  photo: ordered[0],
  photos: ordered,
  category: 'Retrato',
  firstImpression: 'neutral',
  archetype: 'Test',
  caption: 'cap',
  isPublic: true,
})
const after = getEntries().length
console.log('entries before', before)
console.log('new entry photoCount', entry.photoCount)
console.log('entries after', after)
console.log('public entries', getPublicEntries().length)
