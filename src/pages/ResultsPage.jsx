import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import ResultsDashboard from '../components/ResultsDashboard'
import PublishSection from '../components/PublishSection'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import { loadStudyResults, normalizeStudy } from '../utils/resultsStorage'
import { logSeries, summarizeStudy } from '../utils/debugSeries'

export default function ResultsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [ranked,    setRanked]    = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [photos,    setPhotos]    = useState(null)
  const { lang } = useLang()
  const T = translations[lang].results

  useEffect(() => {
    logSeries('ResultsPage: location.state', location.state?.study
      ? summarizeStudy(location.state.study)
      : null)

    const fromStorage = loadStudyResults()
    logSeries('ResultsPage: sessionStorage read', summarizeStudy(fromStorage))

    const raw = fromStorage ?? (location.state?.study ? normalizeStudy(location.state.study) : null)
    const result = normalizeStudy(raw)

    logSeries('ResultsPage: normalized result', {
      ...summarizeStudy(result),
      photo: result?.photo ? `${result.photo.slice(0, 32)}…` : null,
    })

    if (!result?.ranked?.length || !result.photos?.length) {
      navigate('/upload')
      return
    }

    setRanked(result.ranked)
    setPortfolio(result.portfolio)
    setPhotos(result.photos)
  }, [navigate, location.state])

  const studyDate = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  if (!ranked || !photos) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center text-[11px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.35)]">
          {T.loading}
        </div>
      </Layout>
    )
  }

  const countLabel = photos.length === 1 ? T.photo_1 : T.photos_n

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-6 py-14">

        <div className="border-b border-[rgba(15,15,15,0.12)] pb-10">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(15,15,15,0.38)]">
            {T.label}
          </p>
          <div className="mt-4 flex items-end justify-between gap-6">
            <h1 className="font-display text-4xl font-light leading-tight text-[#0f0f0f]">
              {T.h1}
            </h1>
            <Link to="/upload" className="btn-ghost shrink-0 self-start">
              {T.new_study}
            </Link>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[rgba(15,15,15,0.52)]">
            {T.subtitle}
          </p>
          <p className="mt-2 text-[11px] text-[rgba(15,15,15,0.38)]">
            {T.private_notice}
          </p>
          <p className="mt-4 text-[11px] text-[rgba(15,15,15,0.42)]">
            {photos.length} {countLabel} · {studyDate} · Canvas API
          </p>
        </div>

        <ResultsDashboard ranked={ranked} portfolio={portfolio} photos={photos} />

        <PublishSection ranked={ranked} portfolio={portfolio} photos={photos} />

      </div>
    </Layout>
  )
}
