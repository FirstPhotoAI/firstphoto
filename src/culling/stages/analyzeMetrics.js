import { loadFileImageData } from '../../lib/culling/loadImageData.js'
import { analyzeFromImageData } from '../../lib/culling/analyze.js'

export async function analyzePhotoMetrics(file, id = crypto.randomUUID()) {
  const imageData = await loadFileImageData(file)
  return analyzeFromImageData(imageData, id, file.name)
}
