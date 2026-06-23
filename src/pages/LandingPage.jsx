import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

const PLANS = [
  { feature: 'Mejor foto principal',    free: true,  pro: true,  creator: true  },
  { feature: 'Orden recomendado',       free: true,  pro: true,  creator: true  },
  { feature: 'Primera impresión',       free: true,  pro: true,  creator: true  },
  { feature: 'Análisis detallado',      free: false, pro: true,  creator: true  },
  { feature: 'Fortalezas visuales',     free: false, pro: true,  creator: true  },
  { feature: 'Estrategia visual',       free: false, pro: true,  creator: true  },
  { feature: 'Optimización de perfil',  free: false, pro: true,  creator: true  },
  { feature: 'Bio optimizada con IA',   free: false, pro: false, creator: true  },
  { feature: 'Ideas para Instagram',    free: false, pro: false, creator: true  },
  { feature: 'Ideas para Threads',      free: false, pro: false, creator: true  },
  { feature: 'Marca personal',          free: false, pro: false, creator: true  },
  { feature: 'Calendario de contenido', free: false, pro: false, creator: true  },
]

function Cell({ yes }) {
  return yes
    ? <span className="text-[rgba(15,15,15,0.62)]">✓</span>
    : <span className="text-[rgba(15,15,15,0.18)]">–</span>
}

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

      {/* ── Roadmap table ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-20">

        <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.40)]">
          Versiones
        </p>
        <h2 className="mt-5 font-display text-3xl font-light text-[#0f0f0f] sm:text-4xl">
          Planes de FirstPhoto
        </h2>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
          La versión gratuita te ayuda a elegir tu mejor primera foto. Las versiones Pro y Creator
          estarán enfocadas en estrategia visual, perfil y contenido.
        </p>

        {/* Table — overflow-x-auto for narrow viewports */}
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-[rgba(15,15,15,0.14)]">
                <th className="pb-4 pr-6 text-left text-[10px] font-normal uppercase tracking-[0.16em] text-[rgba(15,15,15,0.38)]">
                  Función
                </th>
                {/* Gratis */}
                <th className="w-24 pb-4 text-center text-[11px] font-normal text-[rgba(15,15,15,0.55)] sm:w-28">
                  Gratis
                  <span className="mt-0.5 block text-[9px] text-[rgba(15,15,15,0.28)]">
                    Disponible
                  </span>
                </th>
                {/* Pro */}
                <th className="w-24 pb-4 text-center text-[11px] font-normal text-[rgba(15,15,15,0.70)] sm:w-28">
                  Pro ⭐
                  <span className="mt-0.5 block text-[9px] text-[rgba(15,15,15,0.30)]">
                    Próximamente
                  </span>
                </th>
                {/* Creator */}
                <th className="w-24 pb-4 text-center text-[11px] font-normal text-[rgba(15,15,15,0.80)] sm:w-28">
                  Creator 🚀
                  <span className="mt-0.5 block text-[9px] text-[rgba(15,15,15,0.30)]">
                    Próximamente
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {PLANS.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-[rgba(15,15,15,0.06)] ${
                    i === 2 ? 'border-b-[rgba(15,15,15,0.14)]' : ''
                  }`}
                >
                  <td className="py-3 pr-6 text-[13px] text-[rgba(15,15,15,0.62)]">
                    {row.feature}
                  </td>
                  <td className="py-3 text-center text-[13px]"><Cell yes={row.free} /></td>
                  <td className="py-3 text-center text-[13px]"><Cell yes={row.pro} /></td>
                  <td className="py-3 text-center text-[13px]"><Cell yes={row.creator} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Creator aside */}
        <div className="mt-10 border-l border-[rgba(15,15,15,0.12)] pl-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.38)]">
            Creator 🚀 — Próximamente
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[rgba(15,15,15,0.52)]">
            No solo elegimos tu mejor foto. Te ayudamos a construir una presencia visual completa
            para Instagram, Threads, casting, negocios y marca personal.
          </p>
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
