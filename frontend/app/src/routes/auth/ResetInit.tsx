import { useState } from 'react'
import { api } from '../../services/api'
import Layout from '../../components/Layout'
import { useAuth } from '../../store/auth'

export default function ResetInit() {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [expires, setExpires] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const role = useAuth((s) => s.role)

  const submit = async () => {
    setError(null)
    try {
      const r = await api.post('/auth/reset/init', { email })
      setToken(r.data.token)
      setExpires(r.data.expires_at)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Falha ao iniciar reset')
    }
  }

  return (
    <Layout>
      <div className="max-w-xl bg-white rounded shadow p-4">
        <div className="font-semibold mb-3">Reset de senha (ADM)</div>
        <div className="grid gap-2">
          <input className="w-full border rounded px-3 py-2" placeholder="E-mail do usuário" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="w-full sm:w-auto bg-blue-600 text-white rounded px-4 py-2" onClick={submit}>Gerar token de reset</button>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          {token && (
            <div className="mt-3 text-sm">
              <div className="font-semibold">Token gerado (compartilhe por canal seguro):</div>
              <code className="break-all bg-gray-100 px-2 py-1 rounded inline-block w-full">{token}</code>
              {expires && <div className="text-gray-600">Expira em: {new Date(expires).toLocaleString()}</div>}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
