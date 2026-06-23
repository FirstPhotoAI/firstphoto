import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const METHOD = [
  {
    index: '01',
    title: 'Capture',
    body: 'Upload 5–10 photographs from any source.',
  },
  {
    index: '02',
    title: 'Observe',
    body: 'Canvas-based analysis measures exposure, contrast, composition, saturation, and sharpness independently.',
  },
  {
    index: '03',
    title: 'Respond',
    body: 'Record a community impression — approachable, neutral, or distant.',
  },
  {
    index: '04',
    title: 'Archive',
    body: 'Results are stored locally as a structured research entry.',
  },
]

export default function LandingPage() {
  return (
    <Layout>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-24 md:pt-32">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
          Visual Research Archive
        </p>

        <h1 className="mt-7 font-display text-5xl font-light leading-[1.1] tracking-tight text-[#0f0f0f] md:text-[4.5rem]">
          A systematic study<br />
          of first impressions.
        </h1>

        <p className="mt-8 max-w-sm text-sm leading-relaxed text-[rgba(15,15,15,0.55)]">
          Submit photographs for structured visual observation.
          All analysis runs locally in your browser.
          No images are transmitted or stored.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/archive" className="btn-primary">
            Enter the archive
          </Link>
          <Link to="/upload" className="btn-ghost">
            Submit a photograph
          </Link>
        </div>
      </section>

      {/* ── Rule ────────────────────────────────────────────────────────── */}
      <div className="border-t border-[rgba(15,15,15,0.12)]" />

      {/* ── Method ──────────────────────────────────────────────────────── */}
      <section id="method" className="mx-auto max-w-5xl px-6 py-20">
        <p className="mb-14 text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
          Method
        </p>

        <div className="grid gap-x-12 gap-y-14 sm:grid-cols-2 md:grid-cols-4">
          {METHOD.map((item) => (
            <div key={item.index}>
              <p className="font-display text-5xl font-light leading-none text-[rgba(15,15,15,0.10)]">
                {item.index}
              </p>
              <h3 className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-[#0f0f0f]">
                {item.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Rule ────────────────────────────────────────────────────────── */}
      <div className="border-t border-[rgba(15,15,15,0.12)]" />

      {/* ── Footer note ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 py-7">
        <p className="text-[11px] text-[rgba(15,15,15,0.30)]">
          Canvas API · No server · No cost · Results stored in your browser only
        </p>
      </div>

    </Layout>
  )
}
