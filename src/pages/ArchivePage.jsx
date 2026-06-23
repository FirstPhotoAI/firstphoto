import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { ARCHIVE } from '../data/archive'

// ─── Entry row ────────────────────────────────────────────────────────────────

function EntryRow({ entry }) {
  return (
    <div className="flex gap-8 border-t border-[rgba(15,15,15,0.07)] py-7">
      <span className="w-8 shrink-0 pt-px text-[11px] tabular-nums text-[rgba(15,15,15,0.26)]">
        {entry.id}
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-snug text-[#0f0f0f]">
          {entry.title}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-[rgba(15,15,15,0.48)]">
          {entry.abstract}
        </p>
      </div>
    </div>
  )
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({ category }) {
  return (
    <section className="mt-16">
      <div className="border-t border-[rgba(15,15,15,0.14)] pt-10">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.36)]">
          Category {category.number}
        </p>
        <h2 className="mt-3 font-display text-3xl font-light text-[#0f0f0f]">
          {category.title}
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[rgba(15,15,15,0.50)]">
          {category.description}
        </p>
      </div>

      <div className="mt-8">
        {category.entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArchivePage() {
  const totalEntries = ARCHIVE.categories.reduce(
    (sum, cat) => sum + cat.entries.length,
    0
  )

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-6 py-14">

        {/* ── Volume header ─────────────────────────────────────────────── */}
        <div className="border-b border-[rgba(15,15,15,0.12)] pb-12">

          <div className="flex items-start justify-between gap-6">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.36)]">
              Archive · Volume {ARCHIVE.volume}
            </p>
            <Link to="/upload" className="btn-ghost shrink-0">
              Submit a photograph
            </Link>
          </div>

          <h1 className="mt-7 font-display text-4xl font-light leading-tight text-[#0f0f0f] sm:text-5xl">
            {ARCHIVE.title}
          </h1>
          <p className="mt-1 font-display text-2xl font-light italic text-[rgba(15,15,15,0.45)] sm:text-3xl">
            {ARCHIVE.subtitle}
          </p>

          <p className="mt-8 max-w-lg text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
            {ARCHIVE.description}
          </p>

          <div className="mt-8 flex gap-8 text-[11px] text-[rgba(15,15,15,0.35)]">
            <span>{ARCHIVE.categories.length} categories</span>
            <span>{totalEntries} entries</span>
            <span>Ongoing</span>
          </div>
        </div>

        {/* ── Category sections ─────────────────────────────────────────── */}
        {ARCHIVE.categories.map((category) => (
          <CategorySection key={category.number} category={category} />
        ))}

        {/* ── Archive footer ────────────────────────────────────────────── */}
        <div className="mt-20 border-t border-[rgba(15,15,15,0.08)] pt-8 text-[11px] text-[rgba(15,15,15,0.28)]">
          <p>FirstPhoto Research Archive · Volume I · Ongoing</p>
          <p className="mt-1.5">
            Observations are generated through Canvas API pixel analysis.
            Community impressions are recorded in the local browser.
            No data is transmitted to any server.
          </p>
          <p className="mt-5">
            <Link
              to="/upload"
              className="text-[rgba(15,15,15,0.45)] underline underline-offset-2 transition-colors hover:text-[#0f0f0f]"
            >
              Submit photographs for observation →
            </Link>
          </p>
        </div>

      </div>
    </Layout>
  )
}
