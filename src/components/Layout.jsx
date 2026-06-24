import { Link, NavLink, useLocation } from 'react-router-dom'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'
import MobileUploadCta, { isStickyUploadVisible } from './MobileUploadCta'

const NAV_BASE     = 'text-[10px] uppercase tracking-[0.16em] transition-colors'
const NAV_ACTIVE   = 'text-[#0f0f0f]'
const NAV_INACTIVE = 'text-[rgba(15,15,15,0.42)] hover:text-[#0f0f0f]'

function navClass({ isActive }) {
  return `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`
}

export default function Layout({ children }) {
  const { lang, setLang } = useLang()
  const T = translations[lang].nav
  const { pathname } = useLocation()
  const stickyUpload = isStickyUploadVisible(pathname)

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <header className="border-b border-[rgba(15,15,15,0.12)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">

          {/* Wordmark */}
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              fontWeight: 500,
              textTransform: 'uppercase',
              fontSize: '11px',
              letterSpacing: '0.24em',
              color: '#0f0f0f',
            }}
          >
            FirstPhoto
          </Link>

          <nav className="flex items-center gap-7">
            <NavLink to="/upload" className={navClass} end>
              {T.study}
            </NavLink>
            <NavLink to="/creator" className={navClass}>
              {T.creator}
            </NavLink>

            {/* Language toggle — ES / EN / JA */}
            <div className="flex items-center gap-3">
              {[
                { code: 'es', label: 'ES' },
                { code: 'en', label: 'EN' },
                { code: 'ja', label: '日本語' },
              ].map(({ code, label }) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`text-[10px] tracking-[0.14em] transition-colors ${
                    lang === code
                      ? 'text-[#0f0f0f]'
                      : 'text-[rgba(15,15,15,0.32)] hover:text-[#0f0f0f]'
                  }`}
                  aria-label={`Switch to ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>

        </div>
      </header>
      <main className={stickyUpload ? 'pb-24 md:pb-0' : undefined}>{children}</main>
      <MobileUploadCta />
    </div>
  )
}
