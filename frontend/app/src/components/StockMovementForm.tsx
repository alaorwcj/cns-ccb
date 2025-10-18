import { useState, useEffect } from 'react'
import { api } from '../services/api'

type StockMovementFormProps = {
  onClose: () => void
  onSave: () => void
}

export default function StockMovementForm({ onClose, onSave }: StockMovementFormProps) {
  const [products, setProducts] = useState<any[]>([])
  const [formData, setFormData] = useState({
    product_id: '',
    type: 'ENTRADA',
    qty: '',
    note: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/products?limit=100') // Get all products for stock movements
        setProducts(r.data.data || [])
      } catch (e) {
        console.error('Erro ao carregar produtos', e)
      }
    })()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Validações
      if (!formData.product_id || formData.product_id === '') {
        throw new Error('Selecione um produto')
      }
      if (!formData.qty || Number(formData.qty) <= 0) {
        throw new Error('Quantidade deve ser maior que zero')
      }

      const payload = {
        product_id: Number(formData.product_id),
        type: formData.type,
        qty: Number(formData.qty),
        note: formData.note || null,
      }
      
      await api.post('/stock/movements', payload)
      onSave()
      onClose()
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Erro ao registrar movimentação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
  <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto min-w-0">
        <div className="p-6 min-w-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Nova Movimentação</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>
          
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Movimentação *</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="ENTRADA">Entrada (Adicionar estoque)</option>
                <option value="SAIDA_MANUAL">Saída Manual</option>
                <option value="PERDA">Perda / Descarte</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.type === 'ENTRADA' && '✅ Aumenta o estoque do produto'}
                {formData.type === 'SAIDA_MANUAL' && '⚠️ Diminui o estoque do produto'}
                {formData.type === 'PERDA' && '🗑️ Diminui o estoque (perda/descarte)'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Produto *</label>
              <select
                required
                className="w-full border rounded px-3 py-2"
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              >
                <option value="">Selecione um produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="truncate">
                    {p.name} (Estoque atual: {p.stock_qty} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quantidade *</label>
              <input
                type="number"
                min="1"
                required
                placeholder="Ex: 10"
                className="w-full border rounded px-3 py-2"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Observação</label>
              <textarea
                rows={3}
                placeholder="Motivo da movimentação, fornecedor, etc..."
                className="w-full border rounded px-3 py-2"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
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
                {loading ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
