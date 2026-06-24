import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addEntry, CATEGORIES, CATEGORIES_EN } from '../data/archiveStore'
import { buildCuratorCaption } from '../utils/analyzeImage'
import { recompressAll } from '../utils/imageDataUrl'
import { getOrderedPreviews } from '../utils/photoSeries'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import { SeriesPhotoGrid } from './SeriesPhotoStrip'
import { logSeries, summarizeEntry } from '../utils/debugSeries'

const REACTION_KEYS = ['approachable', 'neutral', 'distant']

function buildSeriesCaption(portfolio, archetype, category, scores, lang) {
  const obs = portfolio?.series_observation
  if (obs?.narrative) {
    const parts = [obs.mood, obs.narrative].filter(Boolean)
    return parts.join(' ')
  }
  return buildCuratorCaption(archetype, category, scores, lang)
}

function SeriesPreview({ ranked, portfolio, uploadedPhotos, label }) {
  const photos = getOrderedPreviews(ranked, portfolio, uploadedPhotos)
  return (
    <div className="mt-8">
      <SeriesPhotoGrid photos={photos} alt={label} />
    </div>
  )
}

export default function PublishSection({ ranked, portfolio, photos: uploadedPhotos }) {
  const top = ranked?.[0]
  const seriesCount = uploadedPhotos?.length ?? ranked?.length ?? 0
  const { lang } = useLang()
  const T = translations[lang].publish

  const categories = lang === 'es' ? CATEGORIES : CATEGORIES_EN

  const [step,         setStep]         = useState('prompt')
  const [title,        setTitle]        = useState('')
  const [category,     setCategory]     = useState('')
  const [impression,   setImpression]   = useState('')
  const [creator,      setCreator]      = useState('')
  const [country,      setCountry]      = useState('')
  const [entryId,      setEntryId]      = useState(null)
  const [publishing,   setPublishing]   = useState(false)
  const [publishError, setPublishError] = useState('')

  async function handlePublish(e) {
    e.preventDefault()
    if (!category || !impression || !top?.analysis) {
      if (!category || !impression) {
        setPublishError(T.error_form_incomplete)
      }
      return
    }

    setPublishing(true)
    setPublishError('')

    try {
      const { editorial, scores } = top.analysis
      const archetype = editorial?.archetype ?? ''
      const rawPhotos = getOrderedPreviews(ranked, portfolio, uploadedPhotos)

      if (!rawPhotos.length) {
        throw new Error('NO_PHOTOS')
      }

      let photos
      try {
        photos = await recompressAll(rawPhotos, 480, 0.65)
      } catch (recompressErr) {
        logSeries('PublishSection: recompress failed, using raw', recompressErr?.message)
        photos = rawPhotos
      }

      const caption = buildSeriesCaption(portfolio, archetype, category, scores, lang)

      const entryPayload = {
        photo:           photos[0],
        photos,
        title,
        category,
        firstImpression: impression,
        observation:     portfolio?.series_observation?.narrative
          ?? editorial?.curatorReview
          ?? top.analysis.overall,
        archetype,
        keywords:        editorial?.keywords ?? [],
        caption,
        creatorName:     creator,
        country,
        lang,
        isPublic:        true,
      }

      logSeries('PublishSection: entry before addEntry', {
        photosLen: entryPayload.photos?.length ?? 0,
        coverOnly: !!entryPayload.photo,
        photoCount: entryPayload.photos?.length ?? 0,
      })

      const entry = addEntry(entryPayload)

      logSeries('PublishSection: addEntry returned', summarizeEntry(entry))

      setEntryId(entry.id)
      setStep('done')
    } catch (err) {
      console.error('Publish failed:', err)
      setPublishError(err?.message === 'QUOTA_EXCEEDED' ? T.error_quota : T.error_publish)
    } finally {
      setPublishing(false)
    }
  }

  /* ── Step: prompt ─────────────────────────────────────────────────────────── */
  if (step === 'prompt') {
    return (
      <section className="border-t border-[rgba(15,15,15,0.12)] py-14">

        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
          {T.label}
        </p>

        <p className="mt-6 font-display text-2xl font-light text-[#0f0f0f]">
          {T.question}
        </p>
        <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-[rgba(15,15,15,0.50)]">
          {T.question_body}
        </p>

        <SeriesPreview ranked={ranked} portfolio={portfolio} uploadedPhotos={uploadedPhotos} label="" />

        <p className="mt-4 text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.32)]">
          {T.series_sublabel.replace('{n}', seriesCount)}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" onClick={() => setStep('form')} className="btn-primary">
            {T.btn_to_gallery}
          </button>
          <button type="button" onClick={() => setStep('done-private')} className="btn-ghost">
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
    return (
      <section className="border-t border-[rgba(15,15,15,0.12)] py-14">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
          {T.success_label}
        </p>
        <p className="mt-5 font-display text-2xl font-light text-[#0f0f0f]">
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

      <SeriesPreview ranked={ranked} portfolio={portfolio} uploadedPhotos={uploadedPhotos} label={T.series_sublabel} />

      <p className="mt-4 text-[12px] leading-relaxed text-[rgba(15,15,15,0.50)]">
        {portfolio?.series_observation?.mood ?? top?.analysis?.editorial?.firstImpression ?? top?.analysis?.overall ?? ''}
      </p>

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

        {/* Country */}
        <div>
          <label className="mb-2 block text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.36)]">
            {T.country_label}{' '}
            <span className="normal-case tracking-normal opacity-60">{T.country_optional}</span>
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder={T.country_placeholder}
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

        {publishError && (
          <p className="text-sm text-rose-500">{publishError}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!category || !impression || publishing}
            className="btn-primary disabled:opacity-30"
          >
            {publishing ? T.btn_publishing : T.btn_publish}
          </button>
          <button type="button" onClick={() => setStep('prompt')} className="btn-ghost">
            ←
          </button>
        </div>

        <p className="mt-6 max-w-xs text-[11px] leading-relaxed text-[rgba(15,15,15,0.32)]">
          {T.local_notice}
        </p>

      </form>
    </section>
  )
}

