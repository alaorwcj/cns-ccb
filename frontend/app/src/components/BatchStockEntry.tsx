import React, { useEffect, useState } from 'react'
import { api } from '../services/api'

type Product = {
  id: number
  name: string
  stock_qty: number
  price: number
}

type BatchItem = {
  product_id: number
  qty: number
  unit_price: number
}

type Props = {
  onClose: () => void
  onSave: () => void
}

export default function BatchStockEntry({ onClose, onSave }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<BatchItem[]>([{ product_id: 0, qty: 1, unit_price: 0 }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/products?limit=100')
        const productsList = res.data.data || res.data || []
        setProducts(productsList)
      } catch (err: any) {
        console.error('Error loading products:', err)
        setError(err?.response?.data?.detail || 'Erro ao carregar produtos')
      }
    })()
  }, [])

  const addRow = () => {
    setItems([...items, { product_id: 0, qty: 1, unit_price: 0 }])
  }

  const removeRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof BatchItem, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    
    // Auto-fill price when product is selected
    if (field === 'product_id') {
      const product = products.find(p => p.id === Number(value))
      if (product && updated[index].unit_price === 0) {
        updated[index].unit_price = Number(product.price)
      }
    }
    
    setItems(updated)
  }

  const submit = async () => {
    setError(null)
    
    // Validation
    const validItems = items.filter(i => i.product_id > 0 && i.qty > 0 && i.unit_price > 0)
    if (validItems.length === 0) {
      setError('Adicione pelo menos um produto válido')
      return
    }
    
    setLoading(true)
    try {
      await api.post('/stock/batch-entry', {
        invoice_number: invoiceNumber || undefined,
        invoice_date: invoiceDate || undefined,
        note: note || undefined,
        items: validItems,
      })
      alert(`${validItems.length} produto(s) adicionado(s) ao estoque`)
      onSave()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao salvar entrada múltipla')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h3 className="font-semibold text-lg">Entrada Múltipla de Estoque</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {error && <div className="text-red-600 text-sm">{error}</div>}

          {/* Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Número da Nota Fiscal (opcional)</label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="NF-12345"
                className="border rounded px-3 py-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data da NF (opcional)</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Observação (opcional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Fornecedor, condições, etc..."
              rows={2}
              className="border rounded px-3 py-2 w-full"
            />
          </div>

          {/* Items Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium">Produtos</label>
              <button onClick={addRow} className="text-blue-600 hover:text-blue-700 text-sm">
                + Adicionar linha
              </button>
            </div>

            <div className="border rounded overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-2 text-left">Produto</th>
                    <th className="px-2 py-2 text-left w-24">Qtd</th>
                    <th className="px-2 py-2 text-left w-32">Preço Unit.</th>
                    <th className="px-2 py-2 text-left w-32">Subtotal</th>
                    <th className="px-2 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-2 py-2">
                        <select
                          value={item.product_id}
                          onChange={(e) => updateItem(index, 'product_id', Number(e.target.value))}
                          className="border rounded px-2 py-1 w-full text-sm"
                        >
                          <option value={0}>Selecione...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (R$ {Number(p.price).toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => updateItem(index, 'qty', Number(e.target.value))}
                          className="border rounded px-2 py-1 w-full text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                          className="border rounded px-2 py-1 w-full text-sm"
                        />
                      </td>
                      <td className="px-2 py-2 text-right font-mono text-sm">
                        R$ {(item.qty * item.unit_price).toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => removeRow(index)}
                          disabled={items.length === 1}
                          className="text-red-600 hover:text-red-700 disabled:text-gray-300"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2">
                  <tr>
                    <td colSpan={3} className="px-2 py-2 text-right font-semibold">Total:</td>
                    <td className="px-2 py-2 text-right font-mono font-semibold">
                      R$ {items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0).toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={submit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Salvando...' : 'Confirmar Entrada'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
