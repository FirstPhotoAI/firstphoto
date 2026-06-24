const METRICS_KEY = 'firstphoto_cull_metrics'

/**
 * Log cull session metrics for product validation.
 * @param {{
 *   image_count: number,
 *   processing_duration: number,
 *   keep_count: number,
 *   maybe_count: number,
 *   reject_count: number,
 *   session_id?: string,
 * }} metrics
 */
export function logCullMetrics(metrics) {
  const entry = {
    ...metrics,
    logged_at: Date.now(),
  }

  console.info('[FirstPhoto Cull]', entry)

  try {
    const raw = localStorage.getItem(METRICS_KEY)
    const history = raw ? JSON.parse(raw) : []
    history.push(entry)
    localStorage.setItem(METRICS_KEY, JSON.stringify(history.slice(-50)))
  } catch {
    // Non-blocking — metrics must not break the workflow
  }
}

export function getCullMetricsHistory() {
  try {
    const raw = localStorage.getItem(METRICS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
