import { Link, NavLink } from 'react-router-dom'

const NAV_BASE = 'text-[10px] uppercase tracking-[0.16em] transition-colors'
const NAV_ACTIVE = 'text-[#0f0f0f]'
const NAV_INACTIVE = 'text-[rgba(15,15,15,0.42)] hover:text-[#0f0f0f]'

function navClass({ isActive }) {
  return `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`
}

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#fafaf8]">
      <header className="border-b border-[rgba(15,15,15,0.12)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">

          {/* Logo — always navigates to absolute root */}
          <Link
            to="/"
            className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#0f0f0f]"
          >
            FirstPhoto
          </Link>

          <nav className="flex items-center gap-7">
            {/* Archive — absolute path /archive */}
            <NavLink to="/archive" className={navClass} end>
              Archive
            </NavLink>

            {/* Study — absolute path /upload */}
            <NavLink to="/upload" className={navClass} end>
              Study
            </NavLink>
          </nav>

        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
