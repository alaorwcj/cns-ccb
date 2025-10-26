import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth } from '../../store/auth'

function decodeRoleFromJWT(token: string): 'ADM' | 'USUARIO' | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const role = payload?.role
    if (role === 'ADM' || role === 'USUARIO') return role
    return null
  } catch {
    return null
  }
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const setTokens = useAuth((s) => s.setTokens)
  const navigate = useNavigate()
  const location = useLocation() as any

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const r = await api.post('/auth/login', { username, password })
      const access = r.data.access as string
      const refresh = r.data.refresh as string
      const role = decodeRoleFromJWT(access)
      setTokens(access, refresh, role)
      const to = location.state?.from?.pathname || '/'
      navigate(to, { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Falha no login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="h-3 bg-blue-600 w-full" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded shadow p-6">
          <div className="flex flex-col items-center text-center">
            <img src="/ccb.png" className="h-16 mb-3" alt="CCB" />
            <div className="text-xl font-bold leading-tight">Acesso ao CNS pedidos<br/>CCB ADM - Santa Isabel</div>
            <div className="text-xs text-gray-600 mt-2">Preencha os campos abaixo para acessar sua conta</div>
          </div>
          <form className="flex flex-col gap-3 mt-5" onSubmit={onSubmit}>
            <label className="text-sm">Email</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Informe seu email" value={username} onChange={(e) => setUsername(e.target.value)} />
            <label className="text-sm">Senha</label>
            <input className="w-full border rounded px-3 py-2" placeholder="Informe sua senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 transition text-white rounded px-4 py-2">Acessar conta</button>
          </form>
          <div className="mt-6 pt-4 border-t text-center">
            <div className="text-xs text-gray-600">Esqueceu sua senha?</div>
            <button className="mt-2 border rounded px-4 py-2 text-sm">Resetar senha</button>
          </div>
        </div>
      </div>
    </div>
  )
}
