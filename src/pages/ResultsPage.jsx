import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import ResultsDashboard from '../components/ResultsDashboard'
import PublishSection from '../components/PublishSection'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import { loadStudyResults } from '../utils/resultsStorage'

export default function ResultsPage() {
  const navigate = useNavigate()
  const [ranked,    setRanked]    = useState(null)
  const [portfolio, setPortfolio] = useState(null)
  const [photos,    setPhotos]    = useState(null)
  const { lang } = useLang()
  const T = translations[lang].results

  useEffect(() => {
    const data = loadStudyResults()

    if (!data?.ranked?.length || !data.photos?.length) {
      navigate('/upload')
      return
    }

    setRanked(data.ranked)
    setPortfolio(data.portfolio)
    setPhotos(data.photos)
  }, [navigate])

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
