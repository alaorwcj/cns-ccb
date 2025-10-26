import { useState, useEffect } from 'react'
import { api } from '../services/api'

type ProductFormProps = {
  product?: any
  onClose: () => void
  onSave: () => void
}

export default function ProductForm({ product, onClose, onSave }: ProductFormProps) {
  const [categories, setCategories] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    unit: '',
    price: '',
    stock_qty: '0',
    low_stock_threshold: '10',
    is_active: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/categories')
        setCategories(r.data)
      } catch (e) {
        console.error('Erro ao carregar categorias', e)
      }
    })()
  }, [])

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        category_id: product.category_id?.toString() || '',
        unit: product.unit || '',
        price: product.price?.toString() || '',
        stock_qty: product.stock_qty?.toString() || '0',
        low_stock_threshold: product.low_stock_threshold?.toString() || '10',
        is_active: product.is_active ?? true,
      })
    }
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload = {
        ...formData,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        price: Number(formData.price),
        stock_qty: Number(formData.stock_qty),
        low_stock_threshold: Number(formData.low_stock_threshold),
      }
      
      if (product) {
        await api.put(`/products/${product.id}`, payload)
      } else {
        await api.post('/products', payload)
      }
      onSave()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao salvar produto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>
          
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Produto *</label>
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
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">Sem categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unidade *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: UN, CX, KG"
                  className="w-full border rounded px-3 py-2"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Preço (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="w-full border rounded px-3 py-2"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estoque Atual</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border rounded px-3 py-2"
                  value={formData.stock_qty}
                  onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Estoque Mínimo</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border rounded px-3 py-2"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <label htmlFor="is_active" className="text-sm font-medium">Produto ativo</label>
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
