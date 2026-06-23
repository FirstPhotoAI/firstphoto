import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import FirstPhotoLogo from '../components/FirstPhotoLogo'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import { getCuratorPicks, getNewest } from '../data/archiveStore'

// ─── Plan table helpers ────────────────────────────────────────────────────────

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

// ─── Gallery preview card ──────────────────────────────────────────────────────

function PreviewCard({ entry }) {
  return (
    <Link
      to={`/archive/${entry.id}`}
      className="group block overflow-hidden border border-[rgba(15,15,15,0.10)] transition-colors hover:border-[rgba(15,15,15,0.26)]"
    >
      <div className="aspect-[3/4] overflow-hidden bg-[rgba(15,15,15,0.04)]">
        <img
          src={entry.photo}
          alt={entry.title || entry.archetype}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      {(entry.archetype || entry.caption) && (
        <div className="p-3">
          {entry.archetype && (
            <p className="text-[9px] uppercase tracking-[0.16em] text-[rgba(15,15,15,0.40)]">
              {entry.archetype}
            </p>
          )}
          {entry.caption && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-[rgba(15,15,15,0.52)]">
              {entry.caption}
            </p>
          )}
        </div>
      )}
    </Link>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { lang } = useLang()
  const T = translations[lang].landing

  const [featuredEntry,   setFeaturedEntry]   = useState(null)
  const [previewEntries,  setPreviewEntries]  = useState([])

  useEffect(() => {
    const picks = getCuratorPicks(1)
    setFeaturedEntry(picks[0] ?? null)
    setPreviewEntries(getNewest(6))
  }, [])

  return (
    <Layout>

      {/* ── 1. Hero ───────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-24 md:pt-32">

        <FirstPhotoLogo size="large" showText className="text-[#0f0f0f]" />

        <p className="mt-4 text-[9px] italic text-[rgba(15,15,15,0.42)]">
          {T.tagline}
        </p>

        <h1 className="mt-10 font-display text-5xl font-light leading-[1.1] tracking-tight text-[#0f0f0f] md:text-[4.5rem]">
          {T.h1_1}<br />{T.h1_2}
        </h1>

        <p className="mt-7 max-w-sm text-sm leading-relaxed text-[rgba(15,15,15,0.55)]">
          {T.description}
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/upload"  className="btn-primary">{T.cta_study}</Link>
          <Link to="/archive" className="btn-ghost">{T.cta_archive}</Link>
        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.12)]" />

      {/* ── 2. Featured Story ─────────────────────────────────────────────────── */}
      {featuredEntry && (
        <>
          <section className="mx-auto max-w-5xl px-6 py-16">
            <p className="mb-10 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
              {T.featured_label}
            </p>

            <div className="grid gap-10 md:grid-cols-[3fr_2fr] md:items-start">
              {/* Image */}
              <Link
                to={`/archive/${featuredEntry.id}`}
                className="group block overflow-hidden border border-[rgba(15,15,15,0.10)] transition-colors hover:border-[rgba(15,15,15,0.26)]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[rgba(15,15,15,0.04)] md:aspect-[3/2]">
                  <img
                    src={featuredEntry.photo}
                    alt={featuredEntry.archetype}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                </div>
              </Link>

              {/* Meta */}
              <div className="flex flex-col justify-start pt-1">
                <p className="text-[9px] uppercase tracking-[0.20em] text-[rgba(15,15,15,0.36)]">
                  {T.featured_identity}
                </p>
                <p className="mt-3 font-display text-2xl font-light text-[#0f0f0f]">
                  {featuredEntry.archetype}
                </p>

                {featuredEntry.caption && (
                  <p className="mt-5 text-sm leading-relaxed text-[rgba(15,15,15,0.55)]">
                    {featuredEntry.caption}
                  </p>
                )}

                {featuredEntry.creatorName && (
                  <p className="mt-6 text-[10px] uppercase tracking-[0.16em] text-[rgba(15,15,15,0.32)]">
                    {featuredEntry.creatorName}
                  </p>
                )}

                <Link
                  to={`/archive/${featuredEntry.id}`}
                  className="mt-8 self-start text-[11px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.52)] hover:text-[#0f0f0f]"
                >
                  {T.featured_view}
                </Link>
              </div>
            </div>
          </section>

          <div className="border-t border-[rgba(15,15,15,0.12)]" />
        </>
      )}

      {/* ── 3. Community Gallery Preview ──────────────────────────────────────── */}
      {previewEntries.length > 0 && (
        <>
          <section className="mx-auto max-w-5xl px-6 py-16">
            <div className="mb-3 flex items-end justify-between">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
                {T.preview_label}
              </p>
              <Link
                to="/archive"
                className="text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.40)] hover:text-[#0f0f0f]"
              >
                {T.preview_cta} →
              </Link>
            </div>

            <p className="mb-10 max-w-lg text-sm leading-relaxed text-[rgba(15,15,15,0.50)]">
              {T.preview_subcopy}
            </p>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {previewEntries.map((entry) => (
                <PreviewCard key={entry.id} entry={entry} />
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Link to="/archive" className="btn-primary">{T.preview_cta}</Link>
            </div>
          </section>

          <div className="border-t border-[rgba(15,15,15,0.12)]" />
        </>
      )}

      {/* ── 4. Submit section ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="mb-5 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
          {T.share_label}
        </p>
        <h2 className="font-display text-3xl font-light text-[#0f0f0f] sm:text-4xl">
          {T.share_h2}
        </h2>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
          {T.share_description}
        </p>
        <div className="mt-10">
          <Link to="/upload" className="btn-primary">{T.cta_study}</Link>
        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.12)]" />

      {/* ── 5. Visual Archive feature callout ─────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
          {T.archive_label}
        </p>
        <h2 className="mt-5 font-display text-3xl font-light text-[#0f0f0f] sm:text-4xl">
          {T.archive_h2}
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
          {T.archive_description}
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {T.archive_features.map((item) => (
            <div key={item.label} className="border-t border-[rgba(15,15,15,0.10)] pt-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.38)]">
                {item.label}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Link to="/archive" className="btn-primary">{T.archive_cta}</Link>
        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.12)]" />

      {/* ── 6. Creator Edition teaser ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">

        {/* Label row */}
        <div className="flex items-center gap-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
            {T.creator_label}
          </p>
          <span className="border border-[rgba(15,15,15,0.18)] px-2.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.38)]">
            {T.creator_soon}
          </span>
        </div>

        {/* Headline */}
        <h2 className="mt-8 max-w-2xl font-display text-3xl font-light leading-snug text-[#0f0f0f] sm:text-4xl">
          {T.creator_h2}
        </h2>

        <div className="mt-12 border-t border-[rgba(15,15,15,0.10)] pt-10">
          <div className="grid gap-x-16 gap-y-0 sm:grid-cols-2">
            {T.creator_features.map((feature, i) => (
              <div
                key={i}
                className="flex items-baseline gap-3 border-b border-[rgba(15,15,15,0.06)] py-4"
              >
                <span className="shrink-0 font-display text-xs text-[rgba(15,15,15,0.22)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-sm text-[rgba(15,15,15,0.62)]">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Description */}
        <p className="mt-10 max-w-md text-sm italic leading-relaxed text-[rgba(15,15,15,0.40)]">
          {T.creator_description}
        </p>

      </section>

      <div className="border-t border-[rgba(15,15,15,0.12)]" />

      {/* ── 7. Roadmap table ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
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
                <th className="w-24 pb-4 text-center text-[11px] font-normal text-[rgba(15,15,15,0.55)] sm:w-28">
                  {T.plans_col_free}
                  <span className="mt-0.5 block text-[9px] text-[rgba(15,15,15,0.28)]">
                    {T.plans_col_free_sub}
                  </span>
                </th>
                <th className="w-24 pb-4 text-center text-[11px] font-normal text-[rgba(15,15,15,0.70)] sm:w-28">
                  {T.plans_col_pro}
                  <span className="mt-0.5 block text-[9px] text-[rgba(15,15,15,0.30)]">
                    {T.plans_col_pro_sub}
                  </span>
                </th>
                <th className="w-24 pb-4 text-center text-[11px] font-normal text-[rgba(15,15,15,0.80)] sm:w-28">
                  {T.plans_col_creator}
                  <span className="mt-0.5 block text-[9px] text-[rgba(15,15,15,0.30)]">
                    {T.plans_col_creator_sub}
                  </span>
                </th>
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

      <div className="border-t border-[rgba(15,15,15,0.12)]" />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between">
          <FirstPhotoLogo size="icon" className="text-[rgba(15,15,15,0.28)]" />
          <p className="text-[10px] text-[rgba(15,15,15,0.30)]">{T.footer}</p>
        </div>
      </div>

    </Layout>
  )
}
