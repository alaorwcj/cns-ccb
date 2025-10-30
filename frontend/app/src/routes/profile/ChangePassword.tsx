import { useState } from 'react'
import { api } from '../../services/api'

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError('A nova senha e confirmação não coincidem')
      return
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      })
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Falha ao trocar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md bg-white rounded shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Trocar Senha</h2>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Senha Atual *</label>
          <input
            type="password"
            required
            className="w-full border rounded px-3 py-2"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Digite sua senha atual"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Nova Senha *</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full border rounded px-3 py-2"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Digite a nova senha (mín. 6 caracteres)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirmar Nova Senha *</label>
          <input
            type="password"
            required
            className="w-full border rounded px-3 py-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Digite novamente a nova senha"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded border border-green-200">
            ✅ Senha alterada com sucesso!
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded px-4 py-2 font-medium transition-colors"
        >
          {loading ? 'Alterando...' : 'Trocar Senha'}
        </button>
      </form>

      <div className="mt-4 text-xs text-gray-500">
        <p>• A nova senha deve ter pelo menos 6 caracteres</p>
        <p>• Você precisará fazer login novamente após trocar a senha</p>
      </div>
    </div>
  )
}