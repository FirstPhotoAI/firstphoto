import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import PhotoUploader, { MIN_PHOTOS } from '../components/PhotoUploader'
import { analyzeAll } from '../utils/analyzeImage'
import { saveStudyResults } from '../utils/resultsStorage'
import { recompressDataUrl } from '../utils/imageDataUrl'
import { logSeries, summarizeStudy } from '../utils/debugSeries'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'

function fileToDataUrl(file, maxDim = 640) {
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
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.src = evt.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function UploadPage() {
  const [photos,    setPhotos]    = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [error,     setError]     = useState('')
  const navigate = useNavigate()
  const { lang } = useLang()
  const T = translations[lang].upload

  const canAnalyze = photos.length >= MIN_PHOTOS

  async function handleAnalyze() {
    if (!canAnalyze) return
    setAnalyzing(true)
    setError('')

    logSeries('UploadPage: selected files', photos.length)

    try {
      const stable = await Promise.all(
        photos.map(async (photo) => ({
          ...photo,
          preview: await fileToDataUrl(photo.file),
        }))
      )

      const dataUrlCount = stable.filter((p) => p.preview?.startsWith('data:')).length
      logSeries('UploadPage: generated data URLs', dataUrlCount)

      const { ranked, portfolio } = await analyzeAll(stable, lang)

      if (ranked.length !== stable.length) {
        throw new Error(`Analysis returned ${ranked.length} photos, expected ${stable.length}`)
      }

      const lean = ranked.map(({ file: _f, ...rest }) => rest)

      let payload
      try {
        payload = saveStudyResults(lean, portfolio)
      } catch {
        const smaller = await Promise.all(
          lean.map(async (photo) => ({
            ...photo,
            preview: await recompressDataUrl(photo.preview, 400, 0.6),
          }))
        )
        payload = saveStudyResults(smaller, portfolio)
      }

      logSeries('UploadPage: sessionStorage payload', summarizeStudy(payload))

      // sessionStorage holds the full series — router state truncates large base64 payloads
      navigate('/results')
    } catch (err) {
      console.error('Analysis failed:', err)
      setError(T.error)
      setAnalyzing(false)
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
          {T.label}
        </p>
        <h1 className="mt-4 font-display text-4xl font-light text-[#0f0f0f]">
          {T.h1}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
          {T.description}
        </p>
        <p className="mt-2 text-sm text-[rgba(15,15,15,0.45)]">
          {T.helper}
        </p>

        <div className="mt-8">
          <PhotoUploader photos={photos} onPhotosChange={setPhotos} />
        </div>

        {photos.length >= MIN_PHOTOS && (
          <p className="mt-4 text-center text-[13px] text-[rgba(15,15,15,0.55)]">
            {T.photos_ready.replace('{n}', photos.length)}
          </p>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-rose-400">{error}</p>
        )}

        <div className="mt-8 flex flex-col items-center">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            className="btn-primary min-w-[220px]"
          >
            {analyzing ? T.btn_working : T.btn_analyze}
          </button>
          <p className="mt-4 max-w-md text-center text-[11px] leading-relaxed text-[rgba(15,15,15,0.38)]">
            {T.privacy_note}
          </p>
        </div>
      </div>
    </Layout>
  )
}

