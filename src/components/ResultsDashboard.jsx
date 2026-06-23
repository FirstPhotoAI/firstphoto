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

// ─── Vote helpers (localStorage) — logic unchanged ────────────────────────────

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

// ─── strongestWeakest — logic unchanged ───────────────────────────────────────

function strongestWeakest(scores) {
  const sorted = [...DIMS].sort((a, b) => scores[b].score - scores[a].score)
  return { strongest: sorted[0], weakest: sorted[sorted.length - 1] }
}

// ─── VotingPanel ──────────────────────────────────────────────────────────────

function VotingPanel({ photoId }) {
  const [votes, setVotes] = useState(() => getVotes(photoId))

  function handleVote(reaction) {
    const updated = saveVote(photoId, reaction)
    setVotes(updated)
  }

  const total = REACTIONS.reduce((sum, r) => sum + votes[r], 0)

  return (
    <div className="pt-5">
      <p className="mb-3 text-[10px] uppercase tracking-[0.20em] text-[rgba(15,15,15,0.38)]">
        Community Impression
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
        <p className="mt-2 text-[11px] text-[rgba(15,15,15,0.32)]">
          {total} {total === 1 ? 'impression' : 'impressions'} on record
        </p>
      )}
    </div>
  )
}

// ─── PhotoEntry ───────────────────────────────────────────────────────────────

function PhotoEntry({ photo, isTop, isFirst }) {
  const [showNotes, setShowNotes] = useState(isTop)
  const { scores, overall } = photo.analysis
  const { strongest, weakest } = strongestWeakest(scores)
  const entryNum = String(photo.rank).padStart(2, '0')

  return (
    <section className={`py-10 ${isFirst ? '' : 'border-t border-[rgba(15,15,15,0.10)]'}`}>

      {/* Entry metadata row */}
      <div className="mb-7 flex items-baseline justify-between gap-4">
        <p className="text-[10px] uppercase tracking-[0.20em] text-[rgba(15,15,15,0.38)]">
          Entry {entryNum}{isTop ? ' · Lead study' : ''}
        </p>
        <p className="truncate text-[10px] text-[rgba(15,15,15,0.25)]" title={photo.name}>
          {photo.name}
        </p>
      </div>

      {/* Figure + observation — two columns on sm+ */}
      <div className="flex gap-8 sm:gap-12">

        {/* Figure */}
        <div className="shrink-0">
          <div className="w-24 border border-[rgba(15,15,15,0.12)] sm:w-32">
            <img
              src={photo.preview}
              alt={`Entry ${entryNum}`}
              className="aspect-[3/4] w-full object-cover"
            />
          </div>
          <p className="mt-2 text-center text-[10px] tabular-nums text-[rgba(15,15,15,0.32)]">
            {scores.total} / 100
          </p>
        </div>

        {/* Observation block */}
        <div className="min-w-0 flex-1">

          {/* Primary observation — this is the lead content */}
          <p className="text-sm leading-[1.75] text-[rgba(15,15,15,0.82)]">
            {overall}
          </p>

          {/* Strongest / weakest — plain text, no badges */}
          <p className="mt-3 text-[11px] text-[rgba(15,15,15,0.42)]">
            Strongest: {DIM_LABELS[strongest]} &nbsp;·&nbsp; Weakest: {DIM_LABELS[weakest]}
          </p>

          {/* Compact dimension data table */}
          <div className="mt-5 space-y-2.5">
            {DIMS.map((dim) => (
              <div key={dim} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-[10px] text-[rgba(15,15,15,0.42)]">
                  {DIM_LABELS[dim]}
                </span>
                <div className="relative flex-1 h-[1px] bg-[rgba(15,15,15,0.08)]">
                  <div
                    className="absolute inset-y-0 left-0 h-[1px] bg-[rgba(15,15,15,0.45)] transition-all duration-500"
                    style={{ width: `${scores[dim].score}%` }}
                  />
                </div>
                <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-[rgba(15,15,15,0.35)]">
                  {scores[dim].score}
                </span>
              </div>
            ))}
          </div>

          {/* Toggle: per-dimension observation notes */}
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className="mt-4 text-[11px] text-[rgba(15,15,15,0.35)] transition-colors hover:text-[#0f0f0f]"
          >
            {showNotes ? 'Hide notes ↑' : 'Read dimension notes ↓'}
          </button>

          {/* Dimension notes — expanded */}
          {showNotes && (
            <div className="mt-4 space-y-4 border-l border-[rgba(15,15,15,0.10)] pl-4">
              {DIMS.map((dim) => (
                <div key={dim}>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.38)]">
                    {DIM_LABELS[dim]}
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[rgba(15,15,15,0.55)]">
                    {scores[dim].observation}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Voting */}
          <VotingPanel photoId={photo.id} />

        </div>
      </div>
    </section>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ResultsDashboard({ ranked }) {
  if (!ranked || ranked.length === 0) return null

  return (
    <div>
      {ranked.map((photo) => (
        <PhotoEntry
          key={photo.id}
          photo={photo}
          isTop={photo.rank === 1}
          isFirst={photo.rank === 1}
        />
      ))}

      <div className="border-t border-[rgba(15,15,15,0.08)] pt-5">
        <p className="text-[11px] text-[rgba(15,15,15,0.25)]">
          Canvas API · Local analysis · No data transmitted
        </p>
      </div>
    </div>
  )
}
