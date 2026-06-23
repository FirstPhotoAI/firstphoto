import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { IDENTITIES, DICT_LABELS, findIdentity } from '../data/identities'
import { getPublicEntries, getNoteCount } from '../data/archiveStore'
import { useLang } from '../contexts/LangContext'

// ─── Tiny gallery thumbnail ────────────────────────────────────────────────────

function EntryThumb({ entry }) {
  const noteCount = getNoteCount(entry.id)
  return (
    <Link
      to={`/archive/${entry.id}`}
      className="group block overflow-hidden border border-[rgba(15,15,15,0.10)]"
    >
      <img
        src={entry.photo}
        alt={entry.archetype || entry.category}
        className="aspect-[3/4] w-full object-cover transition-opacity duration-300 group-hover:opacity-88"
      />
      {noteCount > 0 && (
        <p className="px-2 py-1.5 text-[10px] text-[rgba(15,15,15,0.36)]">
          {noteCount} {noteCount === 1 ? 'nota' : 'notas'}
        </p>
      )}
    </Link>
  )
}

// ─── Single identity entry (catalog card) ─────────────────────────────────────

function IdentityCard({ identity, entries, lang, T, active }) {
  const ref    = useRef(null)
  const name   = identity.names[lang]   ?? identity.names.en
  const nameJa = lang !== 'ja' ? identity.names.ja : null
  const nameEn = lang !== 'en' ? identity.names.en : null
  const desc   = identity.descriptions[lang] ?? identity.descriptions.en

  const relatedIdentities = IDENTITIES.filter((id) =>
    identity.related.includes(id.names.en)
  )

  // Smooth scroll when this card becomes active
  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [active])

  return (
    <section
      ref={ref}
      id={identity.slug}
      className={`border-b border-[rgba(15,15,15,0.10)] py-14 transition-colors duration-200 ${
        active ? 'bg-[rgba(15,15,15,0.015)]' : ''
      }`}
    >
      <div className="mx-auto max-w-5xl px-6">

        {/* ── Identity header ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_2fr]">

          <div>
            {/* Primary name */}
            <h2 className="font-display text-3xl font-light leading-tight text-[#0f0f0f]">
              {name}
            </h2>

            {/* Secondary names */}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {nameJa && (
                <span className="text-[13px] text-[rgba(15,15,15,0.40)]">{nameJa}</span>
              )}
              {nameEn && lang === 'ja' && (
                <span className="text-[12px] text-[rgba(15,15,15,0.30)]">{nameEn}</span>
              )}
              {lang !== 'es' && lang !== 'ja' && (
                <span className="text-[13px] text-[rgba(15,15,15,0.36)]">
                  {identity.names.es}
                </span>
              )}
            </div>
          </div>

          <div>
            {/* Description */}
            <p className={`leading-[1.9] text-[rgba(15,15,15,0.68)] ${
              lang === 'ja' ? 'text-[15px]' : 'text-[14px]'
            }`}>
              {desc}
            </p>

            {/* Related identities */}
            {relatedIdentities.length > 0 && (
              <div className="mt-6 flex flex-wrap items-baseline gap-x-1 gap-y-1.5">
                <span className="mr-2 text-[10px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.30)]">
                  {T.related}
                </span>
                {relatedIdentities.map((rel, i) => (
                  <span key={rel.slug}>
                    <Link
                      to={`/identities/${rel.slug}`}
                      className="text-[12px] text-[rgba(15,15,15,0.50)] underline decoration-[rgba(15,15,15,0.20)] underline-offset-2 transition-colors hover:text-[#0f0f0f]"
                    >
                      {rel.names[lang] ?? rel.names.en}
                    </Link>
                    {i < relatedIdentities.length - 1 && (
                      <span className="ml-1 text-[rgba(15,15,15,0.20)]">·</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Gallery examples ────────────────────────────────────────────── */}
        <div className="mt-10">
          <p className="mb-5 text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.30)]">
            {T.gallery_label}
          </p>
          {entries.length === 0 ? (
            <p className="text-[12px] italic text-[rgba(15,15,15,0.30)]">
              {T.no_entries}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
              {entries.slice(0, 5).map((entry) => (
                <EntryThumb key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  )
}

// ─── Full index page ──────────────────────────────────────────────────────────

function IdentityIndex({ lang, T, allEntries }) {
  return (
    <>
      {/* Page header */}
      <div className="border-b border-[rgba(15,15,15,0.12)] pb-10">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
            {T.label}
          </p>
          <h1 className="mt-4 font-display text-4xl font-light text-[#0f0f0f]">
            {T.h1}
          </h1>
          <p className="mt-3 max-w-md text-[13px] leading-[1.75] text-[rgba(15,15,15,0.46)]">
            {T.tagline}
          </p>
        </div>
      </div>

      {/* Identity cards — all 11 */}
      {IDENTITIES.map((identity) => {
        const entries = allEntries.filter((e) =>
          identity.allNames.some((n) =>
            (e.archetype ?? '').toLowerCase().includes(n.toLowerCase().split(/\s+/)[0])
          )
        )
        return (
          <IdentityCard
            key={identity.slug}
            identity={identity}
            entries={entries}
            lang={lang}
            T={T}
            active={false}
          />
        )
      })}
    </>
  )
}

// ─── Single identity page ─────────────────────────────────────────────────────

function IdentityDetail({ slug, lang, T, allEntries }) {
  const identity = IDENTITIES.find((id) => id.slug === slug)
  const navigate = useNavigate()

  useEffect(() => {
    if (!identity) navigate('/identities')
  }, [identity, navigate])

  if (!identity) return null

  const entries = allEntries.filter((e) =>
    identity.allNames.some((n) =>
      (e.archetype ?? '').toLowerCase().includes(n.toLowerCase().split(/\s+/)[0])
    )
  )

  return (
    <>
      {/* Back link */}
      <div className="border-b border-[rgba(15,15,15,0.12)]">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <Link
            to="/identities"
            className="text-[10px] uppercase tracking-[0.16em] text-[rgba(15,15,15,0.40)] transition-colors hover:text-[#0f0f0f]"
          >
            {T.all_link}
          </Link>
        </div>
      </div>

      {/* Identity card — full detail */}
      <IdentityCard
        identity={identity}
        entries={entries}
        lang={lang}
        T={T}
        active={true}
      />

      {/* Related identities — full cards */}
      {identity.related.length > 0 && (
        <div className="border-t border-[rgba(15,15,15,0.10)] pt-12 pb-16">
          <div className="mx-auto max-w-5xl px-6">
            <p className="mb-8 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
              {T.related}
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              {IDENTITIES.filter((id) => identity.related.includes(id.names.en))
                .map((rel) => {
                  const relEntries = allEntries.filter((e) =>
                    rel.allNames.some((n) =>
                      (e.archetype ?? '').toLowerCase().includes(n.toLowerCase().split(/\s+/)[0])
                    )
                  )
                  return (
                    <Link
                      key={rel.slug}
                      to={`/identities/${rel.slug}`}
                      className="group border border-[rgba(15,15,15,0.10)] p-6 transition-colors hover:border-[rgba(15,15,15,0.22)]"
                    >
                      <p className="font-display text-xl font-light text-[#0f0f0f] group-hover:underline">
                        {rel.names[lang] ?? rel.names.en}
                      </p>
                      {lang !== 'ja' && (
                        <p className="mt-1 text-[11px] text-[rgba(15,15,15,0.36)]">
                          {rel.names.ja}
                        </p>
                      )}
                      <p className="mt-3 text-[12px] leading-relaxed text-[rgba(15,15,15,0.52)]">
                        {(rel.descriptions[lang] ?? rel.descriptions.en).slice(0, 90)}…
                      </p>
                      {relEntries.length > 0 && (
                        <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[rgba(15,15,15,0.28)]">
                          {relEntries.length} {lang === 'ja' ? '件' : lang === 'es' ? 'entradas' : 'entries'}
                        </p>
                      )}
                    </Link>
                  )
                })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

export default function IdentitiesPage() {
  const { slug }   = useParams()
  const { lang }   = useLang()
  const T          = DICT_LABELS[lang] ?? DICT_LABELS.en
  const [allEntries, setAllEntries] = useState([])

  useEffect(() => {
    setAllEntries(getPublicEntries())
  }, [])

  return (
    <Layout>
      {slug ? (
        <IdentityDetail slug={slug} lang={lang} T={T} allEntries={allEntries} />
      ) : (
        <div className="py-14">
          <IdentityIndex lang={lang} T={T} allEntries={allEntries} />
        </div>
      )}
    </Layout>
  )
}
