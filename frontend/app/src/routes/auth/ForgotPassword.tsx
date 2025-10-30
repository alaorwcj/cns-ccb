import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await api.post('/auth/reset/init', { email })
      setSent(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Falha ao solicitar reset de senha')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="h-3 bg-blue-600 w-full" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded shadow p-6">
            <div className="text-center">
              <div className="text-green-600 text-5xl mb-4">📧</div>
              <h2 className="text-xl font-bold mb-3">Email Enviado!</h2>
              <p className="text-gray-600 mb-4">
                Se o email <strong>{email}</strong> estiver cadastrado, você receberá as instruções para redefinir sua senha.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Próximos passos:</strong>
                </p>
                <ul className="text-sm text-blue-700 text-left space-y-1">
                  <li>• Verifique sua caixa de entrada</li>
                  <li>• Clique no link recebido por email</li>
                  <li>• Defina sua nova senha</li>
                  <li>• O link expira em 24 horas</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <Link 
                  to="/reset-confirm" 
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 transition-colors"
                >
                  Já tenho o código de reset
                </Link>
                
                <Link 
                  to="/login" 
                  className="block w-full border border-gray-300 hover:bg-gray-50 text-gray-700 rounded px-4 py-2 transition-colors"
                >
                  Voltar ao Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="h-3 bg-blue-600 w-full" />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded shadow p-6">
          <div className="text-center mb-6">
            <img src="/ccb.png" className="h-16 mb-3 mx-auto" alt="CCB" />
            <h2 className="text-xl font-bold">Esqueceu sua Senha?</h2>
            <p className="text-gray-600 text-sm mt-2">
              Digite seu email para receber instruções de reset
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full border rounded px-3 py-2"
                placeholder="Digite seu email cadastrado"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded px-4 py-2 font-medium transition-colors"
            >
              {loading ? 'Enviando...' : 'Solicitar Reset de Senha'}
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
    </div>
  )
}