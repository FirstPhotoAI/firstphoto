import { useState } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const DIM_LABELS = {
  brightness:  'Exposure',
  contrast:    'Contrast',
  saturation:  'Color Balance',
  composition: 'Composition',
  sharpness:   'Sharpness',
}

const DIMS = ['brightness', 'contrast', 'saturation', 'composition', 'sharpness']

const REACTIONS = ['approachable', 'neutral', 'distant']

// ─── Vote helpers (localStorage) — unchanged ──────────────────────────────────

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
    const all = JSON.parse(localStorage.getItem('firstphoto_votes') || '{}')
    const current = all[photoId] || { approachable: 0, neutral: 0, distant: 0, myVote: null }

    if (current.myVote === reaction) {
      current[reaction] = Math.max(0, current[reaction] - 1)
      current.myVote = null
    } else {
      if (current.myVote) {
        current[current.myVote] = Math.max(0, current[current.myVote] - 1)
      }
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

// ─── strongestWeakest — unchanged ─────────────────────────────────────────────

function strongestWeakest(scores) {
  const sorted = [...DIMS].sort((a, b) => scores[b].score - scores[a].score)
  return { strongest: sorted[0], weakest: sorted[sorted.length - 1] }
}

// ─── useThisWhen — derive actionable placement guidance from analysis ──────────

function useThisWhen(scores) {
  const total = scores.total

  if (total >= 78) {
    return 'Use as your lead image on any platform. This photograph holds across thumbnail sizes and full-scale displays without adjustments.'
  }

  const { strongest } = strongestWeakest(scores)

  const guidance = {
    composition: 'Use for professional and intentional contexts — profiles, speaker bios, portfolio headers. Intentional framing signals purpose.',
    brightness:  'Use wherever consistent visibility matters. Balanced exposure reproduces reliably across different screens and ambient light conditions.',
    contrast:    'Use in thumbnail-heavy contexts — directories, apps, social headers. Strong tonal definition holds at small display sizes.',
    saturation:  'Use for social and approachability-forward contexts — community pages, event listings, any setting where warmth reads first.',
    sharpness:   'Use wherever images are displayed at large scale — cover photos, banners, any context where the image will be enlarged.',
  }

  return guidance[strongest] ?? 'Place second or third in a photo sequence. Best used to reinforce the impression set by a stronger lead.'
}

// ─── VotingPanel ──────────────────────────────────────────────────────────────

function VotingPanel({ photoId, label = 'Community Impression' }) {
  const [votes, setVotes] = useState(() => getVotes(photoId))

  function handleVote(reaction) {
    const updated = saveVote(photoId, reaction)
    setVotes(updated)
  }

  const total = REACTIONS.reduce((sum, r) => sum + votes[r], 0)

  return (
    <div>
      <p className="mb-3 text-[10px] uppercase tracking-[0.20em] text-[rgba(15,15,15,0.36)]">
        {label}
      </p>
      <div className="flex gap-2">
        {REACTIONS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => handleVote(r)}
            className={`flex-1 border py-2 text-[11px] capitalize tracking-wide transition-colors duration-100 ${
              votes.myVote === r
                ? 'border-[#0f0f0f] bg-[rgba(15,15,15,0.04)] text-[#0f0f0f]'
                : 'border-[rgba(15,15,15,0.14)] text-[rgba(15,15,15,0.48)] hover:border-[rgba(15,15,15,0.35)] hover:text-[#0f0f0f]'
            }`}
          >
            {r}
            {votes[r] > 0 && (
              <span className="ml-1 text-[rgba(15,15,15,0.35)]">{votes[r]}</span>
            )}
          </button>
        ))}
      </div>
      {total > 0 && (
        <p className="mt-2 text-[11px] text-[rgba(15,15,15,0.30)]">
          {total} {total === 1 ? 'impression' : 'impressions'} on record
        </p>
      )}
    </div>
  )
}

// ─── DimTable — shared collapsed technical notes table ────────────────────────

function DimTable({ scores }) {
  return (
    <div className="space-y-3.5">
      {DIMS.map((dim) => (
        <div key={dim}>
          <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-[10px] text-[rgba(15,15,15,0.40)]">
              {DIM_LABELS[dim]}
            </span>
            <div className="relative h-[1px] flex-1 bg-[rgba(15,15,15,0.07)]">
              <div
                className="absolute inset-y-0 left-0 h-[1px] bg-[rgba(15,15,15,0.38)] transition-all duration-500"
                style={{ width: `${scores[dim].score}%` }}
              />
            </div>
            {/* Score as dim metadata — no visual emphasis */}
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

// ─── LeadEntry — magazine critique for the top-ranked photograph ──────────────

function LeadEntry({ photo }) {
  const [showNotes, setShowNotes] = useState(false)
  const { scores, overall } = photo.analysis
  const when = useThisWhen(scores)

  return (
    <section className="py-12">

      {/* Section label */}
      <p className="mb-8 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.36)]">
        Recommended First Photograph
      </p>

      {/* Figure + editorial critique — two columns */}
      <div className="flex gap-10 sm:gap-14">

        {/* Figure — larger than supporting entries */}
        <div className="shrink-0">
          <div className="w-36 border border-[rgba(15,15,15,0.12)] sm:w-44">
            <img
              src={photo.preview}
              alt="Recommended first photograph"
              className="aspect-[3/4] w-full object-cover"
            />
          </div>
          {/* Score: small metadata, not a headline */}
          <p className="mt-2 text-center text-[10px] tabular-nums text-[rgba(15,15,15,0.22)]">
            {scores.total} / 100
          </p>
        </div>

        {/* Critique prose */}
        <div className="min-w-0 flex-1 space-y-7">

          {/* Primary Observation */}
          <div>
            <p className="mb-2.5 text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.34)]">
              Primary Observation
            </p>
            <p className="text-[15px] leading-[1.9] text-[rgba(15,15,15,0.80)]">
              {overall}
            </p>
          </div>

          {/* Use This When */}
          <div>
            <p className="mb-2.5 text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.34)]">
              Use This When
            </p>
            <p className="text-sm leading-relaxed text-[rgba(15,15,15,0.60)]">
              {when}
            </p>
          </div>

        </div>
      </div>

      {/* First Impression — full width below figure */}
      <div className="mt-9 border-t border-[rgba(15,15,15,0.08)] pt-8">
        <VotingPanel photoId={photo.id} label="First Impression" />
      </div>

      {/* Study Notes — collapsed by default */}
      <div className="mt-7">
        <button
          type="button"
          onClick={() => setShowNotes((v) => !v)}
          className="text-[11px] text-[rgba(15,15,15,0.33)] transition-colors hover:text-[#0f0f0f]"
        >
          {showNotes ? 'Hide technical notes ↑' : 'Read technical notes ↓'}
        </button>

        {showNotes && (
          <div className="mt-5 border-l border-[rgba(15,15,15,0.09)] pl-5">
            <p className="mb-5 text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.28)]">
              Study Notes
            </p>
            <DimTable scores={scores} />
          </div>
        )}
      </div>

    </section>
  )
}

// ─── SupportEntry — compact ranked row for photographs 2 and below ────────────

function SupportEntry({ photo, isFirst }) {
  const [showNotes, setShowNotes] = useState(false)
  const { scores, overall } = photo.analysis
  const { strongest, weakest } = strongestWeakest(scores)
  const entryNum = String(photo.rank).padStart(2, '0')

  return (
    <div className={`py-7 ${isFirst ? '' : 'border-t border-[rgba(15,15,15,0.07)]'}`}>
      <div className="flex gap-5 sm:gap-7">

        {/* Rank numeral */}
        <span className="w-5 shrink-0 pt-px text-[11px] tabular-nums text-[rgba(15,15,15,0.24)]">
          {entryNum}
        </span>

        {/* Thumbnail */}
        <div className="w-14 shrink-0 border border-[rgba(15,15,15,0.10)] sm:w-16">
          <img
            src={photo.preview}
            alt={`Entry ${entryNum}`}
            className="aspect-[3/4] w-full object-cover"
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">

          <p
            className="truncate text-[10px] text-[rgba(15,15,15,0.28)]"
            title={photo.name}
          >
            {photo.name}
          </p>

          {/* Observation — leads, not the score */}
          <p className="mt-1.5 text-[13px] leading-relaxed text-[rgba(15,15,15,0.66)]">
            {overall}
          </p>

          {/* Score + strongest/weakest as small metadata */}
          <p className="mt-2.5 text-[10px] text-[rgba(15,15,15,0.28)]">
            {DIM_LABELS[strongest]} strongest
            <span className="mx-2 opacity-40">·</span>
            {DIM_LABELS[weakest]} weakest
            <span className="mx-2 opacity-40">·</span>
            <span className="tabular-nums">{scores.total} / 100</span>
          </p>

          {/* Technical notes — collapsed */}
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className="mt-2.5 text-[11px] text-[rgba(15,15,15,0.30)] transition-colors hover:text-[rgba(15,15,15,0.70)]"
          >
            {showNotes ? 'Hide technical notes ↑' : 'Read technical notes ↓'}
          </button>

          {showNotes && (
            <div className="mt-4 border-l border-[rgba(15,15,15,0.08)] pl-4">
              <div className="space-y-2.5">
                {DIMS.map((dim) => (
                  <div key={dim} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-[10px] text-[rgba(15,15,15,0.36)]">
                      {DIM_LABELS[dim]}
                    </span>
                    <div className="relative h-[1px] flex-1 bg-[rgba(15,15,15,0.06)]">
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

export default function ResultsDashboard({ ranked }) {
  if (!ranked || ranked.length === 0) return null

  const [top, ...rest] = ranked

  return (
    <div>

      {/* Rank 1 — magazine critique */}
      <LeadEntry photo={top} />

      {/* Ranks 2+ — compact ranked order */}
      {rest.length > 0 && (
        <div className="border-t border-[rgba(15,15,15,0.12)] pt-10">
          <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.36)]">
            Ranked Order
          </p>
          <p className="mb-8 text-[11px] text-[rgba(15,15,15,0.36)]">
            {rest.length} {rest.length === 1 ? 'additional photograph' : 'additional photographs'} in descending order.
          </p>

          {rest.map((photo, i) => (
            <SupportEntry key={photo.id} photo={photo} isFirst={i === 0} />
          ))}
        </div>
      )}

      <div className="mt-10 border-t border-[rgba(15,15,15,0.08)] pt-5">
        <p className="text-[11px] text-[rgba(15,15,15,0.22)]">
          Canvas API · Local analysis · No data transmitted
        </p>
      </div>

    </div>
  )
}
