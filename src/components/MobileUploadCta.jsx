import { Link, useLocation } from 'react-router-dom'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'

/** Sticky upload CTA — homepage, gallery, identities only. Hidden on /upload. */
function shouldShowSticky(pathname) {
  if (pathname === '/') return true
  if (pathname.startsWith('/archive')) return true
  if (pathname.startsWith('/identities')) return true
  return false
}

export function isStickyUploadVisible(pathname) {
  return shouldShowSticky(pathname)
}

export default function MobileUploadCta() {
  const { pathname } = useLocation()
  const { lang } = useLang()
  const label = translations[lang].cta.upload_3

  if (!shouldShowSticky(pathname)) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[rgba(15,15,15,0.12)] bg-[#fafaf8]/95 px-4 py-3 backdrop-blur-sm md:hidden"
      aria-hidden={false}
    >
      <Link to="/upload" className="btn-primary block w-full text-center">
        {label}
      </Link>
    </div>
  )
}
