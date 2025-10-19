import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'
import { useState } from "react";

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
        <img src="/casa.png" alt="Igrejas" className="h-5 w-5 mr-2 object-contain" />
      )
    default:
      return <span className="h-5 w-5 mr-2 inline-block" />
  }
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const loc = useLocation()
  const active = loc.pathname === to
  const base = active ? 'bg-sky-100 text-sky-800' : 'text-gray-800 hover:bg-sky-50'
  return (
    <Link to={to} className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${base}`}>
      {children}
    </Link>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { role, clear } = useAuth()
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b h-14 flex items-center px-4">
        <button className="lg:hidden p-2 rounded focus:outline-none focus:ring" onClick={() => setOpen(true)} aria-label="Abrir menu">☰</button>
        <h1 className="ml-3 text-fluidTitle font-semibold">CNS Santa Isabel</h1>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block w-64 shrink-0 border-r bg-white">
          <div className="p-4 border-b flex items-center gap-3">
            <img src="/ccb.png" alt="CCB" className="h-10 object-contain"/>
            <div>
              <div className="font-semibold">CNS Santa Isabel</div>
              <div className="text-xs text-gray-500 mt-1">Painel administrativo</div>
            </div>
          </div>
          <nav className="p-3 flex flex-col gap-1">
            <NavLink to="/"><Icon name="dashboard"/> Dashboard</NavLink>
            <NavLink to="/orders"><Icon name="orders"/> Pedidos</NavLink>
            <NavLink to="/orders/new"><Icon name="new"/> Fazer pedido</NavLink>
            <NavLink to="/stock"><Icon name="stock"/> Movimentações</NavLink>
            <NavLink to="/products"><Icon name="products"/> Produtos</NavLink>
            {role === 'ADM' && <NavLink to="/users"><Icon name="users"/> Usuários</NavLink>}
            <NavLink to="/churches"><Icon name="church"/> Igrejas</NavLink>
          </nav>
          <div className="p-3 border-t text-xs text-gray-600">
            <div className="flex items-center justify-between gap-2">
              <span>Papel: <b>{role || '—'}</b></span>
              <button className="text-red-600" onClick={clear}>Sair</button>
            </div>
          </div>
        </aside>

        {/* Drawer mobile */}
        {open && (
          <div className="lg:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <nav className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl p-4 overflow-y-auto">
              <button className="mb-4 p-2 rounded focus:ring" onClick={() => setOpen(false)}>Fechar</button>
              <div className="p-4 border-b flex items-center gap-3">
                <img src="/ccb.png" alt="CCB" className="h-10 object-contain"/>
                <div>
                  <div className="font-semibold">CNS Santa Isabel</div>
                  <div className="text-xs text-gray-500 mt-1">Painel administrativo</div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <NavLink to="/"><Icon name="dashboard"/> Dashboard</NavLink>
                <NavLink to="/orders"><Icon name="orders"/> Pedidos</NavLink>
                <NavLink to="/orders/new"><Icon name="new"/> Fazer pedido</NavLink>
                <NavLink to="/stock"><Icon name="stock"/> Movimentações</NavLink>
                <NavLink to="/products"><Icon name="products"/> Produtos</NavLink>
                {role === 'ADM' && <NavLink to="/users"><Icon name="users"/> Usuários</NavLink>}
                <NavLink to="/churches"><Icon name="church"/> Igrejas</NavLink>
              </div>
              <div className="p-3 border-t text-xs text-gray-600">
                <div className="flex items-center justify-between gap-2">
                  <span>Papel: <b>{role || '—'}</b></span>
                  <button className="text-red-600" onClick={clear}>Sair</button>
                </div>
              </div>
            </nav>
          </div>
        )}

        {/* Conteúdo */}
        <main className="flex-1 min-w-0">
          <div className="container py-4">{children}</div>
        </main>
      </div>
    </div>
  );
}