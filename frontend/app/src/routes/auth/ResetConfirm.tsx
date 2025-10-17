import { useState } from 'react'
import { api } from '../../services/api'

export default function ResetConfirm() {
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(false)
    try {
      await api.post('/auth/reset/confirm', { token, new_password: password })
      setOk(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Falha ao resetar senha')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded shadow p-6">
        <div className="text-xl font-semibold mb-4">Resetar senha</div>
        <form className="grid gap-3" onSubmit={submit}>
          <input className="border rounded px-3 py-2" placeholder="Token" value={token} onChange={e => setToken(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Nova senha" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {ok && <div className="text-green-700 text-sm">Senha alterada. Faça login.</div>}
          <button className="bg-blue-600 text-white rounded px-4 py-2">Confirmar</button>
        </form>
      </div>
    </div>
  )
}
