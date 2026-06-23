import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ResultsDashboard from '../components/ResultsDashboard'

export default function ResultsPage() {
  const navigate = useNavigate()
  const [ranked, setRanked] = useState(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('firstphoto_results')

    if (!raw) {
      navigate('/upload')
      return
    }

    try {
      const parsed = JSON.parse(raw)
      setRanked(parsed)
    } catch {
      navigate('/upload')
    }
  }, [navigate])

  const studyDate = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  if (!ranked) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center text-[11px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.35)]">
          Reading observations…
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-6 py-14">

        {/* Document header */}
        <div className="border-b border-[rgba(15,15,15,0.12)] pb-10">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
            Visual Study
          </p>
          <div className="mt-4 flex items-end justify-between gap-6">
            <h1 className="font-display text-4xl font-light leading-tight text-[#0f0f0f]">
              Observation Record
            </h1>
            <Link to="/upload" className="btn-ghost shrink-0 self-start">
              New study
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-[rgba(15,15,15,0.42)]">
            {ranked.length} {ranked.length === 1 ? 'photograph' : 'photographs'} · {studyDate} · Canvas API
          </p>
        </div>

        <ResultsDashboard ranked={ranked} />

      </div>
    </Layout>
  )
}
