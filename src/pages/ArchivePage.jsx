import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import {
  getPublicEntries,
  getCuratorPicks,
  getMostDiscussed,
  getNewest,
  getNoteCount,
  getEntriesByArchetype,
  getEntriesByCategory,
  getArchetypeCounts,
  CATEGORIES,
  CATEGORIES_EN,
  ARCHETYPES_ES,
  ARCHETYPES_EN,
} from '../data/archiveStore'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'

// ─── Post card ─────────────────────────────────────────────────────────────────

function GalleryCard({ entry, T }) {
  const noteCount  = getNoteCount(entry.id)
  const notesLabel = noteCount === 0
    ? T.notes_0
    : noteCount === 1
      ? T.notes_1
      : T.notes_n.replace('{n}', noteCount)

  const caption = entry.caption
    || (entry.observation ? entry.observation.slice(0, 110) + (entry.observation.length > 110 ? '…' : '') : '')

  const creator = entry.creatorName || T.anonymous

  return (
    <Link to={`/archive/${entry.id}`} className="group block">
      <div className="overflow-hidden border border-[rgba(15,15,15,0.10)]">
        <img
          src={entry.photo}
          alt={entry.title || entry.archetype || entry.category}
          className="aspect-[3/4] w-full object-cover transition-opacity duration-300 group-hover:opacity-88"
        />
      </div>

      <div className="mt-3 border-b border-[rgba(15,15,15,0.07)] pb-4">
        {entry.archetype && (
          <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.40)]">
            {entry.archetype}
          </p>
        )}
        {entry.title && (
          <p className="mt-1 truncate text-[13px] text-[#0f0f0f]">{entry.title}</p>
        )}
        {caption && (
          <p className="mt-2 text-[12px] italic leading-relaxed text-[rgba(15,15,15,0.52)]">
            {caption}
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="truncate text-[11px] text-[rgba(15,15,15,0.36)]">{creator}</span>
        <span className={`shrink-0 text-[10px] uppercase tracking-[0.12em] ${
          noteCount > 0 ? 'text-[rgba(15,15,15,0.50)]' : 'text-[rgba(15,15,15,0.22)]'
        }`}>
          {notesLabel}
        </span>
      </div>
    </Link>
  )
}

// ─── Featured / hero card ──────────────────────────────────────────────────────

function FeaturedCard({ entry, T }) {
  const noteCount  = getNoteCount(entry.id)
  const notesLabel = noteCount === 1 ? T.notes_1 : T.notes_n.replace('{n}', noteCount)
  const creator    = entry.creatorName || T.anonymous

  return (
    <Link
      to={`/archive/${entry.id}`}
      className="group grid grid-cols-1 overflow-hidden border border-[rgba(15,15,15,0.10)] sm:grid-cols-[2fr_3fr]"
    >
      <div className="overflow-hidden">
        <img
          src={entry.photo}
          alt={entry.title || entry.archetype || ''}
          className="h-full min-h-[300px] w-full object-cover transition-opacity duration-300 group-hover:opacity-90 sm:min-h-[440px]"
        />
      </div>
      <div className="flex flex-col justify-between p-8 sm:p-10">
        <div>
          {entry.isCurated && (
            <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.30)]">
              {T.curator_badge}
            </p>
          )}
          {entry.archetype && (
            <p className="text-[11px] uppercase tracking-[0.20em] text-[rgba(15,15,15,0.42)]">
              {entry.archetype}
            </p>
          )}
          {entry.title && (
            <h3 className="mt-3 font-display text-2xl font-light text-[#0f0f0f] sm:text-3xl">
              {entry.title}
            </h3>
          )}
          {(entry.caption || entry.observation) && (
            <p className="mt-5 text-[14px] italic leading-[1.9] text-[rgba(15,15,15,0.58)]">
              {entry.caption || entry.observation.slice(0, 200) + (entry.observation.length > 200 ? '…' : '')}
            </p>
          )}
        </div>
        <div className="mt-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] text-[rgba(15,15,15,0.40)]">{creator}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.28)]">
              {entry.category}
            </p>
          </div>
          {noteCount > 0 && (
            <span className="text-[11px] text-[rgba(15,15,15,0.38)]">{notesLabel}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

function GallerySection({ label, children }) {
  return (
    <section className="mt-16">
      <p className="mb-8 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
        {label}
      </p>
      {children}
    </section>
  )
}

// ─── Identity pill ─────────────────────────────────────────────────────────────

function IdentityPill({ name, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-baseline gap-2 border px-4 py-2 text-[11px] tracking-wide transition-colors duration-100 ${
        active
          ? 'border-[#0f0f0f] bg-[rgba(15,15,15,0.04)] text-[#0f0f0f]'
          : 'border-[rgba(15,15,15,0.12)] text-[rgba(15,15,15,0.52)] hover:border-[rgba(15,15,15,0.30)] hover:text-[#0f0f0f]'
      }`}
    >
      {name}
      {count > 0 && (
        <span className="text-[10px] tabular-nums opacity-50">{count}</span>
      )}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ArchivePage() {
  const { lang }   = useLang()
  const T          = translations[lang].gallery
  const categories = lang === 'es' ? CATEGORIES : CATEGORIES_EN
  const archetypes = lang === 'es' ? ARCHETYPES_ES : ARCHETYPES_EN

  const [allEntries,    setAllEntries]    = useState([])
  const [activeFilter,  setActiveFilter]  = useState(null)
  const [activeIdentity, setActiveIdentity] = useState(null)

  useEffect(() => {
    setAllEntries(getPublicEntries())
  }, [])

  // ── Derived data ────────────────────────────────────────────────────────────
  const curatorPicks    = getCuratorPicks(6)
  const featuredStory   = curatorPicks[0] ?? getMostDiscussed(1)[0] ?? getNewest(1)[0]
  const featuredRest    = curatorPicks.slice(1, 4)
  const discussed       = getMostDiscussed(4)
  const newest          = getNewest(9)
  const archetypeCounts = getArchetypeCounts()
  const totalCount      = allEntries.length

  // ── Filtered content ────────────────────────────────────────────────────────
  const isFiltered      = !!activeFilter || !!activeIdentity
  let filteredEntries   = []
  if (activeFilter)   filteredEntries = getEntriesByCategory(activeFilter)
  if (activeIdentity) filteredEntries = getEntriesByArchetype(activeIdentity)

  function clearFilters() {
    setActiveFilter(null)
    setActiveIdentity(null)
  }

  // ── Empty gallery ────────────────────────────────────────────────────────────
  if (totalCount === 0 && !isFiltered) {
    return (
      <Layout>
        <div className="mx-auto max-w-5xl px-6 py-14">
          <GalleryHeader T={T} totalCount={0} />
          <div className="mt-24 max-w-md">
            <p className="font-display text-2xl font-light text-[rgba(15,15,15,0.28)]">
              {T.empty_h2}
            </p>
            <p className="mt-5 text-[14px] leading-[1.8] text-[rgba(15,15,15,0.45)]">
              {T.empty_body}
            </p>
            <Link to="/upload" className="btn-primary mt-8 inline-flex">
              {T.empty_btn}
            </Link>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-6 py-14">

        <GalleryHeader T={T} totalCount={totalCount} />

        {/* ── Category filter row ──────────────────────────────────────────── */}
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5">
          <button
            type="button"
            onClick={clearFilters}
            className={`text-[10px] uppercase tracking-[0.14em] transition-colors ${
              !isFiltered ? 'text-[#0f0f0f]' : 'text-[rgba(15,15,15,0.36)] hover:text-[#0f0f0f]'
            }`}
          >
            {T.filter_discover}
          </button>
          <span className="text-[rgba(15,15,15,0.20)]">·</span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setActiveFilter(cat); setActiveIdentity(null) }}
              className={`text-[10px] uppercase tracking-[0.14em] transition-colors ${
                activeFilter === cat ? 'text-[#0f0f0f]' : 'text-[rgba(15,15,15,0.36)] hover:text-[#0f0f0f]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Filtered view ────────────────────────────────────────────────── */}
        {isFiltered ? (
          <div className="mt-10">
            <p className="mb-8 text-[11px] text-[rgba(15,15,15,0.36)]">
              {filteredEntries.length === 1
                ? T.count_1.replace('{n}', 1)
                : T.count_n.replace('{n}', filteredEntries.length)}
            </p>
            {filteredEntries.length === 0 ? (
              <div className="mt-12 max-w-sm">
                <p className="text-[12px] italic leading-relaxed text-[rgba(15,15,15,0.40)]">
                  {T.empty_filter}
                </p>
                <Link to="/upload" className="btn-ghost mt-6 inline-flex">
                  {T.btn_submit}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 md:grid-cols-3">
                {filteredEntries.map((entry) => (
                  <GalleryCard key={entry.id} entry={entry} T={T} />
                ))}
              </div>
            )}
          </div>

        ) : (
          /* ── Discovery view ────────────────────────────────────────────── */
          <>

            {/* 1. Curator Picks — hero + grid of curated entries */}
            {curatorPicks.length > 0 && (
              <GallerySection label={T.curator_picks}>
                <FeaturedCard entry={curatorPicks[0]} T={T} />
                {curatorPicks.length > 1 && (
                  <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 md:grid-cols-3">
                    {curatorPicks.slice(1, 4).map((entry) => (
                      <GalleryCard key={entry.id} entry={entry} T={T} />
                    ))}
                  </div>
                )}
              </GallerySection>
            )}

            {/* 2. Featured Stories — entries with community notes */}
            {discussed.length > 0 && (
              <GallerySection label={T.featured}>
                <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 md:grid-cols-3">
                  {discussed.map((entry) => (
                    <GalleryCard key={entry.id} entry={entry} T={T} />
                  ))}
                </div>
              </GallerySection>
            )}

            {/* 3. Visual Identities — archetype browser */}
            {Object.keys(archetypeCounts).length > 0 && (
              <GallerySection label={T.identities}>
                <div className="flex flex-wrap gap-2.5">
                  {archetypes
                    .filter((a) =>
                      Object.keys(archetypeCounts).some((key) =>
                        key.toLowerCase().includes(a.toLowerCase().split(' ')[0])
                      )
                    )
                    .map((archetype) => {
                      const count = Object.entries(archetypeCounts).reduce((sum, [key, val]) =>
                        key.toLowerCase().includes(archetype.toLowerCase().split(' ')[0])
                          ? sum + val : sum, 0)
                      return (
                        <IdentityPill
                          key={archetype}
                          name={archetype}
                          count={count}
                          active={activeIdentity === archetype}
                          onClick={() => { setActiveIdentity(archetype); setActiveFilter(null) }}
                        />
                      )
                    })}
                </div>
              </GallerySection>
            )}

            {/* 4. Newest Works */}
            {newest.length > 0 && (
              <GallerySection label={T.newest}>
                <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 md:grid-cols-3">
                  {newest.map((entry) => (
                    <GalleryCard key={entry.id} entry={entry} T={T} />
                  ))}
                </div>
              </GallerySection>
            )}

          </>
        )}

      </div>
    </Layout>
  )
}

// ─── Header sub-component ──────────────────────────────────────────────────────

function GalleryHeader({ T, totalCount }) {
  return (
    <div className="border-b border-[rgba(15,15,15,0.12)] pb-10">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
        {T.label}
      </p>
      <div className="mt-4 flex items-end justify-between gap-6">
        <h1 className="font-display text-4xl font-light leading-tight text-[#0f0f0f]">
          {T.h1}
        </h1>
        <Link to="/upload" className="btn-ghost shrink-0 self-start">
          {T.btn_submit}
        </Link>
      </div>
      <p className="mt-4 max-w-md text-[13px] leading-[1.75] text-[rgba(15,15,15,0.48)]">
        {T.submit_msg}
      </p>
      {totalCount > 0 && (
        <p className="mt-3 text-[10px] text-[rgba(15,15,15,0.26)]">
          {totalCount === 1
            ? T.count_1.replace('{n}', totalCount)
            : T.count_n.replace('{n}', totalCount)}
        </p>
      )}
    </div>
  )
}
