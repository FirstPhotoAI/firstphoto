/**
 * Canvas helpers for resizing / recompressing image data URLs.
 * Used to keep sessionStorage and localStorage payloads under quota.
 */

export function dataUrlToImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = reject
    img.onload = () => resolve(img)
    img.src = dataUrl
  })
}

export function recompressDataUrl(dataUrl, maxDim = 480, quality = 0.65) {
  if (!dataUrl?.startsWith('data:image')) return Promise.resolve(dataUrl)

  return dataUrlToImage(dataUrl).then((img) => {
    const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1)
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  })
}

export async function recompressAll(dataUrls, maxDim = 480, quality = 0.65) {
  return Promise.all(dataUrls.map((url) => recompressDataUrl(url, maxDim, quality)))
}
