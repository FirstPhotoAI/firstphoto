import { useRef, useState } from 'react'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'

export const MIN_PHOTOS = 3
export const MAX_PHOTOS = 5

export default function PhotoUploader({ photos, onPhotosChange }) {
  const inputRef         = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [error,    setError]    = useState('')

  const { lang } = useLang()
  const T = translations[lang]?.upload ?? translations.es.upload

  function addFiles(fileList) {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (!incoming.length) {
      setError(T.err_type)
      return
    }

    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      setError(T.err_max.replace('{max}', MAX_PHOTOS))
      return
    }

    const toAdd = incoming.slice(0, remaining).map((file) => ({
      id:      crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      name:    file.name,
    }))

    setError('')
    onPhotosChange([...photos, ...toAdd])
  }

  function removePhoto(id) {
    const target = photos.find((p) => p.id === id)
    if (target) URL.revokeObjectURL(target.preview)
    onPhotosChange(photos.filter((p) => p.id !== id))
    setError('')
  }

  const canAnalyze = photos.length >= MIN_PHOTOS && photos.length <= MAX_PHOTOS
  const needed     = MIN_PHOTOS - photos.length

  return (
    <div className="space-y-6">

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed px-10 py-12 text-center transition-colors ${
          dragOver
            ? 'border-[rgba(15,15,15,0.45)] bg-[rgba(15,15,15,0.03)]'
            : 'border-[rgba(15,15,15,0.18)] hover:border-[rgba(15,15,15,0.34)]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <p className="font-display text-xl font-light text-[rgba(15,15,15,0.55)]">
          {T.drop_title}
        </p>
        <p className="mt-2 text-[11px] text-[rgba(15,15,15,0.36)]">
          {T.drop_hint}
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-[12px] text-rose-500">{error}</p>
      )}

      {/* Counter + status */}
      {photos.length > 0 && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="tabular-nums text-[rgba(15,15,15,0.46)]">
            {photos.length} / {MAX_PHOTOS}
          </span>
          <span className={canAnalyze ? 'text-[rgba(15,15,15,0.60)]' : 'text-[rgba(15,15,15,0.36)]'}>
            {canAnalyze
              ? T.status_ready
              : T.status_need.replace('{n}', needed)}
          </span>
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden border border-[rgba(15,15,15,0.12)]"
            >
              <img
                src={photo.preview}
                alt={`${i + 1}`}
                className="aspect-[3/4] w-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePhoto(photo.id) }}
                className="absolute right-1.5 top-1.5 bg-[rgba(0,0,0,0.65)] px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                {T.btn_remove}
              </button>
              <span className="absolute bottom-1.5 left-2 text-[10px] text-white/70 tabular-nums">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Minimum prompt */}
      {!canAnalyze && photos.length > 0 && (
        <p className="text-center text-[11px] text-[rgba(15,15,15,0.38)]">
          {T.min_prompt.replace('{min}', MIN_PHOTOS)}
        </p>
      )}

    </div>
  )
}
