import { CULL_LIMITS } from './constants.js'

/**
 * Pool of analyze workers for parallel JPEG processing.
 */
export function createAnalyzePool(size = CULL_LIMITS.WORKER_COUNT) {
  /** @type {Worker[]} */
  const workers = []
  /** @type {Map<Worker, (data: object) => void>} */
  const handlers = new Map()
  /** @type {Worker[]} */
  const idle = []

  for (let i = 0; i < size; i++) {
    const worker = new Worker(
      new URL('./worker/analyzeWorker.js', import.meta.url),
      { type: 'module' }
    )
    worker.onmessage = (event) => {
      const resolve = handlers.get(worker)
      handlers.delete(worker)
      idle.push(worker)
      resolve?.(event.data)
    }
    worker.onerror = () => {
      const resolve = handlers.get(worker)
      handlers.delete(worker)
      idle.push(worker)
      resolve?.({ error: 'Worker failed' })
    }
    workers.push(worker)
    idle.push(worker)
  }

  function acquireWorker() {
    if (idle.length) return Promise.resolve(idle.pop())
    return new Promise((resolve) => {
      const check = () => {
        if (idle.length) resolve(idle.pop())
        else setTimeout(check, 4)
      }
      check()
    })
  }

  async function analyze({ id, name, buffer }) {
    const worker = await acquireWorker()
    return new Promise((resolve) => {
      handlers.set(worker, (data) => resolve(data))
      worker.postMessage({ id, name, buffer }, [buffer])
    })
  }

  function terminate() {
    workers.forEach((w) => w.terminate())
    idle.length = 0
    handlers.clear()
  }

  return { analyze, terminate }
}

/**
 * Analyze all files in parallel via worker pool.
 * @param {File[]} files
 * @param {(done: number, total: number) => void} [onProgress]
 */
export async function analyzeFilesParallel(files, onProgress) {
  const pool = createAnalyzePool()
  const jobs = files.map((file) => ({
    id: crypto.randomUUID(),
    file,
    name: file.name,
  }))
  const metrics = new Array(jobs.length)
  const fileById = new Map()
  let done = 0
  let cursor = 0

  async function runWorker() {
    while (cursor < jobs.length) {
      const index = cursor++
      const job = jobs[index]
      const buffer = await job.file.arrayBuffer()
      const response = await pool.analyze({ id: job.id, name: job.name, buffer })
      if (response.error) {
        pool.terminate()
        throw new Error(response.error)
      }
      metrics[index] = response.result
      fileById.set(job.id, job.file)
      done += 1
      onProgress?.(done, jobs.length)
    }
  }

  try {
    await Promise.all(
      Array.from({ length: CULL_LIMITS.WORKER_COUNT }, () => runWorker())
    )
    return { metrics, fileById }
  } finally {
    pool.terminate()
  }
}
