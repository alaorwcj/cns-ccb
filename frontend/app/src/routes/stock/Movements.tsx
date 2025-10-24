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
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalMovements, setTotalMovements] = useState(0)
  const pageSize = 10

  const load = async (page: number = 1) => {
    console.log('Loading movements for page:', page)
    setLoading(true)
    setError(null)
    try {
      const r = await api.get(`/stock/movements?page=${page}&limit=${pageSize}`)
      console.log('API response:', r.data)
      const movementsData = Array.isArray(r.data.data) ? r.data.data : []
      setMovs(movementsData)
      setTotalMovements(r.data.total || 0)
      setTotalPages(Math.ceil((r.data.total || 0) / pageSize))
      setCurrentPage(page)
    } catch (err: any) {
      console.error('Error loading movements:', err)
      setMovs([])
      setError(err?.response?.data?.detail || 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    load(1)
    return () => { mounted = false }
  }, [])

  const filtered = Array.isArray(movs) && filterType === 'all' ? movs : (Array.isArray(movs) ? movs.filter((m: any) => m.type === filterType) : [])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      load(page)
    }
  }

  const handleTypeFilterChange = (type: string) => {
    setFilterType(type)
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="min-w-0">
      {showForm && <StockMovementForm onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); load(currentPage) }} />}

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
          <div key={m.id} className="p-3 border rounded min-w-0">
            <div className="flex justify-between items-start">
              <div className="min-w-0">
                <div className="font-medium truncate">{m.product?.name || `Produto #${m.product_id}`}</div>
              </div>
              <div className="font-mono ml-2">{m.qty}</div>
            </div>
            <div className="text-xs text-gray-500 truncate">{m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : ''}</div>
            <div className="mt-1 text-xs"><MovementTypeBadge type={m.type} /></div>
          </div>
        ))}
      </div>

      {/* Controles de paginação */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>

          <span className="text-sm">
            Página {currentPage} de {totalPages} ({totalMovements} total)
          </span>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  )
}
