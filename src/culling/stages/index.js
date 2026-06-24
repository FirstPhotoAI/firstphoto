/**
 * Pipeline stage registry.
 * Each stage is a pure function over analyzed metrics — swap or extend for ML later.
 */
export { analyzePhotoMetrics } from './analyzeMetrics.js'
export { resolveDuplicates } from './duplicates.js'
export { assignVerdicts } from './assignVerdicts.js'
export { rankPhotos } from './rank.js'
