import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../../services/api'

export default function ResetConfirm() {
  const [searchParams] = useSearchParams()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get token from URL if present
    const urlToken = searchParams.get('token')
    if (urlToken) {
      setToken(urlToken)
    }
  }, [searchParams])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setOk(false)

    if (password !== confirmPassword) {
      setError('A senha e confirmação não coincidem')
      return
    }

    if (password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      await api.post('/auth/reset/confirm', { token, new_password: password })
      setOk(true)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Falha ao resetar senha')
    }
  }

  if (ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded shadow p-6">
          <div className="text-center">
            <div className="text-green-600 text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold mb-3">Senha Redefinida!</h2>
            <p className="text-gray-600 mb-4">
              Sua senha foi alterada com sucesso. Agora você pode fazer login com a nova senha.
            </p>
            <Link 
              to="/login" 
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition-colors"
            >
              Ir para Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded shadow p-6">
        <div className="text-center mb-6">
          <img src="/ccb.png" className="h-16 mb-3 mx-auto" alt="CCB" />
          <h2 className="text-xl font-bold">Redefinir Senha</h2>
          <p className="text-gray-600 text-sm mt-2">
            Digite o código recebido por email e sua nova senha
          </p>
        </div>
        
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="block text-sm font-medium mb-1">Código de Reset *</label>
            <input
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              placeholder="Cole aqui o código recebido por email"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Nova Senha *</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              placeholder="Digite sua nova senha (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirmar Nova Senha *</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              placeholder="Digite novamente a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
              {error}
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 font-medium transition-colors"
          >
            Redefinir Senha
          </button>
        </form>

        <div className="mt-6 pt-4 border-t text-center">
          <Link 
            to="/login" 
            className="text-blue-600 hover:text-blue-700 text-sm transition-colors"
          >
            ← Voltar ao Login
          </Link>
        </div>
      </div>
    </div>
  )
}
