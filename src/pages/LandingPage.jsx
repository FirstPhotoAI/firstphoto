import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import {
  getCuratorPicks,
  getPublicEntries,
  getArchetypeCounts,
  getCountryCounts,
  getHomepageRecentWorks,
} from '../data/archiveStore'
import { IDENTITIES } from '../data/identities'

// ─── Plans table ──────────────────────────────────────────────────────────────

const PLAN_KEYS = [
  [true,  true,  true ],
  [true,  true,  true ],
  [true,  true,  true ],
  [false, true,  true ],
  [false, true,  true ],
  [false, true,  true ],
  [false, true,  true ],
  [false, false, true ],
  [false, false, true ],
  [false, false, true ],
  [false, false, true ],
  [false, false, true ],
]

function Cell({ yes }) {
  return yes
    ? <span className="text-[rgba(15,15,15,0.62)]">✓</span>
    : <span className="text-[rgba(15,15,15,0.18)]">–</span>
}

// ─── Identity tile (larger, gallery-catalog feel) ─────────────────────────────

const FEATURED_SLUGS = [
  'cinematic-observer',
  'visual-poet',
  'independent-spirit',
  'silent-leader',
]

function IdentityTile({ identity, lang, index }) {
  const name = identity.names[lang] ?? identity.names.en
  const desc = identity.descriptions[lang] ?? identity.descriptions.en
  return (
    <Link
      to={`/identities/${identity.slug}`}
      className="group block border border-[rgba(15,15,15,0.10)] p-5 transition-colors hover:border-[rgba(15,15,15,0.30)] md:p-7"
    >
      <p className="font-display text-5xl font-light leading-none text-[rgba(15,15,15,0.07)]">
        {String(index + 1).padStart(2, '0')}
      </p>
      <div className="mt-6">
        <p className="text-[9px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.36)]">
          {name}
        </p>
        <p className="mt-3 text-[12px] leading-relaxed text-[rgba(15,15,15,0.52)] line-clamp-3">
          {desc}
        </p>
      </div>
    </Link>
  )
}

// ─── Known hero image (no loading flash) ──────────────────────────────────────

const HERO_IMAGE = '/gallery-seed/founder-cinematic-carousel.jpg'

// ─── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { lang } = useLang()
  const T = translations[lang].landing

  const [featuredEntry,  setFeaturedEntry]  = useState(null)
  const [archiveStats,   setArchiveStats]   = useState({ works: 0, identities: 0, countries: 0 })
  const [recentEntries,  setRecentEntries]  = useState([])

  useEffect(() => {
    setFeaturedEntry(getCuratorPicks(1)[0] ?? null)

    const entries         = getPublicEntries()
    const archetypeCounts = getArchetypeCounts()
    const countryCounts   = getCountryCounts()
    setArchiveStats({
      works:      entries.length,
      identities: Object.keys(archetypeCounts).length,
      countries:  Object.keys(countryCounts).length,
    })

    setRecentEntries(getHomepageRecentWorks(12))
  }, [])

  const featuredIdentities = IDENTITIES.filter((id) =>
    FEATURED_SLUGS.includes(id.slug)
  )

  return (
    <Layout>

      {/* ── 1. Hero statement ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pt-7 pb-6 md:pt-14 md:pb-10">
        <p className="text-[9px] uppercase tracking-[0.20em] text-[rgba(15,15,15,0.34)]">
          FirstPhoto — {T.site_label}
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-2xl font-light leading-snug text-[#0f0f0f] sm:text-3xl md:text-[2.6rem]">
          {T.hero_h1}
        </h1>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      {/* ── 2. Recent works — community first, 2× mobile / 4× desktop ─────────── */}
      <section className="mx-auto max-w-5xl px-6 py-8 md:py-12">

        <div className="mb-6 flex items-end justify-between">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
            {T.recent_label}
          </p>
          <Link
            to="/archive"
            className="text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.40)] transition-colors hover:text-[#0f0f0f]"
          >
            {T.preview_cta} →
          </Link>
        </div>

        {recentEntries.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
            {recentEntries.map((entry) => (
              <Link key={entry.id} to={`/archive/${entry.id}`} className="group block">
                <div className="overflow-hidden border border-[rgba(15,15,15,0.10)]">
                  <img
                    src={entry.photo}
                    alt={entry.archetype || entry.category}
                    className="aspect-[3/4] w-full object-cover transition-opacity duration-300 group-hover:opacity-80"
                  />
                </div>
                {entry.archetype && (
                  <p className="mt-1.5 truncate text-[9px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.38)]">
                    {entry.archetype}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Archive stats — proof the collection is growing */}
        <div className="mt-8 grid grid-cols-3 gap-4 border-t border-[rgba(15,15,15,0.10)] pt-8 md:mt-10 md:gap-6">
          {[
            { value: archiveStats.works,      label: T.stat_works },
            { value: archiveStats.identities, label: T.stat_identities },
            { value: archiveStats.countries,  label: T.stat_countries },
          ].map(({ value, label }) => (
            <div key={label}>
              <p className="font-display text-3xl font-light text-[#0f0f0f] md:text-5xl">
                {value}
              </p>
              <p className="mt-1.5 text-[9px] uppercase tracking-[0.16em] text-[rgba(15,15,15,0.40)]">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Participate — early, clear upload path */}
        <div className="mt-10 border-t border-[rgba(15,15,15,0.10)] pt-8">
          <p className="font-display text-lg font-light text-[#0f0f0f] md:text-xl">
            {T.participate_prompt}
          </p>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
            {T.participate_body}
          </p>
          <div className="mt-5">
            <Link to="/upload" className="btn-primary">{T.participate_btn}</Link>
          </div>
        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      {/* ── 3. Visual Identities ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div className="mb-8 flex items-end justify-between md:mb-10">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
            {T.identities_label}
          </p>
          <Link
            to="/identities"
            className="text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.40)] transition-colors hover:text-[#0f0f0f]"
          >
            {T.identities_cta} →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featuredIdentities.map((identity, i) => (
            <IdentityTile key={identity.slug} identity={identity} lang={lang} index={i} />
          ))}
        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      {/* ── 4. Featured story — smaller image, supports the narrative ─────────── */}
      <section className="mx-auto max-w-5xl px-6 py-10 md:py-12">

        <p className="mb-6 text-[9px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
          {T.featured_identity}
        </p>

        <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-10 lg:gap-12">

          {/* Editorial text — left on desktop */}
          <div className="md:flex-1 md:py-1">
            <p className="font-display text-xl font-light text-[#0f0f0f] md:text-2xl">
              {featuredEntry?.archetype ?? '\u00A0'}
            </p>
            {featuredEntry?.caption && (
              <p className="mt-3 text-sm leading-relaxed text-[rgba(15,15,15,0.55)]">
                {featuredEntry.caption}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              {featuredEntry && (
                <Link to={`/archive/${featuredEntry.id}`} className="btn-primary">
                  {T.featured_view}
                </Link>
              )}
              <Link to="/archive" className="btn-ghost">{T.preview_cta}</Link>
            </div>
          </div>

          {/* Photograph — constrained, ~40% shorter than previous hero treatment */}
          <div
            className="w-full shrink-0 md:w-[42%]"
            style={{ maxWidth: '480px' }}
          >
            <div className="overflow-hidden border border-[rgba(15,15,15,0.10)]">
              <img
                src={featuredEntry?.photo ?? HERO_IMAGE}
                alt={featuredEntry?.archetype ?? 'Featured photograph'}
                className="block w-full object-cover"
                style={{
                  aspectRatio: '4 / 3',
                  maxHeight: '31vh',
                  objectPosition: 'center 30%',
                }}
              />
            </div>
          </div>

        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      {/* ── 5. Creator Edition ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <div className="flex items-center gap-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
            {T.creator_label}
          </p>
          <span className="border border-[rgba(15,15,15,0.18)] px-2.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.38)]">
            {T.creator_soon}
          </span>
        </div>

        <h2 className="mt-8 max-w-2xl font-display text-3xl font-light leading-snug text-[#0f0f0f] sm:text-[2.5rem]">
          {T.creator_h2}
        </h2>

        <div className="mt-12 border-t border-[rgba(15,15,15,0.10)] pt-10">
          <div className="grid gap-x-16 sm:grid-cols-2">
            {T.creator_features.map((feature, i) => (
              <div
                key={i}
                className="flex items-baseline gap-3 border-b border-[rgba(15,15,15,0.06)] py-4"
              >
                <span className="shrink-0 font-display text-xs text-[rgba(15,15,15,0.20)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-sm text-[rgba(15,15,15,0.60)]">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 max-w-md text-sm italic leading-relaxed text-[rgba(15,15,15,0.38)]">
          {T.creator_description}
        </p>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      {/* ── 6. Join the Archive ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-14 md:py-16">
        <p className="mb-5 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
          {T.share_label}
        </p>
        <h2 className="font-display text-3xl font-light text-[#0f0f0f] sm:text-4xl">
          {T.share_h2}
        </h2>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
          {T.share_description}
        </p>
        <div className="mt-8">
          <Link to="/upload" className="btn-primary">{T.participate_btn}</Link>
        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      {/* ── Plans table ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-14 md:py-16">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
          {T.plans_label}
        </p>
        <h2 className="mt-5 font-display text-3xl font-light text-[#0f0f0f] sm:text-4xl">
          {T.plans_h2}
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
          {T.plans_description}
        </p>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-[rgba(15,15,15,0.14)]">
                <th className="pb-4 pr-6 text-left text-[10px] font-normal uppercase tracking-[0.16em] text-[rgba(15,15,15,0.38)]">
                  {T.plans_col_feature}
                </th>
                {[
                  { name: T.plans_col_free,    sub: T.plans_col_free_sub,    op: '0.55' },
                  { name: T.plans_col_pro,     sub: T.plans_col_pro_sub,     op: '0.70' },
                  { name: T.plans_col_creator, sub: T.plans_col_creator_sub, op: '0.80' },
                ].map(({ name, sub, op }) => (
                  <th key={name} className="w-24 pb-4 text-center text-[11px] font-normal sm:w-28"
                      style={{ color: `rgba(15,15,15,${op})` }}>
                    {name}
                    <span className="mt-0.5 block text-[9px] text-[rgba(15,15,15,0.28)]">{sub}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {T.plans_rows.map((label, i) => (
                <tr
                  key={i}
                  className={`border-b border-[rgba(15,15,15,0.06)] ${i === 2 ? 'border-b-[rgba(15,15,15,0.14)]' : ''}`}
                >
                  <td className="py-3 pr-6 text-[13px] text-[rgba(15,15,15,0.62)]">{label}</td>
                  <td className="py-3 text-center text-[13px]"><Cell yes={PLAN_KEYS[i][0]} /></td>
                  <td className="py-3 text-center text-[13px]"><Cell yes={PLAN_KEYS[i][1]} /></td>
                  <td className="py-3 text-center text-[13px]"><Cell yes={PLAN_KEYS[i][2]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 border-l border-[rgba(15,15,15,0.12)] pl-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.38)]">
            {T.plans_creator_label}
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
            {T.plans_creator_body}
          </p>
        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <p
            style={{
              fontWeight: 500,
              textTransform: 'uppercase',
              fontSize: '9px',
              letterSpacing: '0.22em',
              color: 'rgba(15,15,15,0.30)',
            }}
          >
            FirstPhoto
          </p>
          <p className="text-[10px] text-[rgba(15,15,15,0.30)]">{T.footer}</p>
        </div>
      </div>

    </Layout>
  )
}
