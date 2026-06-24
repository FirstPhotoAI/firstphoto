import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreatorLayout from '../components/CreatorLayout'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import { CULL_LIMITS } from '../culling/constants.js'
import { runCullPipeline } from '../culling/pipeline.js'
import { registerCullSession } from '../culling/fileRegistry.js'
import { saveCullSession } from '../culling/sessionStorage.js'

function filterJpegs(fileList) {
  return Array.from(fileList ?? []).filter(
    (f) => f.type === 'image/jpeg' || /\.jpe?g$/i.test(f.name)
  )
}

export default function CreatorCullPage() {
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(null)
  const navigate = useNavigate()
  const { lang } = useLang()
  const T = translations[lang].cull

  function addFiles(incoming) {
    if (!incoming.length) {
      setError(T.err_type)
      return
    }
    setError('')
    setFiles((prev) => [...prev, ...incoming].slice(0, CULL_LIMITS.MAX_FILES))
  }

  function onPickFiles(e) {
    addFiles(filterJpegs(e.target.files))
    e.target.value = ''
  }

  function onPickFolder(e) {
    addFiles(filterJpegs(e.target.files))
    e.target.value = ''
  }

  function removeAt(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function startCull() {
    if (files.length < CULL_LIMITS.MIN_FILES) {
      setError(T.err_min.replace('{min}', CULL_LIMITS.MIN_FILES))
      return
    }
    setProcessing(true)
    setError('')
    setProgress({ stage: 'analyze', done: 0, total: files.length, elapsedMs: 0 })

    try {
      const { results, meta, fileById } = await runCullPipeline(files, setProgress)
      registerCullSession(meta.id, fileById)
      saveCullSession({ meta, results })
      navigate('/creator/results')
    } catch (err) {
      console.error(err)
      setError(err?.message === 'QUOTA_EXCEEDED' ? T.err_quota : T.err_process)
      setProcessing(false)
      setProgress(null)
    }
  }

  const canStart = files.length >= CULL_LIMITS.MIN_FILES && !processing
  const pct = progress?.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <CreatorLayout>
      <div className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
          {T.label}
        </p>
        <h1 className="mt-4 font-display text-3xl font-light text-[#0f0f0f] md:text-4xl">
          {T.h1}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
          {T.description}
        </p>
        <p className="mt-2 text-[12px] text-[rgba(15,15,15,0.42)]">
          {T.limits.replace('{min}', CULL_LIMITS.MIN_FILES).replace('{max}', CULL_LIMITS.MAX_FILES)}
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div
            className={`border border-dashed px-6 py-10 text-center transition-colors ${
              processing
                ? 'border-[rgba(15,15,15,0.14)] opacity-60'
                : 'cursor-pointer border-[rgba(15,15,15,0.22)] hover:border-[rgba(15,15,15,0.40)]'
            }`}
            onClick={() => !processing && fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,.jpg,.jpeg"
              multiple
              className="hidden"
              onChange={onPickFiles}
              disabled={processing}
            />
            <p className="text-sm text-[rgba(15,15,15,0.55)]">{T.drop_title}</p>
            <p className="mt-2 text-[11px] text-[rgba(15,15,15,0.38)]">{T.drop_hint}</p>
          </div>

          <div
            className={`border border-dashed px-6 py-10 text-center transition-colors ${
              processing
                ? 'border-[rgba(15,15,15,0.14)] opacity-60'
                : 'cursor-pointer border-[rgba(15,15,15,0.22)] hover:border-[rgba(15,15,15,0.40)]'
            }`}
            onClick={() => !processing && folderInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && folderInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={folderInputRef}
              type="file"
              accept="image/jpeg,.jpg,.jpeg"
              multiple
              className="hidden"
              onChange={onPickFolder}
              disabled={processing}
              {...{ webkitdirectory: '', directory: '' }}
            />
            <p className="text-sm text-[rgba(15,15,15,0.55)]">{T.folder_title}</p>
            <p className="mt-2 text-[11px] text-[rgba(15,15,15,0.38)]">{T.folder_hint}</p>
          </div>
        </div>

        {files.length > 0 && (
          <p className="mt-4 text-center text-[13px] text-[rgba(15,15,15,0.55)]">
            {T.count.replace('{n}', files.length)}
          </p>
        )}

        {files.length > 0 && files.length < CULL_LIMITS.MIN_FILES && (
          <p className="mt-2 text-center text-[11px] text-[rgba(15,15,15,0.38)]">
            {T.err_min.replace('{min}', CULL_LIMITS.MIN_FILES)}
          </p>
        )}

        {files.length > 0 && files.length <= 30 && (
          <ul className="mt-4 max-h-40 overflow-y-auto border border-[rgba(15,15,15,0.08)] text-[11px] text-[rgba(15,15,15,0.45)]">
            {files.slice(0, 30).map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between border-b border-[rgba(15,15,15,0.06)] px-3 py-1.5 last:border-0">
                <span className="truncate">{f.name}</span>
                {!processing && (
                  <button type="button" onClick={() => removeAt(i)} className="ml-2 shrink-0 text-[rgba(15,15,15,0.30)] hover:text-[#0f0f0f]">
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {processing && progress && (
          <div className="mt-8">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.40)]">
              {T.progress[progress.stage] ?? progress.stage}
            </p>
            <div className="mt-3 h-1 w-full bg-[rgba(15,15,15,0.08)]">
              <div
                className="h-full bg-[#0f0f0f] transition-all duration-200"
                style={{ width: `${progress.stage === 'analyze' ? pct : 100}%` }}
              />
            </div>
            {progress.stage === 'analyze' && (
              <p className="mt-2 text-[11px] text-[rgba(15,15,15,0.38)]">
                {progress.done} / {progress.total}
              </p>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-center text-sm text-rose-500">{error}</p>}

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={startCull}
            disabled={!canStart}
            className="btn-primary min-w-[220px] disabled:opacity-30"
          >
            {processing ? T.btn_working : T.btn_start}
          </button>
        </div>
      </div>
    </CreatorLayout>
  )
}
