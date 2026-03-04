import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../services/api'

type InventoryItem = {
  id: number
  product_id: number
  product_name: string
  expected_qty: number
  counted_qty: number | null
  difference: number | null
  adjusted: boolean
}

type Inventory = {
  id: number
  created_at: string
  created_by_name: string
  status: 'EM_ANDAMENTO' | 'FINALIZADO'
  notes?: string
  finalized_at?: string
  items: InventoryItem[]
}

export default function InventoryCount() {
  const { id } = useParams<{ id: string }>()
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<number | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const [pendingCounts, setPendingCounts] = useState<Record<number, number>>({})
  const navigate = useNavigate()
  const saveTimeoutRef = React.useRef<Record<number, NodeJS.Timeout>>({})

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.get(`/inventory/${id}`)
      setInventory(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar inventário')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const updateCount = async (itemId: number, countedQty: number) => {
    setSaving(itemId)
    setError(null)

    try {
      await api.put(`/inventory/${id}/items/${itemId}`, {
        counted_qty: countedQty
      })
      // Atualiza apenas o item específico no estado local
      setInventory(prev => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map(item => 
            item.id === itemId 
              ? { 
                  ...item, 
                  counted_qty: countedQty,
                  difference: countedQty - item.expected_qty 
                }
              : item
          )
        }
      })
      setPendingCounts(prev => {
        const newCounts = { ...prev }
        delete newCounts[itemId]
        return newCounts
      })
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao atualizar contagem')
    } finally {
      setSaving(null)
    }
  }

  const handleInputChange = (itemId: number, value: string) => {
    const qty = value === '' ? 0 : parseInt(value)
    
    // Atualiza o estado local imediatamente
    setPendingCounts(prev => ({ ...prev, [itemId]: qty }))
    
    // Limpa o timeout anterior se existir
    if (saveTimeoutRef.current[itemId]) {
      clearTimeout(saveTimeoutRef.current[itemId])
    }
    
    // Salva após 1 segundo de inatividade
    if (!isNaN(qty) && qty >= 0) {
      saveTimeoutRef.current[itemId] = setTimeout(() => {
        updateCount(itemId, qty)
      }, 1000)
    }
  }

  const finalize = async () => {
    const uncounted = inventory?.items.filter(i => i.counted_qty === null).length || 0
    
    if (uncounted > 0) {
      if (!window.confirm(`Existem ${uncounted} item(ns) não contados. Deseja finalizar mesmo assim?`)) {
        return
      }
    } else {
      if (!window.confirm('Finalizar inventário e ajustar estoque automaticamente?')) {
        return
      }
    }

    setFinalizing(true)
    setError(null)

    try {
      await api.post(`/inventory/${id}/finalize`)
      alert('Inventário finalizado! Estoque ajustado automaticamente.')
      navigate('/inventory')
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao finalizar inventário')
    } finally {
      setFinalizing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded shadow p-8 text-center">
        <div className="text-gray-500">Carregando inventário...</div>
      </div>
    )
  }

  if (!inventory) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded shadow p-8">
        <div className="text-red-600">Inventário não encontrado</div>
        <button
          onClick={() => navigate('/inventory')}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded"
        >
          Voltar
        </button>
      </div>
    )
  }

  const isFinalized = inventory.status === 'FINALIZADO'
  const counted = inventory.items.filter(i => i.counted_qty !== null).length
  const total = inventory.items.length
  const progress = total > 0 ? Math.round((counted / total) * 100) : 0

  const totalDifference = inventory.items.reduce((sum, item) => {
    return sum + (item.difference || 0)
  }, 0)

  return (
    <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow">
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="font-semibold text-xl">Inventário #{inventory.id}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Criado em {new Date(inventory.created_at).toLocaleDateString('pt-BR')} por {inventory.created_by_name}
            </p>
            {inventory.notes && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{inventory.notes}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/inventory')}
              className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Voltar
            </button>
            {!isFinalized && (
              <button
                onClick={finalize}
                disabled={finalizing}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {finalizing ? 'Finalizando...' : '✅ Finalizar Inventário'}
              </button>
            )}
          </div>
        </div>

        {!isFinalized && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progresso: {counted} de {total} produtos contados</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {isFinalized && (
          <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded p-3">
            <div className="text-green-800 dark:text-green-200 font-semibold">
              ✅ Inventário Finalizado
            </div>
            <div className="text-sm text-green-700 dark:text-green-300 mt-1">
              Finalizado em {inventory.finalized_at && new Date(inventory.finalized_at).toLocaleDateString('pt-BR')}
              {' - '}
              Diferença total: {totalDifference > 0 ? '+' : ''}{totalDifference} unidades
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900 border-b border-red-200 dark:border-red-700">
          <div className="text-red-600 dark:text-red-200">{error}</div>
        </div>
      )}

      <div className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr className="text-left">
                <th className="p-3">Produto</th>
                <th className="p-3 text-right">Esperado</th>
                <th className="p-3 text-right">Contado</th>
                <th className="p-3 text-right">Diferença</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-3 font-medium">{item.product_name || `Produto #${item.product_id}`}</td>
                  <td className="p-3 text-right text-gray-600 dark:text-gray-400">{item.expected_qty}</td>
                  <td className="p-3 text-right">
                    {isFinalized ? (
                      <span className="font-semibold">{item.counted_qty ?? '-'}</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={pendingCounts[item.id] !== undefined ? pendingCounts[item.id] : (item.counted_qty ?? '')}
                        onChange={(e) => handleInputChange(item.id, e.target.value)}
                        disabled={saving === item.id}
                        placeholder="0"
                        className="w-24 px-2 py-1 border rounded text-right dark:bg-gray-700 dark:border-gray-600"
                      />
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {item.difference !== null ? (
                      <span className={`font-semibold ${
                        item.difference > 0 ? 'text-green-600' : 
                        item.difference < 0 ? 'text-red-600' : 
                        'text-gray-600'
                      }`}>
                        {item.difference > 0 ? '+' : ''}{item.difference}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    {saving === item.id ? (
                      <span className="text-xs text-blue-600">Salvando...</span>
                    ) : item.adjusted ? (
                      <span className="text-xs text-green-600">✓ Ajustado</span>
                    ) : item.counted_qty !== null ? (
                      <span className="text-xs text-blue-600">✓ Contado</span>
                    ) : (
                      <span className="text-xs text-gray-400">Pendente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isFinalized && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded">
            <h3 className="font-semibold mb-2">Resumo dos Ajustes</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {inventory.items.filter(i => (i.difference || 0) > 0).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Produtos com Sobra</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {inventory.items.filter(i => (i.difference || 0) < 0).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Produtos com Falta</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {inventory.items.filter(i => i.difference === 0).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Produtos Corretos</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
