import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const loc = useLocation()
  const active = loc.pathname === to
  return (
    <Link to={to} className={`flex items-center gap-2 px-3 py-2 rounded ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-800 hover:bg-gray-50'}`}>
      {children}
    </Link>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { role, clear } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 border-r bg-white flex flex-col">
          <div className="p-4 border-b flex items-center gap-3">
            <img src="/ccb.png" alt="CCB" className="h-10"/>
            <div className="font-semibold">CNS Santa Isabel</div>
          </div>
          <nav className="p-3 flex-1 flex flex-col gap-1">
            <NavLink to="/">🏠 Dashboard</NavLink>
            <NavLink to="/orders">📦 Pedidos</NavLink>
            <NavLink to="/orders/new">🛒 Fazer pedido</NavLink>
            <NavLink to="/stock">🚚 Movimentações</NavLink>
            <NavLink to="/products">📦 Produtos</NavLink>
            <NavLink to="/users">👤 Usuários</NavLink>
            <NavLink to="/churches"><img src="/casa.png" alt="Igreja" className="h-4 w-4"/> Igrejas</NavLink>
          </nav>
          <div className="p-3 border-t text-xs text-gray-600">
            <div className="flex items-center justify-between">
              <span>Papel: <b>{role || '—'}</b></span>
              <button className="text-red-600" onClick={clear}>Sair</button>
            </div>
          </div>
        </aside>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
