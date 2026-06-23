import { useRef, useState } from 'react'

const MIN = 5
const MAX = 10

export default function PhotoUploader({ photos, onPhotosChange }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  function addFiles(fileList) {
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (!incoming.length) {
      setError('Please upload image files only.')
      return
    }

    const remaining = MAX - photos.length
    if (remaining <= 0) {
      setError(`Maximum ${MAX} photos allowed.`)
      return
    }

    const toAdd = incoming.slice(0, remaining).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
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

  const canAnalyze = photos.length >= MIN && photos.length <= MAX

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragOver ? 'border-accent bg-accent/5' : 'border-surface-border hover:border-zinc-600'
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
        <p className="font-display text-lg font-semibold">Drop photos here</p>
        <p className="mt-2 text-sm text-zinc-500">or click to browse · {MIN}–{MAX} photos</p>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>{photos.length} / {MAX} photos</span>
        <span className={photos.length >= MIN ? 'text-emerald-400' : 'text-zinc-500'}>
          {photos.length >= MIN ? 'Ready to analyze' : `${MIN - photos.length} more needed`}
        </span>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {photos.map((photo, i) => (
            <div key={photo.id} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-surface-border">
              <img src={photo.preview} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePhoto(photo.id) }}
                className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100"
              >
                Remove
              </button>
              <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-xs">{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {!canAnalyze && photos.length > 0 && (
        <p className="text-center text-sm text-zinc-500">
          Upload at least {MIN} photos to unlock analysis.
        </p>
      )}
    </div>
  )
}

export { MIN as MIN_PHOTOS, MAX as MAX_PHOTOS }
