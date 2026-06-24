import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CreatorLayout from '../components/CreatorLayout'
import CullingResults from '../components/CullingResults'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import { loadCullSession } from '../culling/sessionStorage.js'

export default function CreatorCullResultsPage() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const T = translations[lang].cull
  const [session, setSession] = useState(null)

  useEffect(() => {
    const data = loadCullSession()
    if (!data?.results?.length) {
      navigate('/creator/cull')
      return
    }
    setSession(data)
  }, [navigate])

  if (!session) {
    return (
      <CreatorLayout>
        <div className="flex min-h-[40vh] items-center justify-center text-[11px] uppercase tracking-[0.18em] text-[rgba(15,15,15,0.35)]">
          {T.loading}
        </div>
      </CreatorLayout>
    )
  }

  return (
    <CreatorLayout>
      <CullingResults meta={session.meta} results={session.results} />
    </CreatorLayout>
  )
}
