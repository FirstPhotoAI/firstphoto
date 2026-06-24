import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'

const PLAN_KEYS = [
  [true,  true],
  [true,  true],
  [true,  true],
  [false, true],
  [false, true],
  [false, true],
]

function Cell({ yes }) {
  return yes
    ? <span className="text-[rgba(15,15,15,0.62)]">✓</span>
    : <span className="text-[rgba(15,15,15,0.18)]">–</span>
}

export default function LandingPage() {
  const { lang } = useLang()
  const T = translations[lang].landing

  return (
    <Layout>
      <section className="mx-auto max-w-5xl px-6 pt-7 pb-10 md:pt-14 md:pb-16">
        <p className="text-[9px] uppercase tracking-[0.20em] text-[rgba(15,15,15,0.34)]">
          FirstPhoto Play
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-2xl font-light leading-snug text-[#0f0f0f] sm:text-3xl md:text-[2.6rem]">
          {T.hero_h1}
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-[rgba(15,15,15,0.55)] md:text-[15px]">
          {T.hero_subtitle}
        </p>
        <p className="mt-4 text-[11px] leading-relaxed text-[rgba(15,15,15,0.40)]">
          {T.hero_reassurance}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/upload" className="btn-primary">{T.participate_btn}</Link>
          <Link to="/creator" className="btn-ghost">{T.cta_creator}</Link>
        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      <section className="mx-auto max-w-5xl px-6 py-12 md:py-14">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
          {T.play_label}
        </p>
        <h2 className="mt-4 font-display text-2xl font-light text-[#0f0f0f] md:text-3xl">
          {T.play_h2}
        </h2>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {T.play_features.map((item) => (
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

      <section className="mx-auto max-w-5xl px-6 py-12 md:py-14">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
          {T.method_label}
        </p>
        <ol className="mt-8 space-y-8">
          {T.method_steps.map((step, i) => (
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
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      <section className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
          {T.creator_label}
        </p>
        <h2 className="mt-6 max-w-2xl font-display text-3xl font-light leading-snug text-[#0f0f0f] sm:text-[2.5rem]">
          {T.creator_h2}
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
          {T.creator_description}
        </p>
        <div className="mt-6">
          <Link to="/creator" className="btn-primary">{T.creator_cta}</Link>
        </div>
      </section>

      <div className="border-t border-[rgba(15,15,15,0.10)]" />

      <section className="mx-auto max-w-5xl px-6 py-14 md:py-16">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
          {T.plans_label}
        </p>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr className="border-b border-[rgba(15,15,15,0.14)]">
                <th className="pb-4 pr-6 text-left text-[10px] font-normal uppercase tracking-[0.16em] text-[rgba(15,15,15,0.38)]">
                  {T.plans_col_feature}
                </th>
                <th className="w-24 pb-4 text-center text-[11px] font-normal sm:w-28">
                  {T.plans_col_play}
                </th>
                <th className="w-24 pb-4 text-center text-[11px] font-normal sm:w-28">
                  {T.plans_col_creator}
                </th>
              </tr>
            </thead>
            <tbody>
              {T.plans_rows.map((label, i) => (
                <tr key={label} className="border-b border-[rgba(15,15,15,0.06)]">
                  <td className="py-3 pr-6 text-[13px] text-[rgba(15,15,15,0.62)]">{label}</td>
                  <td className="py-3 text-center text-[13px]"><Cell yes={PLAN_KEYS[i][0]} /></td>
                  <td className="py-3 text-center text-[13px]"><Cell yes={PLAN_KEYS[i][1]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <p className="text-[10px] text-[rgba(15,15,15,0.30)]">{T.footer}</p>
      </div>
    </Layout>
  )
}
