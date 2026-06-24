const KEY = 'firstphoto_cull_session'

export function saveCullSession(payload) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch (err) {
    console.error('Cull session save failed', err)
    throw new Error('QUOTA_EXCEEDED')
  }
}

export function loadCullSession() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    sessionStorage.removeItem(KEY)
    return null
  }
}

export function clearCullSession() {
  sessionStorage.removeItem(KEY)
}
