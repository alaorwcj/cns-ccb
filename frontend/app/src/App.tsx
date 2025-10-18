import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from './store/auth'
import Login from './routes/auth/Login'
import Dashboard from './routes/dash/Dashboard'
import OrdersList from './routes/orders/OrdersList'
import OrderCreate from './routes/orders/OrderCreate'
import Movements from './routes/stock/Movements'
import ProductsList from './routes/products/ProductsList'
import UsersList from './routes/users/UsersList'
import ChurchesList from './routes/churches/ChurchesList'
import Layout from './components/AppLayout'
import ResetConfirm from './routes/auth/ResetConfirm'
import ResetInit from './routes/auth/ResetInit'

function Protected({ children, roles }: { children: JSX.Element; roles?: ("ADM"|"USUARIO")[] }) {
  const { access, role } = useAuth()
  const loc = useLocation()
  if (!access) return <Navigate to="/login" state={{ from: loc }} replace />
  if (roles && role && !roles.includes(role)) return <Navigate to="/" replace />
  return children
}

function Nav() {
  const { access, role, clear } = useAuth()
  return (
    <div className="w-full bg-white border-b mb-4">
      <div className="max-w-6xl mx-auto p-3 flex gap-4 items-center justify-between min-w-0">
        <div className="flex gap-3 min-w-0">
          <Link to="/" className="font-semibold truncate">CCB CNS</Link>
          {access && <>
            <Link to="/orders" className="truncate">Pedidos</Link>
            <Link to="/orders/new" className="truncate">Novo Pedido</Link>
            <Link to="/stock" className="truncate">Movimentações</Link>
            <Link to="/products" className="truncate">Produtos</Link>
            <Link to="/users" className="truncate">Usuários</Link>
            <Link to="/churches" className="truncate">Igrejas</Link>
          </>}
        </div>
        <div className="flex gap-2 items-center">
          {role && <span className="text-xs px-2 py-1 bg-gray-100 rounded">{role}</span>}
          {access ? (
            <button className="text-sm text-red-600" onClick={clear}>Sair</button>
          ) : (
            <Link to="/login">Entrar</Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-confirm" element={<ResetConfirm />} />
        <Route path="/" element={<Protected><Layout><Dashboard /></Layout></Protected>} />
        <Route path="/orders" element={<Protected><Layout><OrdersList /></Layout></Protected>} />
        <Route path="/orders/new" element={<Protected><Layout><OrderCreate /></Layout></Protected>} />
        <Route path="/stock" element={<Protected roles={["ADM"]}><Layout><Movements /></Layout></Protected>} />
        <Route path="/products" element={<Protected roles={["ADM"]}><Layout><ProductsList /></Layout></Protected>} />
        <Route path="/users" element={<Protected roles={["ADM"]}><Layout><UsersList /></Layout></Protected>} />
        <Route path="/churches" element={<Protected roles={["ADM"]}><Layout><ChurchesList /></Layout></Protected>} />
        <Route path="/admin/reset" element={<Protected roles={["ADM"]}><Layout><ResetInit /></Layout></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
