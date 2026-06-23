import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import PhotoUploader, { MIN_PHOTOS } from '../components/PhotoUploader'
import { analyzeAll } from '../utils/analyzeImage'

/**
 * Read a File with FileReader, resize to max 800 px via canvas, and return a
 * JPEG data URL.  Keeping the preview under ~150 KB per image prevents
 * sessionStorage quota errors when analysing 5–10 photos.
 */
function fileToDataUrl(file, maxDim = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Cannot read file: ${file.name}`))
    reader.onload = (evt) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1)
        const w = Math.max(1, Math.round(img.naturalWidth * scale))
        const h = Math.max(1, Math.round(img.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = evt.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function UploadPage() {
  const [photos, setPhotos] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const canAnalyze = photos.length >= MIN_PHOTOS

  async function handleAnalyze() {
    if (!canAnalyze) return
    setAnalyzing(true)
    setError('')

    try {
      // Convert each blob URL preview to a stable base64 data URL so that
      // sessionStorage entries remain valid after navigation or page refresh.
      const stable = await Promise.all(
        photos.map(async (photo) => ({
          ...photo,
          preview: await fileToDataUrl(photo.file),
        }))
      )

      const ranked = await analyzeAll(stable)

      sessionStorage.setItem('firstphoto_results', JSON.stringify(
        ranked.map(({ id, preview, name, rank, analysis }) => ({
          id, preview, name, rank, analysis,
        }))
      ))

      navigate('/results')
    } catch (err) {
      console.error('Analysis failed:', err)
      setError('Analysis failed — please try again with different photos.')
      setAnalyzing(false)
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
          Visual Study
        </p>
        <h1 className="mt-4 font-display text-4xl font-light text-[#0f0f0f]">
          Submit Photographs
        </h1>
        <p className="mt-3 text-sm text-[rgba(15,15,15,0.52)]">
          Upload {MIN_PHOTOS}–10 images. Analysis runs entirely in your browser — nothing is transmitted.
        </p>

        <div className="mt-8">
          <PhotoUploader photos={photos} onPhotosChange={setPhotos} />
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-rose-400">{error}</p>
        )}

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            className="btn-primary min-w-[220px]"
          >
            {analyzing ? 'Reading observations…' : 'Begin observation'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
