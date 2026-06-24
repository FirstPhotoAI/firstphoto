import { loadBufferImageData } from '../../lib/culling/loadImageData.js'
import { analyzeFromImageData } from '../../lib/culling/analyze.js'

self.onmessage = async (event) => {
  const { id, name, buffer } = event.data
  try {
    const imageData = await loadBufferImageData(buffer)
    const result = analyzeFromImageData(imageData, id, name)
    self.postMessage({ result })
  } catch (err) {
    self.postMessage({ error: err?.message ?? 'Analyze failed' })
  }
}
