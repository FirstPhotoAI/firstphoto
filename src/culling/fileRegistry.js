/** In-memory file handles for the active cull session (lost on refresh). */

const sessions = new Map()

/**
 * @param {string} sessionId
 * @param {File[]} files
 * @param {Map<string, File>} byId  id -> file (parallel to pipeline ids)
 */
export function registerCullSession(sessionId, byId) {
  sessions.set(sessionId, byId)
}

export function getCullFile(sessionId, photoId) {
  return sessions.get(sessionId)?.get(photoId) ?? null
}

export function clearCullSession(sessionId) {
  sessions.delete(sessionId)
}

/**
 * Build id->File map from pipeline input order and generated ids.
 * @param {File[]} files
 * @param {string[]} ids in same order as processing
 */
export function mapFilesById(files, ids) {
  const map = new Map()
  files.forEach((file, i) => {
    if (ids[i]) map.set(ids[i], file)
  })
  return map
}
