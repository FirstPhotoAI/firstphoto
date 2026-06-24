import { CULL_LIMITS } from './constants.js'
import {
  resolveDuplicates,
  rankPhotos,
  assignVerdicts,
} from './stages/index.js'
import { analyzeFilesParallel } from './workerPool.js'
import { logCullMetrics } from '../lib/culling/metrics.js'

/**
 * @typedef {Object} PipelineProgress
 * @property {string} stage
 * @property {number} done
 * @property {number} total
 * @property {number} [elapsedMs]
 */

/**
 * Run the full culling pipeline on JPEG files.
 * @param {File[]} files
 * @param {(p: PipelineProgress) => void} [onProgress]
 */
export async function runCullPipeline(files, onProgress) {
  const total = files.length
  const startedAt = Date.now()

  const { metrics, fileById } = await analyzeFilesParallel(files, (done, batchTotal) => {
    onProgress?.({
      stage: 'analyze',
      done,
      total: batchTotal,
      elapsedMs: Date.now() - startedAt,
    })
  })

  onProgress?.({ stage: 'duplicates', done: 0, total: 1, elapsedMs: Date.now() - startedAt })
  resolveDuplicates(metrics)
  await yieldToMain()

  onProgress?.({ stage: 'rank', done: 0, total: 1, elapsedMs: Date.now() - startedAt })
  const ranked = rankPhotos(metrics)
  await yieldToMain()

  onProgress?.({ stage: 'verdicts', done: 0, total: 1, elapsedMs: Date.now() - startedAt })
  const results = assignVerdicts(ranked)

  const keep = results.filter((r) => r.verdict === 'keep').length
  const maybe = results.filter((r) => r.verdict === 'maybe').length
  const reject = results.filter((r) => r.verdict === 'reject').length
  const finishedAt = Date.now()
  const durationMs = finishedAt - startedAt

  const meta = {
    id: crypto.randomUUID(),
    total,
    keep,
    maybe,
    reject,
    startedAt,
    finishedAt,
    durationMs,
  }

  logCullMetrics({
    session_id: meta.id,
    image_count: total,
    processing_duration: durationMs,
    keep_count: keep,
    maybe_count: maybe,
    reject_count: reject,
  })

  return {
    results: results.map(toPublicResult),
    meta,
    fileById,
  }
}

function toPublicResult(item) {
  return {
    id: item.id,
    name: item.name,
    rank: item.rank,
    verdict: item.verdict,
    flags: item.flags ?? [],
    signals: {
      sharpness: item.sharpness,
      blur: item.blur,
      blurClass: item.blurClass,
      exposure: item.exposure,
      exposureClass: item.exposureClass,
      isDuplicate: !!item.isDuplicate,
      duplicateType: item.duplicateType ?? null,
      duplicateOf: item.duplicateOf ?? null,
    },
  }
}

function yieldToMain() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
