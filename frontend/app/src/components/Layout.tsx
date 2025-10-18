import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useState, useEffect, useLayoutEffect } from 'react'

function Icon({ name }: { name: string }) {
  // Simple inline icons to avoid broken/missing pngs
  switch (name) {
    case 'dashboard':
      return (
        <svg className="h-5 w-5 mr-2 text-sky-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="5" rx="1" />
          <rect x="13" y="10" width="8" height="11" rx="1" />
        </svg>
      )
    case 'orders':
      return (
        <svg className="h-5 w-5 mr-2 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 7h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 11h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 15h10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'new':
      return (
        <svg className="h-5 w-5 mr-2 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 5v14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'stock':
      return (
        <svg className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 21h18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 3v18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 3v18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'products':
      return (
        <svg className="h-5 w-5 mr-2 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="3" strokeWidth="2" />
          <path d="M19 12a7 7 0 0 0-14 0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'users':
      return (
        <svg className="h-5 w-5 mr-2 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M16 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z" strokeWidth="1.5" />
          <path d="M6 21v-2a4 4 0 0 1 4-4h4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'church':
      return (
        <svg className="h-5 w-5 mr-2 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 2v6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 21h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 10.5L12 7 5 10.5V21h14v-10.5z" strokeWidth="1.5" />
        </svg>
      )
    default:
      return <span className="h-5 w-5 mr-2 inline-block" />
  }
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const loc = useLocation()
  const active = loc.pathname === to
  let dark = false
  try { dark = localStorage.getItem('sidebar_dark') === '1' } catch {}
  const base = active ? (dark ? 'bg-gray-700 text-white' : 'bg-sky-100 text-sky-800') : (dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-800 hover:bg-sky-50')
  return (
    <Link to={to} className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${base}`}>
      {children}
    </Link>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { role, clear } = useAuth()
  const [open, setOpen] = useState(false)
  // Use a single global theme flag. Persisted as 'theme_dark'.
  const [themeDark, setThemeDark] = useState<boolean>(() => {
    try { return localStorage.getItem('theme_dark') === '1' } catch { return false }
  })
  const [mounted, setMounted] = useState(false)

  // Apply theme before paint to avoid flash
  useLayoutEffect(() => {
    try { localStorage.setItem('theme_dark', themeDark ? '1' : '0') } catch {}
    try {
      if (themeDark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    } catch {}
  }, [themeDark])

  // mark mounted after first commit so we can enable transitions
  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* mobile top bar */}
        <div className="w-full md:hidden flex items-center justify-between bg-white p-3 border-b">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="p-2 rounded hover:bg-gray-100">
              <svg className="h-6 w-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 6h16M4 12h16M4 18h16" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <img src="/ccb.png" alt="CCB" className="h-8"/>
            <div className="font-semibold">CNS Santa Isabel</div>
          </div>
        </div>

        {/* sidebar */}
  <aside className={`fixed inset-y-0 left-0 z-30 transform ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:relative w-64 ${mounted ? 'transition-transform duration-300 ease-in-out' : 'transition-none'} bg-white border-r flex flex-col ${themeDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
          <div className={`p-4 border-b flex items-center gap-3 ${themeDark ? 'border-gray-700' : 'border-gray-100'}`}>
            <img src="/ccb.png" alt="CCB" className={`h-10 ${themeDark ? 'rounded bg-white/10 p-1' : ''}`}/>
            <div>
              <div className={`font-semibold ${themeDark ? 'text-white' : ''}`}>CNS Santa Isabel</div>
              <div className={`text-xs ${themeDark ? 'text-gray-300' : 'text-gray-500'} mt-1`}>Painel administrativo</div>
            </div>
            <button className="ml-auto md:hidden p-1" onClick={() => setOpen(false)} aria-label="Fechar menu">
              <svg className="h-5 w-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
          <nav className="p-3 flex-1 flex flex-col gap-1">
            <NavLink to="/"><Icon name="dashboard"/> Dashboard</NavLink>
            <NavLink to="/orders"><Icon name="orders"/> Pedidos</NavLink>
            <NavLink to="/orders/new"><Icon name="new"/> Fazer pedido</NavLink>
            <NavLink to="/stock"><Icon name="stock"/> Movimentações</NavLink>
            <NavLink to="/products"><Icon name="products"/> Produtos</NavLink>
            {role === 'ADM' && <NavLink to="/users"><Icon name="users"/> Usuários</NavLink>}
            <NavLink to="/churches"><Icon name="church"/> Igrejas</NavLink>
          </nav>
          <div className={`p-3 border-t text-xs ${themeDark ? 'border-gray-700 text-gray-300' : 'border-gray-100 text-gray-600'}`}>
            <div className="flex items-center justify-between gap-2">
              <span>Papel: <b className={themeDark ? 'text-white' : ''}>{role || '—'}</b></span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setThemeDark(!themeDark)}
                  aria-pressed={themeDark}
                  className={`p-1 rounded-md flex items-center gap-2 text-sm ${themeDark ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {themeDark ? (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4" strokeWidth="1.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                  <span className="text-xs">{themeDark ? 'Escuro' : 'Claro'}</span>
                </button>

                <button className={`${themeDark ? 'text-gray-300' : 'text-red-600'}`} onClick={clear}>Sair</button>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6 md:ml-64">
          {children}
        </main>
      </div>
    </div>
  )
}
