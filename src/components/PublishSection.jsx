import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addEntry, CATEGORIES, CATEGORIES_EN } from '../data/archiveStore'
import { buildCuratorCaption } from '../utils/analyzeImage'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'

const REACTION_KEYS = ['approachable', 'neutral', 'distant']

export default function PublishSection({ ranked }) {
  const top = ranked[0]
  const { lang } = useLang()
  const T = translations[lang].publish

  const categories = lang === 'es' ? CATEGORIES : CATEGORIES_EN

  const [step,       setStep]       = useState('prompt')   // 'prompt' | 'form' | 'done'
  const [title,      setTitle]      = useState('')
  const [category,   setCategory]   = useState('')
  const [impression, setImpression] = useState('')
  const [creator,    setCreator]    = useState('')
  const [entryId,    setEntryId]    = useState(null)

  function handlePublish(e) {
    e.preventDefault()
    if (!category || !impression) return

    const { editorial, scores } = top.analysis
    const archetype = editorial?.archetype ?? ''
    const caption   = buildCuratorCaption(archetype, category, scores, lang)

    const entry = addEntry({
      photo:           top.preview,
      title,
      category,
      firstImpression: impression,
      observation:     editorial?.curatorReview ?? top.analysis.overall,
      archetype,
      keywords:        editorial?.keywords ?? [],
      caption,
      creatorName:     creator,
      isPublic:        true,
    })

    setEntryId(entry.id)
    setStep('done')
  }

  /* ── Step: prompt ─────────────────────────────────────────────────────────── */
  if (step === 'prompt') {
    const archetype = top.analysis.editorial?.archetype
    return (
      <section className="border-t border-[rgba(15,15,15,0.12)] py-14">

        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
          {T.label}
        </p>

        <div className="mt-8 flex gap-7">
          <div className="w-16 shrink-0 border border-[rgba(15,15,15,0.12)]">
            <img
              src={top.preview}
              alt={T.photo_sublabel}
              className="aspect-[3/4] w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            {archetype && (
              <p className="text-[11px] uppercase tracking-[0.16em] text-[rgba(15,15,15,0.38)]">
                {archetype}
              </p>
            )}
            <p className={`font-display text-2xl font-light text-[#0f0f0f] ${archetype ? 'mt-1.5' : ''}`}>
              {T.question}
            </p>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-[rgba(15,15,15,0.50)]">
              {T.question_body}
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setStep('form')}
            className="btn-primary"
          >
            {T.btn_to_gallery}
          </button>
          <button
            type="button"
            onClick={() => setStep('done-private')}
            className="btn-ghost"
          >
            {T.btn_private}
          </button>
        </div>

        <p className="mt-5 text-[11px] text-[rgba(15,15,15,0.30)]">
          {T.private_note}
        </p>
      </section>
    )
  }

  /* ── Step: kept private ────────────────────────────────────────────────────── */
  if (step === 'done-private') {
    return (
      <section className="border-t border-[rgba(15,15,15,0.12)] py-14">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
          {T.label}
        </p>
        <p className="mt-5 font-display text-2xl font-light text-[rgba(15,15,15,0.40)]">
          {T.btn_private}.
        </p>
        <p className="mt-3 text-sm text-[rgba(15,15,15,0.38)]">
          {T.private_note}
        </p>
      </section>
    )
  }

  /* ── Step: success ─────────────────────────────────────────────────────────── */
  if (step === 'done') {
    const archetype = top.analysis.editorial?.archetype
    return (
      <section className="border-t border-[rgba(15,15,15,0.12)] py-14">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
          {T.success_label}
        </p>
        {archetype && (
          <p className="mt-5 text-[15px] text-[rgba(15,15,15,0.55)]">{archetype}</p>
        )}
        <p className={`font-display text-2xl font-light text-[#0f0f0f] ${archetype ? 'mt-2' : 'mt-5'}`}>
          {T.success_h2}
        </p>
        <p className="mt-3 text-sm text-[rgba(15,15,15,0.50)]">{T.success_body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/archive/${entryId}`} className="btn-primary">{T.btn_view}</Link>
          <Link to="/archive" className="btn-ghost">{T.btn_browse}</Link>
        </div>
      </section>
    )
  }

  /* ── Step: form ────────────────────────────────────────────────────────────── */
  return (
    <section className="border-t border-[rgba(15,15,15,0.12)] py-14">

      <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
        {T.label}
      </p>
      <h2 className="mt-4 font-display text-3xl font-light text-[#0f0f0f]">
        {T.h2}
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[rgba(15,15,15,0.50)]">
        {T.description}
      </p>

      <div className="mt-8 flex gap-7">
        <div className="w-20 shrink-0 border border-[rgba(15,15,15,0.12)]">
          <img
            src={top.preview}
            alt={T.photo_sublabel}
            className="aspect-[3/4] w-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          {top.analysis.editorial?.archetype && (
            <p className="text-[13px] text-[rgba(15,15,15,0.72)]">
              {top.analysis.editorial.archetype}
            </p>
          )}
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.30)]">
            {T.photo_sublabel}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-[rgba(15,15,15,0.50)]">
            {top.analysis.editorial?.firstImpression ?? top.analysis.overall}
          </p>
        </div>
      </div>

      <form onSubmit={handlePublish} className="mt-10 max-w-sm space-y-6">

        {/* Creator name */}
        <div>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.36)]">
            {T.creator_label}{' '}
            <span className="normal-case tracking-normal opacity-60">{T.creator_optional}</span>
          </label>
          <input
            type="text"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder={T.creator_placeholder}
            maxLength={60}
            className="w-full border border-[rgba(15,15,15,0.14)] bg-transparent px-4 py-2.5 text-[13px] text-[#0f0f0f] placeholder:text-[rgba(15,15,15,0.26)] focus:border-[rgba(15,15,15,0.40)] focus:outline-none"
          />
        </div>

        {/* Title */}
        <div>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.36)]">
            {T.title_label}{' '}
            <span className="normal-case tracking-normal opacity-60">{T.title_optional}</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={T.title_placeholder}
            maxLength={80}
            className="w-full border border-[rgba(15,15,15,0.14)] bg-transparent px-4 py-2.5 text-[13px] text-[#0f0f0f] placeholder:text-[rgba(15,15,15,0.26)] focus:border-[rgba(15,15,15,0.40)] focus:outline-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.36)]">
            {T.category_label}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full border border-[rgba(15,15,15,0.14)] bg-[#fafaf8] px-4 py-2.5 text-[13px] text-[#0f0f0f] focus:border-[rgba(15,15,15,0.40)] focus:outline-none"
          >
            <option value="">{T.category_placeholder}</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* First Impression */}
        <div>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.36)]">
            {T.impression_label}
          </label>
          <div className="flex gap-2">
            {REACTION_KEYS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setImpression(r)}
                className={`flex-1 border py-2.5 text-[11px] capitalize tracking-wide transition-colors duration-100 ${
                  impression === r
                    ? 'border-[#0f0f0f] bg-[rgba(15,15,15,0.04)] text-[#0f0f0f]'
                    : 'border-[rgba(15,15,15,0.14)] text-[rgba(15,15,15,0.46)] hover:border-[rgba(15,15,15,0.35)] hover:text-[#0f0f0f]'
                }`}
              >
                {T.reactions[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!category || !impression}
            className="btn-primary disabled:opacity-30"
          >
            {T.btn_publish}
          </button>
          <button
            type="button"
            onClick={() => setStep('prompt')}
            className="btn-ghost"
          >
            ←
          </button>
        </div>

      </form>
    </section>
  )
}
