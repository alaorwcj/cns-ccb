import { useState, useEffect } from 'react'
import { api } from '../services/api'

type UserFormProps = {
  user?: any
  onClose: () => void
  onSave: () => void
}

export default function UserForm({ user, onClose, onSave }: UserFormProps) {
  const [churches, setChurches] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'USUARIO',
    password: '',
    church_ids: [] as number[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/churches')
        setChurches(r.data)
      } catch (e) {
        console.error('Erro ao carregar igrejas', e)
      }
    })()
  }, [])

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'USUARIO',
        password: '',
        church_ids: user.churches?.map((c: any) => c.id) || [],
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role,
        church_ids: formData.church_ids,
      }
      
      // Só enviar senha se for preenchida
      if (formData.password) {
        payload.password = formData.password
      }
      
      if (user) {
        await api.put(`/users/${user.id}`, payload)
      } else {
        if (!formData.password) {
          setError('Senha é obrigatória para novos usuários')
          setLoading(false)
          return
        }
        await api.post('/users', payload)
      }
      onSave()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao salvar usuário')
    } finally {
      setLoading(false)
    }
  }

  const toggleChurch = (churchId: number) => {
    setFormData(prev => ({
      ...prev,
      church_ids: prev.church_ids.includes(churchId)
        ? prev.church_ids.filter(id => id !== churchId)
        : [...prev.church_ids, churchId]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{user ? 'Editar Usuário' : 'Novo Usuário'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>
          
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                className="w-full border rounded px-3 py-2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  required
                  className="w-full border rounded px-3 py-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Telefone</label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  className="w-full border rounded px-3 py-2"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nível de Acesso *</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="USUARIO">Usuário</option>
                  <option value="ADM">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Senha {user && <span className="text-xs text-gray-500">(deixe em branco para manter)</span>}
                  {!user && <span className="text-red-600">*</span>}
                </label>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={user ? "Deixe vazio para não alterar" : "Digite a senha"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Igrejas Responsáveis</label>
              <div className="border rounded p-3 max-h-48 overflow-y-auto space-y-2">
                {churches.length === 0 && (
                  <div className="text-sm text-gray-500">Nenhuma igreja cadastrada</div>
                )}
                {churches.map((church) => (
                  <label key={church.id} className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.church_ids.includes(church.id)}
                      onChange={() => toggleChurch(church.id)}
                    />
                    <span className="text-sm">{church.name} - {church.city}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.role === 'ADM' ? 'ADM tem acesso a todas as igrejas automaticamente' : 'Selecione as igrejas que este usuário poderá gerenciar'}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
