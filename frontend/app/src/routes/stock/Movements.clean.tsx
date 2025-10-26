import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'
import StockMovementForm from '../../components/StockMovementForm'

// Versão limpa e mínima do componente Movements (mobile-first)
type Movement = any

function MovementTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    ENTRADA: 'Entrada',
    SAIDA_MANUAL: 'Saída Manual',
    SAIDA_PEDIDO: 'Saída Pedido',
    PERDA: 'Perda',
  }
  return <span className="px-2 py-1 rounded text-xs font-semibold">{map[type] || type}</span>
}

export default function Movements(): JSX.Element {
  const [movs, setMovs] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await api.get('/stock/movements')
        if (!mounted) return
        setMovs(r.data || [])
      } catch (err: any) {
        if (!mounted) return
        setError(err?.response?.data?.detail || 'Erro ao carregar')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const filtered = filterType === 'all' ? movs : movs.filter((m: any) => m.type === filterType)

  if (loading) return <div>Carregando...</div>

  return (
    <div>
      {showForm && <StockMovementForm onClose={() => setShowForm(false)} onSave={() => { setShowForm(false) }} />}

      <div className="mb-4 flex justify-between items-center">
        <h2 className="font-semibold">Movimentações de Estoque</h2>
        <div className="flex gap-2">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="all">Todos os tipos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA_MANUAL">Saída Manual</option>
            <option value="SAIDA_PEDIDO">Saída Pedido</option>
            <option value="PERDA">Perda</option>
          </select>
          <button onClick={() => setShowForm(true)} className="px-3 py-1 bg-blue-600 text-white rounded">+ Nova</button>
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      <div className="space-y-3">
        {filtered.length === 0 && <div className="text-gray-500">Nenhuma movimentação</div>}
        {filtered.map((m: any) => (
          <div key={m.id} className="p-3 border rounded">
            <div className="flex justify-between">
              <div className="font-medium">{m.product?.name || `Produto #${m.product_id}`}</div>
              <div className="font-mono">{m.qty}</div>
            </div>
            <div className="text-xs text-gray-500">{m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : ''}</div>
            <div className="mt-1 text-xs"><MovementTypeBadge type={m.type} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
