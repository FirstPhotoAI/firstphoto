import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'

const BETA_MAILTO = 'mailto:hello@firstphoto.app?subject=Creator%20Beta%20Interest'

export default function CreatorPage() {
  const { lang } = useLang()
  const T = translations[lang].creator

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-6 pt-10 pb-12 md:pt-16 md:pb-16">
        <span className="inline-block border border-[rgba(15,15,15,0.18)] px-2.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.45)]">
          {T.badge}
        </span>
        <h1 className="mt-6 max-w-2xl font-display text-3xl font-light leading-snug text-[#0f0f0f] sm:text-4xl md:text-[2.75rem]">
          {T.hero_h1}
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-[rgba(15,15,15,0.55)] md:text-[15px]">
          {T.hero_sub}
        </p>
        <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-[rgba(15,15,15,0.38)]">
          {T.audience}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link to="/creator/cull" className="btn-primary text-center">
            {T.cta_tool}
          </Link>
          <a href={BETA_MAILTO} className="btn-ghost text-center">
            {T.cta_beta}
          </a>
        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      <section className="mx-auto max-w-5xl px-6 py-14 md:py-16">
        <h2 className="font-display text-2xl font-light text-[#0f0f0f] md:text-3xl">
          {T.pricing_title}
        </h2>
        <div className="mt-8 max-w-md border border-[rgba(15,15,15,0.12)] bg-[#fafaf8] p-6 md:p-8">
          <p className="text-[10px] uppercase tracking-[0.20em] text-[rgba(15,15,15,0.40)]">
            {T.beta_plan_name}
          </p>
          <p className="mt-4 font-display text-3xl font-light text-[#0f0f0f]">
            {T.beta_plan_price}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
            {T.beta_plan_desc}
          </p>
          <p className="mt-6 text-[12px] text-[rgba(15,15,15,0.42)]">
            {T.beta_plan_note}
          </p>
          <a href={BETA_MAILTO} className="btn-primary mt-8 inline-flex">
            {T.cta_beta}
          </a>
        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      <section className="mx-auto max-w-5xl px-6 py-14 md:py-16">
        <h2 className="max-w-lg font-display text-2xl font-light text-[#0f0f0f] md:text-3xl">
          {T.benefits_title}
        </h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {T.benefits.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 border-b border-[rgba(15,15,15,0.06)] py-4 text-sm text-[rgba(15,15,15,0.58)]"
            >
              <span className="mt-0.5 shrink-0 text-[rgba(15,15,15,0.28)]">—</span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      <section className="mx-auto max-w-5xl px-6 py-14 md:py-16">
        <h2 className="font-display text-2xl font-light text-[#0f0f0f] md:text-3xl">
          {T.how_title}
        </h2>
        <ol className="mt-10 space-y-10">
          {T.steps.map((step, i) => (
            <li key={step.title} className="grid gap-3 sm:grid-cols-[3rem_1fr]">
              <p className="font-display text-2xl font-light text-[rgba(15,15,15,0.15)]">
                {String(i + 1).padStart(2, '0')}
              </p>
              <div>
                <p className="text-[13px] font-medium text-[#0f0f0f]">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-12 max-w-xl border-l border-[rgba(15,15,15,0.14)] pl-4 text-[13px] leading-relaxed text-[rgba(15,15,15,0.45)]">
          {T.note}
        </p>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      <section className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <p className="font-display text-xl font-light text-[#0f0f0f] md:text-2xl">
          {T.cta_block}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/creator/cull" className="btn-primary inline-flex">
            {T.cta_tool}
          </Link>
          <a href={BETA_MAILTO} className="btn-ghost inline-flex">
            {T.cta_beta}
          </a>
        </div>
      </section>
    </Layout>
  )
}
