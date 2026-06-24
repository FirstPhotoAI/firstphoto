import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addEntry, getArchiveCount, ARCHIVE_UPDATED_EVENT } from '../data/archiveStore'
import { buildArchiveMetadata, getIdentityTypeLabel } from '../utils/archiveMetadata'
import { recompressAll } from '../utils/imageDataUrl'
import { getOrderedPreviews } from '../utils/photoSeries'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import { logSeries, summarizeEntry } from '../utils/debugSeries'

export default function PublishSection({ ranked, portfolio, photos: uploadedPhotos }) {
  const top = ranked?.[0]
  const { lang } = useLang()
  const T = translations[lang].publish

  const [savedEntry,   setSavedEntry]   = useState(null)
  const [archiveCount, setArchiveCount] = useState(() => getArchiveCount())
  const [publishing,   setPublishing]   = useState(false)
  const [publishError, setPublishError] = useState('')

  useEffect(() => {
    function refresh() {
      setArchiveCount(getArchiveCount())
    }
    refresh()
    window.addEventListener(ARCHIVE_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(ARCHIVE_UPDATED_EVENT, refresh)
  }, [])

  async function handleSave() {
    if (!top?.analysis || publishing || savedEntry) return

    setPublishing(true)
    setPublishError('')

    try {
      const meta = buildArchiveMetadata(ranked, portfolio, lang)
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

      const entry = addEntry({
        photo:              photos[0],
        photos,
        title:              meta.title,
        category:           meta.category,
        identityType:       meta.identityType,
        observation:        meta.observation,
        archetype:          meta.archetype,
        keywords:           meta.keywords,
        caption:            meta.caption,
        suggested_sequence: meta.suggested_sequence,
        series_context:     meta.series_context,
        lang,
        isPublic:           true,
      })

      logSeries('PublishSection: addEntry returned', summarizeEntry(entry))

      setSavedEntry(entry)
      setArchiveCount(getArchiveCount())
    } catch (err) {
      console.error('Publish failed:', err)
      setPublishError(err?.message === 'QUOTA_EXCEEDED' ? T.error_quota : T.error_save)
    } finally {
      setPublishing(false)
    }
  }

  if (savedEntry) {
    const identityLabel = getIdentityTypeLabel(savedEntry.identityType, lang)

    return (
      <section className="border-t border-[rgba(15,15,15,0.12)] py-14">
        <p className="text-[13px] text-[rgba(15,15,15,0.45)]">✓</p>
        <p className="mt-2 font-display text-2xl font-light text-[#0f0f0f]">
          {T.success_h2}
        </p>
        <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-[rgba(15,15,15,0.52)]">
          {T.success_belonging}
        </p>
        <p className="mt-4 text-[13px] tracking-wide text-[rgba(15,15,15,0.55)]">
          {T.success_entry.replace('{n}', savedEntry.archiveNumber)}
        </p>
        {identityLabel && (
          <p className="mt-2 text-[12px] leading-relaxed text-[rgba(15,15,15,0.52)]">
            {T.identity_label}:{' '}
            <span className="text-[#0f0f0f]">{identityLabel}</span>
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/archive" className="btn-primary">{T.btn_view}</Link>
          <Link to="/upload" className="btn-ghost">{T.btn_new}</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="border-t border-[rgba(15,15,15,0.12)] py-14">
      <h2 className="font-display text-2xl font-light text-[#0f0f0f]">
        {T.h2}
      </h2>
      <p className="mt-4 max-w-md text-[13px] leading-relaxed text-[rgba(15,15,15,0.52)]">
        {T.description}
      </p>

      {archiveCount > 0 && (
        <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.38)]">
          {archiveCount === 1
            ? T.archive_counter_1.replace('{n}', archiveCount)
            : T.archive_counter_n.replace('{n}', archiveCount)}
        </p>
      )}

      {publishError && (
        <p className="mt-4 rounded-sm border border-rose-200 bg-rose-50/80 px-3 py-2 text-sm text-rose-600">
          {publishError}
        </p>
      )}

      <div className="mt-8">
        <button
          type="button"
          onClick={handleSave}
          disabled={publishing}
          className="btn-primary min-w-[220px] disabled:opacity-30"
        >
          {publishing ? T.btn_saving : T.btn_save}
        </button>
      </div>
    </section>
  )
}
