import { Link, NavLink } from 'react-router-dom'
import { useLang } from '../contexts/LangContext'
import { translations } from '../i18n'

const NAV_BASE = 'text-[10px] uppercase tracking-[0.16em] transition-colors'

function navClass({ isActive }) {
  return `${NAV_BASE} ${isActive ? 'text-[#0f0f0f]' : 'text-[rgba(15,15,15,0.42)] hover:text-[#0f0f0f]'}`
}

export default function CreatorLayout({ children }) {
  const { lang, setLang } = useLang()
  const T = translations[lang].cullNav

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <header className="border-b border-[rgba(15,15,15,0.12)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link
            to="/creator"
            style={{
              textDecoration: 'none',
              fontWeight: 500,
              textTransform: 'uppercase',
              fontSize: '11px',
              letterSpacing: '0.24em',
              color: '#0f0f0f',
            }}
          >
            FirstPhoto Creator
          </Link>

          <nav className="flex items-center gap-7">
            <NavLink to="/creator/cull" className={navClass}>
              {T.cull}
            </NavLink>
            <NavLink to="/creator/results" className={navClass}>
              {T.results}
            </NavLink>
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
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
