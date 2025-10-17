import { useState, useEffect } from 'react'
import { api } from '../services/api'

type ChurchFormProps = {
  church?: any
  onClose: () => void
  onSave: () => void
}

export default function ChurchForm({ church, onClose, onSave }: ChurchFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    city: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (church) {
      setFormData({
        name: church.name || '',
        city: church.city || '',
      })
    }
  }, [church])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (church) {
        await api.put(`/churches/${church.id}`, formData)
      } else {
        await api.post('/churches', formData)
      }
      onSave()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao salvar igreja')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{church ? 'Editar Igreja' : 'Nova Igreja'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>
          
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome da Igreja *</label>
              <input
                type="text"
                required
                placeholder="Ex: Igreja Central"
                className="w-full border rounded px-3 py-2"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cidade *</label>
              <input
                type="text"
                required
                placeholder="Ex: Santa Isabel"
                className="w-full border rounded px-3 py-2"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
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
