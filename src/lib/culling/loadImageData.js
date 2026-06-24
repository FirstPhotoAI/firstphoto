import { CULL_LIMITS } from './constants.js'

const MAX_DIM = CULL_LIMITS.THUMB_DIM

/**
 * Decode JPEG bytes into scaled ImageData (main thread and workers).
 * @param {ArrayBuffer} buffer
 */
export async function loadBufferImageData(buffer) {
  const blob = new Blob([buffer], { type: 'image/jpeg' })
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(MAX_DIM / bitmap.width, MAX_DIM / bitmap.height, 1)
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(w, h)
    : null

  let data
  if (canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bitmap, 0, 0, w, h)
    data = ctx.getImageData(0, 0, w, h)
  } else {
    const el = document.createElement('canvas')
    el.width = w
    el.height = h
    const ctx = el.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bitmap, 0, 0, w, h)
    data = ctx.getImageData(0, 0, w, h)
  }

  bitmap.close()
  return data
}

export async function loadFileImageData(file) {
  return loadBufferImageData(await file.arrayBuffer())
}
