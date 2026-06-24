import { BLUR_THRESHOLDS, EXPOSURE_THRESHOLDS } from './constants.js'
import { measureSharpness, classifyBlur, clamp100 } from './blur.js'
import { measureExposure, measureContrast, classifyExposure } from './exposure.js'
import { computeAHashFromGray } from './duplicates.js'

/**
 * Per-image analysis from decoded ImageData.
 * @param {ImageData} imageData
 * @param {string} id
 * @param {string} name
 */
export function analyzeFromImageData(imageData, id, name) {
  const { data, width, height } = imageData
  const sharp = measureSharpness(data, width, height)
  const exposure = measureExposure(sharp.gray)
  const contrast = measureContrast(sharp.gray)
  const aHash = computeAHashFromGray(sharp.gray, width, height)
  const blurClass = classifyBlur(sharp.score, BLUR_THRESHOLDS)
  const exposureClass = classifyExposure(exposure.luma, exposure.score, EXPOSURE_THRESHOLDS)

  return {
    id,
    name,
    isDuplicate: false,
    duplicateOf: null,
    duplicateType: null,
    flags: [],
    sharpness: sharp.score,
    sharpnessRaw: sharp.raw,
    blur: clamp100(100 - sharp.score),
    blurClass,
    exposure: exposure.score,
    luma: exposure.luma,
    exposureClass,
    contrast: contrast.score,
    aHash: aHash.toString(),
  }
}
