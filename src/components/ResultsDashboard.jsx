import { useState, useEffect } from 'react'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import { SeriesPhotoGrid } from './SeriesPhotoStrip'
import { getSeriesPreviews } from '../utils/photoSeries'
import { logSeries } from '../utils/debugSeries'
import { analyzeSeriesContext, getConsistencyWarning, buildBeforePublishingAdvice } from '../utils/seriesAnalysis'

// ─── Vote helpers (localStorage) ──────────────────────────────────────────────

const REACTION_KEYS = ['approachable', 'neutral', 'distant']

function getVotes(photoId) {
  try {
    const all = JSON.parse(localStorage.getItem('firstphoto_votes') || '{}')
    return all[photoId] || { approachable: 0, neutral: 0, distant: 0, myVote: null }
  } catch {
    return { approachable: 0, neutral: 0, distant: 0, myVote: null }
  }
}

function saveVote(photoId, reaction) {
  try {
    const all     = JSON.parse(localStorage.getItem('firstphoto_votes') || '{}')
    const current = all[photoId] || { approachable: 0, neutral: 0, distant: 0, myVote: null }

    if (current.myVote === reaction) {
      current[reaction] = Math.max(0, current[reaction] - 1)
      current.myVote = null
    } else {
      if (current.myVote) current[current.myVote] = Math.max(0, current[current.myVote] - 1)
      current[reaction] += 1
      current.myVote = reaction
    }

    all[photoId] = current
    localStorage.setItem('firstphoto_votes', JSON.stringify(all))
    return current
  } catch {
    return { approachable: 0, neutral: 0, distant: 0, myVote: null }
  }
}

// ─── VotingPanel ──────────────────────────────────────────────────────────────

function VotingPanel({ photoId, label, reactions }) {
  const [votes, setVotes] = useState(() => getVotes(photoId))
  const total = REACTION_KEYS.reduce((s, r) => s + votes[r], 0)

  return (
    <div>
      <p className="mb-3 text-[10px] uppercase tracking-[0.20em] text-[rgba(15,15,15,0.36)]">
        {label}
      </p>
      <div className="flex gap-2">
        {REACTION_KEYS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setVotes(saveVote(photoId, r))}
            className={`flex-1 border py-2 text-[11px] capitalize tracking-wide transition-colors duration-100 ${
              votes.myVote === r
                ? 'border-[#0f0f0f] bg-[rgba(15,15,15,0.04)] text-[#0f0f0f]'
                : 'border-[rgba(15,15,15,0.14)] text-[rgba(15,15,15,0.48)] hover:border-[rgba(15,15,15,0.35)] hover:text-[#0f0f0f]'
            }`}
          >
            {reactions[r]}
            {votes[r] > 0 && (
              <span className="ml-1 text-[rgba(15,15,15,0.35)]">{votes[r]}</span>
            )}
          </button>
        ))}
      </div>
      {total > 0 && (
        <p className="mt-2 text-[11px] text-[rgba(15,15,15,0.30)]">
          {total === 1 ? `1 ${label.toLowerCase()}` : `${total} ${label.toLowerCase()}`}
        </p>
      )}
    </div>
  )
}

// ─── DimTable ─────────────────────────────────────────────────────────────────

function DimTable({ scores, dimLabels }) {
  const DIMS = ['brightness', 'contrast', 'saturation', 'composition', 'sharpness']
  return (
    <div className="space-y-3.5">
      {DIMS.map((dim) => (
        <div key={dim}>
          <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-[10px] text-[rgba(15,15,15,0.40)]">
              {dimLabels[dim]}
            </span>
            <div className="relative h-[1px] flex-1 bg-[rgba(15,15,15,0.07)]">
              <div
                className="absolute inset-y-0 left-0 h-[1px] bg-[rgba(15,15,15,0.38)] transition-all duration-500"
                style={{ width: `${scores[dim].score}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-[rgba(15,15,15,0.26)]">
              {scores[dim].score}
            </span>
          </div>
          <p className="mt-1.5 pl-[6.75rem] text-[11px] leading-relaxed text-[rgba(15,15,15,0.46)]">
            {scores[dim].observation}
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── Sequence + series helpers ────────────────────────────────────────────────

const ROLE_LABEL_KEY = {
  opening:    'sequence_opening',
  supporting: 'sequence_supporting',
  closing:    'sequence_closing',
}

function resolveSequence(ranked, portfolio, photos) {
  const count = photos?.length ?? ranked.length
  const seq   = portfolio?.suggested_sequence

  if (seq?.items?.length === count && seq?.order?.length === count) {
    return seq
  }

  const items = (photos ?? ranked).map((photo, i) => {
    const rankedIdx = ranked.findIndex((r) => r.id === photo.id)
    const index = rankedIdx >= 0 ? rankedIdx : i
    return {
      index,
      role:   i === 0 ? 'opening' : i === count - 1 ? 'closing' : 'supporting',
      reason: ranked[index]?.analysis?.editorial?.firstImpression ?? '',
    }
  })
  return { order: items.map((i) => i.index), items }
}

function resolveSeriesObservation(portfolio, ranked) {
  if (portfolio?.series_observation) return portfolio.series_observation
  const top = ranked[0]?.analysis?.editorial
  return {
    mood:        top?.firstImpression ?? '',
    rhythm:      portfolio?.what_makes_the_winner_stronger?.[0] ?? '',
    consistency: portfolio?.what_makes_the_winner_stronger?.[1] ?? '',
    narrative:   portfolio?.selection_reason ?? top?.curatorReview ?? '',
  }
}

// ─── SummaryView — sequence-first, identity secondary ─────────────────────────

function getRankedPhoto(ranked, photos, index) {
  if (ranked[index]?.preview) return ranked[index]
  const photo = photos?.[index]
  if (!photo) return ranked[index]
  return {
    ...ranked.find((r) => r.id === photo.id),
    ...photo,
    preview: photo.preview,
  }
}

function SummaryView({ ranked, portfolio, photos, T, lang }) {
  const sequence   = resolveSequence(ranked, portfolio, photos)
  const series     = resolveSeriesObservation(portfolio, ranked)
  const identity   = portfolio?.visual_identity ?? ranked[0]?.analysis?.editorial?.archetype ?? ''
  const allPhotos  = getSeriesPreviews(photos, ranked)
  const context    = portfolio?.series_context ?? analyzeSeriesContext(ranked)
  const warning    = getConsistencyWarning(context, lang)
  const beforeTips = buildBeforePublishingAdvice(ranked, portfolio, sequence, lang)
  const strongest  = ranked[0]
  const weakest    = ranked[ranked.length - 1]

  const roleLabel  = (role) => T[ROLE_LABEL_KEY[role]] ?? role
  const countLabel = T.series_count.replace('{n}', allPhotos.length)
  const photoNum   = (photo) => {
    const idx = ranked.findIndex((r) => r.id === photo?.id)
    return idx >= 0 ? idx + 1 : null
  }

  return (
    <section className="py-12">

      {/* Your Visual Series */}
      <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
        {T.series_grid_label}
      </p>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-[rgba(15,15,15,0.48)]">
        {T.series_intro}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[rgba(15,15,15,0.32)]">
        {countLabel}
      </p>

      <SeriesPhotoGrid
        photos={allPhotos}
        alt={T.series_grid_label}
        className="mt-6"
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {strongest?.preview && (
          <div className="border border-[rgba(15,15,15,0.10)] p-4">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.40)]">
              {T.strongest_label}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[rgba(15,15,15,0.62)]">
              {T.strongest_body.replace('{n}', String(photoNum(strongest) ?? 1))}
            </p>
          </div>
        )}
        {weakest?.preview && ranked.length > 1 && (
          <div className="border border-[rgba(15,15,15,0.10)] p-4">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.40)]">
              {T.weakest_label}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[rgba(15,15,15,0.62)]">
              {T.weakest_body.replace('{n}', String(photoNum(weakest) ?? ranked.length))}
            </p>
          </div>
        )}
      </div>

      {warning && (
        <p className="mt-5 max-w-lg border-l border-[rgba(15,15,15,0.18)] pl-4 text-[12px] leading-relaxed text-[rgba(15,15,15,0.52)]">
          {warning}
        </p>
      )}

      <div className="my-10 border-t border-[rgba(15,15,15,0.10)]" />

      {/* Recommended order */}
      <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
        {T.sequence_label}
      </p>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-[rgba(15,15,15,0.48)]">
        {T.sequence_intro}
      </p>

      <div className="mt-8 space-y-6">
        {sequence.items.map((item, seqIdx) => {
          const photo = getRankedPhoto(ranked, photos, item.index)
            ?? photos?.[seqIdx]
            ?? ranked[item.index]
          if (!photo?.preview) return null
          const num = photoNum(photo) ?? seqIdx + 1
          return (
            <div
              key={photo.id ?? seqIdx}
              className="flex gap-4 border-b border-[rgba(15,15,15,0.07)] pb-6 last:border-0 last:pb-0 sm:gap-6"
            >
              <span className="w-6 shrink-0 pt-1 font-display text-sm text-[rgba(15,15,15,0.22)]">
                {String(seqIdx + 1).padStart(2, '0')}
              </span>
              <div className="w-20 shrink-0 border border-[rgba(15,15,15,0.10)] sm:w-24">
                <img
                  src={photo.preview}
                  alt={roleLabel(item.role)}
                  className="aspect-[3/4] w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] uppercase tracking-[0.20em] text-[rgba(15,15,15,0.40)]">
                  {roleLabel(item.role)} · {T.photo_n.replace('{n}', num)}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-[rgba(15,15,15,0.68)]">
                  {item.reason}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="my-10 border-t border-[rgba(15,15,15,0.10)]" />

      {/* Series Observation */}
      <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
        {T.observation_label}
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {[
          { label: T.series_mood,        text: series.mood },
          { label: T.series_rhythm,      text: series.rhythm },
          { label: T.series_consistency, text: series.consistency },
          { label: T.series_narrative,   text: series.narrative },
        ].map(({ label, text }) => (
          text ? (
            <div key={label}>
              <p className="text-[9px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.36)]">
                {label}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[rgba(15,15,15,0.62)]">
                {text}
              </p>
            </div>
          ) : null
        ))}
      </div>

      {identity && (
        <div className="mt-10 border-t border-[rgba(15,15,15,0.08)] pt-8">
          <p className="text-[9px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.32)]">
            {T.identity_secondary}
          </p>
          <p className="mt-2 text-sm text-[rgba(15,15,15,0.45)]">
            {identity}
          </p>
        </div>
      )}

      {beforeTips.length > 0 && (
        <>
          <div className="my-10 border-t border-[rgba(15,15,15,0.10)]" />
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
            {T.before_publish_label}
          </p>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[rgba(15,15,15,0.48)]">
            {T.before_publish_intro}
          </p>
          <ul className="mt-6 space-y-3">
            {beforeTips.map((tip) => (
              <li key={tip} className="flex gap-3 text-[13px] leading-relaxed text-[rgba(15,15,15,0.62)]">
                <span className="shrink-0 text-[rgba(15,15,15,0.28)]">—</span>
                {tip}
              </li>
            ))}
          </ul>
        </>
      )}

    </section>
  )
}

// ─── FullAnalysis — hidden behind toggle ──────────────────────────────────────

function FullAnalysis({ ranked, portfolio, T }) {
  const [showGrowth, setShowGrowth] = useState(false)
  const [showNotes,  setShowNotes]  = useState(false)
  const top = ranked[0]
  const { scores, editorial } = top.analysis
  const rest = ranked.slice(1)

  return (
    <div>

      {/* Portfolio detail: what stands out + try next */}
      {portfolio && (
        <div className="border-b border-[rgba(15,15,15,0.10)] pb-10">

          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.36)]">
                {T.portfolio_stands_out}
              </p>
              <ul className="space-y-2.5">
                {portfolio.what_makes_the_winner_stronger.map((obs, i) => (
                  <li key={i} className="flex gap-3 text-[13px] text-[rgba(15,15,15,0.68)]">
                    <span className="shrink-0 text-[rgba(15,15,15,0.28)]">•</span>
                    {obs}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.36)]">
                {T.portfolio_try_next}
              </p>
              <ul className="space-y-2.5">
                {portfolio.future_exploration.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[13px] text-[rgba(15,15,15,0.68)]">
                    <span className="shrink-0 text-[rgba(15,15,15,0.28)]">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      )}

      {/* Featured photo deep analysis */}
      <div className="py-10">

        <div className="flex gap-10 sm:gap-14">
          <div className="shrink-0">
            <div className="w-24 border border-[rgba(15,15,15,0.12)] sm:w-32">
              <img
                src={top.preview}
                alt={T.lead_label}
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
            <p className="mt-2 text-center text-[9px] tabular-nums text-[rgba(15,15,15,0.22)]">
              {scores.total} / 100
            </p>
          </div>

          <div className="min-w-0 flex-1 space-y-6">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.34)]">
                {T.first_impression}
              </p>
              <p className="text-[14px] leading-[1.9] text-[rgba(15,15,15,0.80)]">
                {editorial.firstImpression}
              </p>
            </div>
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.34)]">
                {T.visual_study}
              </p>
              <p className="text-[13px] leading-[1.95] text-[rgba(15,15,15,0.62)]">
                {editorial.curatorReview}
              </p>
            </div>
          </div>
        </div>

        {/* Creative highlights */}
        <div className="mt-8 border-t border-[rgba(15,15,15,0.08)] pt-7">
          <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.34)]">
            {T.creative_highlights}
          </p>
          <ul className="space-y-3">
            {editorial.creativeHighlights.map((h, i) => (
              <li key={i} className="flex gap-3 text-[13px] leading-relaxed text-[rgba(15,15,15,0.66)]">
                <span className="mt-0.5 shrink-0 text-[10px] text-[rgba(15,15,15,0.28)]">—</span>
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* Voting removed — Play is private; no public gallery participation */}
        {/* Keywords */}
        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1">
          {editorial.keywords.map((k) => (
            <span
              key={k}
              className="text-[10px] uppercase tracking-[0.16em] text-[rgba(15,15,15,0.28)]"
            >
              {k}
            </span>
          ))}
        </div>

        {/* Growth suggestions */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowGrowth((v) => !v)}
            className="text-[11px] text-[rgba(15,15,15,0.33)] transition-colors hover:text-[#0f0f0f]"
          >
            {showGrowth ? T.growth_hide : T.growth_show}
          </button>
          {showGrowth && (
            <div className="mt-5 border-l border-[rgba(15,15,15,0.09)] pl-5">
              <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.28)]">
                {T.growth_label}
              </p>
              <ul className="space-y-3.5">
                {editorial.growthSuggestions.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[12px] leading-relaxed text-[rgba(15,15,15,0.56)]">
                    <span className="mt-0.5 shrink-0 text-[10px] text-[rgba(15,15,15,0.24)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Technical notes */}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className="text-[11px] text-[rgba(15,15,15,0.26)] transition-colors hover:text-[rgba(15,15,15,0.60)]"
          >
            {showNotes ? T.notes_hide : T.notes_show}
          </button>
          {showNotes && (
            <div className="mt-5 border-l border-[rgba(15,15,15,0.09)] pl-5">
              <p className="mb-5 text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.28)]">
                {T.notes_label}
              </p>
              <DimTable scores={scores} dimLabels={T.dim_labels} />
            </div>
          )}
        </div>

      </div>

      {/* Other ranked photos */}
      {rest.length > 0 && (
        <div className="border-t border-[rgba(15,15,15,0.12)] pt-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.36)]">
            {T.ranked_label}
          </p>
          <p className="mb-7 text-[11px] text-[rgba(15,15,15,0.36)]">
            {rest.length === 1
              ? T.ranked_1.replace('{n}', rest.length)
              : T.ranked_n.replace('{n}', rest.length)}
          </p>
          {rest.map((photo, i) => (
            <SupportEntry key={photo.id} photo={photo} isFirst={i === 0} T={T} />
          ))}
        </div>
      )}

    </div>
  )
}

// ─── SupportEntry ─────────────────────────────────────────────────────────────

function SupportEntry({ photo, isFirst, T }) {
  const [showNotes, setShowNotes] = useState(false)
  const { scores, editorial } = photo.analysis
  const entryNum = String(photo.rank).padStart(2, '0')
  const DIMS = ['brightness', 'contrast', 'saturation', 'composition', 'sharpness']

  return (
    <div className={`py-7 ${isFirst ? '' : 'border-t border-[rgba(15,15,15,0.07)]'}`}>
      <div className="flex gap-5 sm:gap-7">

        <span className="w-5 shrink-0 pt-px text-[11px] tabular-nums text-[rgba(15,15,15,0.24)]">
          {entryNum}
        </span>

        <div className="w-14 shrink-0 border border-[rgba(15,15,15,0.10)] sm:w-16">
          <img
            src={photo.preview}
            alt={entryNum}
            className="aspect-[3/4] w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.46)]">
              {editorial.archetype}
            </span>
            <span className="truncate text-[10px] text-[rgba(15,15,15,0.22)]" title={photo.name}>
              {photo.name}
            </span>
          </div>

          <p className="mt-1.5 text-[13px] leading-relaxed text-[rgba(15,15,15,0.66)]">
            {editorial.firstImpression}
          </p>

          <p className="mt-2 text-[10px] text-[rgba(15,15,15,0.26)]">
            {editorial.keywords.slice(0, 3).join(' · ')}
            <span className="mx-2 opacity-40">·</span>
            <span className="tabular-nums">{scores.total} / 100</span>
          </p>

          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className="mt-2.5 text-[11px] text-[rgba(15,15,15,0.28)] transition-colors hover:text-[rgba(15,15,15,0.70)]"
          >
            {showNotes ? T.notes_hide : T.notes_show}
          </button>

          {showNotes && (
            <div className="mt-4 border-l border-[rgba(15,15,15,0.08)] pl-4">
              <div className="space-y-2.5">
                {DIMS.map((dim) => (
                  <div key={dim} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-[10px] text-[rgba(15,15,15,0.36)]">
                      {T.dim_labels[dim]}
                    </span>
                    <div className="relative h-[1px] flex-1 bg-[rgba(15,15,16,0.06)]">
                      <div
                        className="absolute inset-y-0 left-0 h-[1px] bg-[rgba(15,15,15,0.34)]"
                        style={{ width: `${scores[dim].score}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-[10px] tabular-nums text-[rgba(15,15,15,0.24)]">
                      {scores[dim].score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ResultsDashboard({ ranked, portfolio, photos }) {
  const { lang } = useLang()
  const T = translations[lang].dashboard
  const [showFull, setShowFull] = useState(false)

  const displayPhotos = photos?.length ? photos : ranked
  const seriesPreviews = getSeriesPreviews(displayPhotos, ranked)

  useEffect(() => {
    logSeries('ResultsDashboard: props', {
      photosLen:   photos?.length ?? 0,
      rankedLen:   ranked?.length ?? 0,
      previewsLen: seriesPreviews.length,
    })
  }, [photos, ranked, seriesPreviews.length])

  if (!ranked || ranked.length === 0) return null

  return (
    <div>

      {/* ── Always visible: full series + sequence + observation ── */}
      <SummaryView ranked={ranked} portfolio={portfolio} photos={displayPhotos} T={T} lang={lang} />

      {/* ── Expandable full analysis ── */}
      <div className="border-t border-[rgba(15,15,15,0.12)]">
        <button
          type="button"
          onClick={() => setShowFull((v) => !v)}
          className="py-5 text-[11px] text-[rgba(15,15,15,0.40)] transition-colors hover:text-[#0f0f0f]"
        >
          {showFull ? T.ocultar_completo : T.ver_completo}
        </button>

        {showFull && (
          <FullAnalysis ranked={ranked} portfolio={portfolio} T={T} />
        )}
      </div>

      <div className="border-t border-[rgba(15,15,15,0.08)] pt-5 pb-2">
        <p className="text-[11px] text-[rgba(15,15,15,0.22)]">{T.footer}</p>
      </div>

    </div>
  )
}
