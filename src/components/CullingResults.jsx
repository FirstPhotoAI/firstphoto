import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import { getCullFile } from '../culling/fileRegistry.js'
import {
  downloadCsvManifest,
  downloadJsonManifest,
  downloadOrganizedZip,
  downloadVerdictLists,
} from '../culling/exportManifest.js'
import {
  SESSION_TYPES,
  saveCreatorFeedback,
  getFeedbackForSession,
  feedbackFromSessionMeta,
} from '../data/creatorFeedback.js'

function CullThumb({ sessionId, photoId, alt }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    const file = getCullFile(sessionId, photoId)
    if (!file) return
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [sessionId, photoId])

  if (!src) {
    return <div className="aspect-[4/3] w-full bg-[rgba(15,15,15,0.06)]" />
  }

  return (
    <img
      src={src}
      alt={alt}
      className="aspect-[4/3] w-full object-cover"
      loading="lazy"
    />
  )
}

function formatSeconds(ms) {
  if (!ms) return '—'
  return `${Math.round(ms / 1000)}s`
}

function signalLabel(photo, T) {
  const parts = []
  const s = photo.signals ?? {}
  if (s.blurClass) parts.push(T.blur_class[s.blurClass] ?? s.blurClass)
  if (s.exposureClass && s.exposureClass !== 'normal') {
    parts.push(T.exposure_class[s.exposureClass] ?? s.exposureClass)
  }
  if (s.duplicateType) parts.push(T.dup_class[s.duplicateType] ?? s.duplicateType)
  if (photo.flags.length && !parts.length) {
    parts.push(...photo.flags.map((f) => T.flags[f] ?? f))
  }
  return parts.join(' · ')
}

export default function CullingResults({ meta, results }) {
  const { lang } = useLang()
  const T = translations[lang].cull
  const [tab, setTab] = useState('keep')
  const [feedbackSent, setFeedbackSent] = useState(
    () => getFeedbackForSession(meta.id).length > 0
  )
  const [sessionType, setSessionType] = useState('concert')
  const [keepActualCount, setKeepActualCount] = useState('')
  const [importantRejected, setImportantRejected] = useState('')
  const [timeSavedMinutes, setTimeSavedMinutes] = useState('')
  const [photographerRating, setPhotographerRating] = useState('')
  const [useAgain, setUseAgain] = useState('')
  const [comments, setComments] = useState('')

  const filtered = results.filter((r) => r.verdict === tab)
  const tabs = [
    { id: 'keep',   label: T.tab_keep,   count: meta.keep },
    { id: 'maybe',  label: T.tab_maybe,  count: meta.maybe },
    { id: 'reject', label: T.tab_reject, count: meta.reject },
  ]

  function submitFeedback(e) {
    e.preventDefault()
    saveCreatorFeedback({
      ...feedbackFromSessionMeta(meta),
      sessionType,
      keepActualCount,
      importantRejected: importantRejected === '' ? null : importantRejected === 'yes',
      timeSavedMinutes,
      photographerRating,
      useAgain: useAgain === '' ? null : useAgain === 'yes',
      comments,
    })
    setFeedbackSent(true)
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
        {T.results_label}
      </p>
      <h1 className="mt-4 font-display text-3xl font-light text-[#0f0f0f]">
        {T.results_h1}
      </h1>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="border border-[rgba(15,15,15,0.10)] px-4 py-5">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.40)]">
            {T.total_photos}
          </p>
          <p className="mt-2 font-display text-3xl font-light text-[#0f0f0f]">{meta.total}</p>
        </div>
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`border px-4 py-5 text-left transition-colors ${
              tab === id
                ? 'border-[#0f0f0f] bg-[rgba(15,15,15,0.04)]'
                : 'border-[rgba(15,15,15,0.10)] hover:border-[rgba(15,15,15,0.22)]'
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.40)]">
              {label}
            </p>
            <p className="mt-2 font-display text-3xl font-light text-[#0f0f0f]">{count}</p>
          </button>
        ))}
      </div>

      {meta.durationMs != null && (
        <p className="mt-6 text-sm text-[rgba(15,15,15,0.52)]">
          {T.processing_time.replace('{seconds}', formatSeconds(meta.durationMs))}
        </p>
      )}

      <div className="mt-8 border border-[rgba(15,15,15,0.10)] p-5">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(15,15,15,0.40)]">
          {T.export_title}
        </p>
        <p className="mt-2 text-[13px] text-[rgba(15,15,15,0.48)]">{T.export_desc}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => downloadOrganizedZip(results, meta)}>
            {T.export_zip}
          </button>
          <button type="button" className="btn-ghost" onClick={() => downloadCsvManifest(results, meta)}>
            {T.export_csv}
          </button>
          <button type="button" className="btn-ghost" onClick={() => downloadJsonManifest(results, meta)}>
            {T.export_json}
          </button>
          <button type="button" className="btn-ghost" onClick={() => downloadVerdictLists(results)}>
            {T.export_lists}
          </button>
        </div>
      </div>

      <form
        className="mt-8 border border-[rgba(15,15,15,0.10)] p-5"
        onSubmit={submitFeedback}
      >
        <p className="text-[10px] uppercase tracking-[0.16em] text-[rgba(15,15,15,0.40)]">
          {T.feedback_title}
        </p>
        {feedbackSent ? (
          <p className="mt-3 text-sm text-[rgba(15,15,15,0.52)]">{T.feedback_thanks}</p>
        ) : (
          <>
            <p className="mt-2 text-[13px] text-[rgba(15,15,15,0.48)]">{T.feedback_desc}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-[12px] text-[rgba(15,15,15,0.55)]">
                {T.feedback_session_type}
                <select
                  className="mt-1.5 w-full border border-[rgba(15,15,15,0.14)] bg-[#fafaf8] px-3 py-2 text-sm"
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                >
                  {SESSION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {T.feedback_types[type]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] text-[rgba(15,15,15,0.55)]">
                {T.feedback_q1}
                <input
                  type="number"
                  min="0"
                  max={meta.keep}
                  className="mt-1.5 w-full border border-[rgba(15,15,15,0.14)] bg-[#fafaf8] px-3 py-2 text-sm"
                  placeholder={String(meta.keep)}
                  value={keepActualCount}
                  onChange={(e) => setKeepActualCount(e.target.value)}
                />
              </label>
              <label className="block text-[12px] text-[rgba(15,15,15,0.55)]">
                {T.feedback_q2}
                <select
                  className="mt-1.5 w-full border border-[rgba(15,15,15,0.14)] bg-[#fafaf8] px-3 py-2 text-sm"
                  value={importantRejected}
                  onChange={(e) => setImportantRejected(e.target.value)}
                >
                  <option value="">{T.feedback_select}</option>
                  <option value="yes">{T.feedback_yes}</option>
                  <option value="no">{T.feedback_no}</option>
                </select>
              </label>
              <label className="block text-[12px] text-[rgba(15,15,15,0.55)]">
                {T.feedback_q3}
                <input
                  type="number"
                  min="0"
                  className="mt-1.5 w-full border border-[rgba(15,15,15,0.14)] bg-[#fafaf8] px-3 py-2 text-sm"
                  placeholder="60"
                  value={timeSavedMinutes}
                  onChange={(e) => setTimeSavedMinutes(e.target.value)}
                />
              </label>
              <label className="block text-[12px] text-[rgba(15,15,15,0.55)]">
                {T.feedback_rating}
                <select
                  className="mt-1.5 w-full border border-[rgba(15,15,15,0.14)] bg-[#fafaf8] px-3 py-2 text-sm"
                  value={photographerRating}
                  onChange={(e) => setPhotographerRating(e.target.value)}
                >
                  <option value="">{T.feedback_select}</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="block text-[12px] text-[rgba(15,15,15,0.55)]">
                {T.feedback_use_again}
                <select
                  className="mt-1.5 w-full border border-[rgba(15,15,15,0.14)] bg-[#fafaf8] px-3 py-2 text-sm"
                  value={useAgain}
                  onChange={(e) => setUseAgain(e.target.value)}
                >
                  <option value="">{T.feedback_select}</option>
                  <option value="yes">{T.feedback_yes}</option>
                  <option value="no">{T.feedback_no}</option>
                </select>
              </label>
            </div>
            <label className="mt-4 block text-[12px] text-[rgba(15,15,15,0.55)]">
              {T.feedback_comments}
              <textarea
                rows={3}
                className="mt-1.5 w-full border border-[rgba(15,15,15,0.14)] bg-[#fafaf8] px-3 py-2 text-sm"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </label>
            <button type="submit" className="btn-ghost mt-4">
              {T.feedback_submit}
            </button>
          </>
        )}
      </form>

      <div className="mt-10 flex flex-wrap gap-2 border-b border-[rgba(15,15,15,0.10)] pb-4">
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-[11px] uppercase tracking-[0.12em] transition-colors ${
              tab === id
                ? 'border border-[#0f0f0f] bg-[rgba(15,15,15,0.04)] text-[#0f0f0f]'
                : 'border border-transparent text-[rgba(15,15,15,0.42)] hover:text-[#0f0f0f]'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
        {filtered.map((photo) => (
          <div key={photo.id} className="group">
            <CullThumb sessionId={meta.id} photoId={photo.id} alt={photo.name} />
            <p className="mt-1.5 truncate text-[10px] text-[rgba(15,15,15,0.45)]">{photo.name}</p>
            <p className="text-[10px] uppercase tracking-[0.10em] text-[rgba(15,15,15,0.32)]">
              {T.rank} {photo.rank}
              {signalLabel(photo, T) && ` · ${signalLabel(photo, T)}`}
            </p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-12 text-center text-sm text-[rgba(15,15,15,0.38)]">{T.empty_tab}</p>
      )}

      <div className="mt-12 flex flex-wrap gap-3 border-t border-[rgba(15,15,15,0.10)] pt-8">
        <Link to="/creator/cull" className="btn-primary">{T.btn_new}</Link>
        <a
          href="mailto:hello@firstphoto.app?subject=Creator%20Beta%20Interest"
          className="btn-ghost"
        >
          {T.btn_beta_contact}
        </a>
      </div>

      <p className="mt-6 text-[11px] text-[rgba(15,15,15,0.32)]">{T.session_note}</p>
    </div>
  )
}
