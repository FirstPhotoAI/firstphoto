import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { addNote, getEntry, getNotes, getNoteCount, getEntryPhotos } from '../data/archiveStore'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import { SeriesPhotoGrid } from '../components/SeriesPhotoStrip'

const MAX_NOTE = 300

// ─── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(ms, lang) {
  const diff    = Date.now() - ms
  const mins    = Math.floor(diff / 60_000)
  const hours   = Math.floor(diff / 3_600_000)
  const days    = Math.floor(diff / 86_400_000)

  if (lang === 'ja') {
    if (mins < 1)   return 'たった今'
    if (mins < 60)  return `${mins}分前`
    if (hours < 24) return `${hours}時間前`
    return `${days}日前`
  }
  if (lang === 'es') {
    if (mins < 1)   return 'Ahora mismo'
    if (mins < 60)  return `Hace ${mins} min`
    if (hours < 24) return `Hace ${hours} h`
    return `Hace ${days} d`
  }
  // en
  if (mins < 1)   return 'Just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// ─── Community Notes ───────────────────────────────────────────────────────────

function CommunityNotes({ entryId, lang }) {
  const T = translations[lang]?.entry ?? translations.es.entry

  const [notes,     setNotes]     = useState(() => getNotes(entryId))
  const [text,      setText]      = useState('')
  const [author,    setAuthor]    = useState('')
  const [confirmed, setConfirmed] = useState(false)

  // Rotating prompt — advance on each note submission or focus
  const [promptIdx, setPromptIdx] = useState(
    () => Math.floor(Math.random() * T.community_prompts.length)
  )

  // Sync prompts if language changes
  const prompts = T.community_prompts
  const prompt  = prompts[promptIdx % prompts.length]

  function advancePrompt() {
    setPromptIdx((i) => (i + 1) % prompts.length)
  }

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || trimmed.length > MAX_NOTE) return

    const note = addNote(entryId, trimmed, author)
    if (note) {
      setNotes((prev) => [note, ...prev])
      setText('')
      setAuthor('')
      setConfirmed(true)
      advancePrompt()
      setTimeout(() => setConfirmed(false), 3500)
    }
  }

  return (
    <div className="mt-14 border-t border-[rgba(15,15,15,0.10)] pt-12">

      {/* Section label */}
      <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
        {T.community_label}
      </p>

      {/* Rotating prompt */}
      <p className="mt-5 font-display text-[17px] font-light leading-[1.6] text-[rgba(15,15,15,0.55)]">
        {prompt}
      </p>

      {/* Note form */}
      <form onSubmit={handleSubmit} className="mt-7 max-w-lg">

        {/* Author name */}
        <div className="mb-4">
          <label className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.34)]">
            {T.community_author_label}{' '}
            <span className="normal-case tracking-normal opacity-60">
              {T.community_author_optional}
            </span>
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={T.community_author_placeholder}
            maxLength={60}
            className="w-full border border-[rgba(15,15,15,0.14)] bg-transparent px-4 py-2.5 text-[13px] text-[#0f0f0f] placeholder:text-[rgba(15,15,15,0.26)] focus:border-[rgba(15,15,15,0.38)] focus:outline-none"
          />
        </div>

        {/* Observation textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={advancePrompt}
          placeholder={T.community_placeholder}
          maxLength={MAX_NOTE}
          rows={4}
          className="w-full resize-none border border-[rgba(15,15,15,0.14)] bg-transparent px-4 py-3 text-[13px] leading-relaxed text-[#0f0f0f] placeholder:text-[rgba(15,15,15,0.26)] focus:border-[rgba(15,15,15,0.38)] focus:outline-none"
        />

        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] tabular-nums text-[rgba(15,15,15,0.24)]">
            {text.length} / {MAX_NOTE}
          </span>
          <button
            type="submit"
            disabled={!text.trim() || text.length > MAX_NOTE}
            className="btn-ghost disabled:opacity-30"
          >
            {confirmed ? T.community_btn_done : T.community_btn}
          </button>
        </div>
      </form>

      {/* Note list */}
      <div className="mt-12">
        {notes.length === 0 ? (
          <p className="text-[12px] italic text-[rgba(15,15,15,0.36)]">
            {T.community_empty}
          </p>
        ) : (
          <div>
            {notes.map((note, i) => {
              const displayAuthor = note.author || T.community_anonymous
              const time          = relativeTime(note.timestamp, lang)
              return (
                <div
                  key={note.id}
                  className={`py-7 ${i < notes.length - 1 ? 'border-b border-[rgba(15,15,15,0.07)]' : ''}`}
                >
                  {/* Author + time row */}
                  <div className="mb-3 flex items-baseline justify-between gap-4">
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[rgba(15,15,15,0.72)]">
                      {displayAuthor}
                    </span>
                    <span className="shrink-0 text-[10px] text-[rgba(15,15,15,0.28)]">
                      {time}
                    </span>
                  </div>
                  {/* Observation */}
                  <p className="text-[14px] leading-[1.85] text-[rgba(15,15,15,0.68)]">
                    &ldquo;{note.text}&rdquo;
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ArchiveEntryPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const { lang } = useLang()
  const T  = translations[lang]?.entry   ?? translations.es.entry
  const TG = translations[lang]?.gallery ?? translations.es.gallery

  useEffect(() => {
    const e = getEntry(id)
    if (!e) { navigate('/archive'); return }
    setEntry(e)
  }, [id, navigate])

  if (!entry) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center text-[11px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.35)]">
          {T.loading}
        </div>
      </Layout>
    )
  }

  const date = new Date(entry.publishedAt).toLocaleDateString(
    lang === 'ja' ? 'ja-JP' : lang === 'es' ? 'es-ES' : 'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' }
  )
  const noteCount = getNoteCount(entry.id)
  const creator   = entry.creatorName || TG.anonymous
  const photos    = getEntryPhotos(entry)

  return (
    <Layout>
      <div className="mx-auto max-w-2xl px-6 py-14">

        {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
        <p className="mb-8 text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.34)]">
          <Link to="/archive" className="transition-colors hover:text-[#0f0f0f]">
            {T.breadcrumb}
          </Link>
          <span className="mx-2 opacity-40">·</span>
          {entry.category}
        </p>

        {/* ── Visual series ───────────────────────────────────────────────── */}
        <SeriesPhotoGrid photos={photos} alt={entry.title || entry.category} />

        {/* ── Metadata ────────────────────────────────────────────────────── */}
        <div className="mt-7 border-b border-[rgba(15,15,15,0.10)] pb-7">

          {photos.length > 1 && (
            <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.38)]">
              {TG.series_count.replace('{n}', photos.length)}
            </p>
          )}

          {entry.caption && (
            <p className={`text-[15px] italic leading-[1.8] text-[rgba(15,15,15,0.56)] ${photos.length > 1 ? 'mt-4' : ''}`}>
              {entry.caption}
            </p>
          )}

          {entry.title ? (
            <h1 className="mt-4 font-display text-3xl font-light text-[#0f0f0f]">
              {entry.title}
            </h1>
          ) : !entry.caption && (
            <h1 className="font-display text-3xl font-light text-[rgba(15,15,15,0.30)]">
              {T.untitled}
            </h1>
          )}

          {entry.archetype && (
            <p className="mt-4 text-[9px] uppercase tracking-[0.16em] text-[rgba(15,15,15,0.28)]">
              {entry.archetype}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.30)]">
            <span>{creator}</span>
            <span>{entry.category}</span>
            {entry.firstImpression && <span>{entry.firstImpression}</span>}
            <span>{date}</span>
          </div>

          {noteCount > 0 && (
            <p className="mt-3 text-[11px] text-[rgba(15,15,15,0.36)]">
              {noteCount === 1
                ? TG.notes_1
                : TG.notes_n.replace('{n}', noteCount)}
            </p>
          )}

          {entry.keywords && entry.keywords.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
              {entry.keywords.map((k) => (
                <span
                  key={k}
                  className="text-[10px] uppercase tracking-[0.16em] text-[rgba(15,15,15,0.24)]"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Curator observation ──────────────────────────────────────────── */}
        {entry.observation && (
          <div className="mt-8 border-b border-[rgba(15,15,15,0.10)] pb-8">
            <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.34)]">
              {T.visual_study}
            </p>
            <p className="text-[15px] leading-[1.9] text-[rgba(15,15,15,0.72)]">
              {entry.observation}
            </p>
          </div>
        )}

        {/* ── Community Notes ─────────────────────────────────────────────── */}
        <CommunityNotes entryId={entry.id} lang={lang} />

      </div>
    </Layout>
  )
}
