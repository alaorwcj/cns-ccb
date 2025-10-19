import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface StockMovementData {
  summary: {
    total_entries: number
    total_manual_exits: number
    total_order_exits: number
    total_losses: number
    net_movement: number
    period_start: string | null
    period_end: string | null
  }
  movements: Array<{
    product_id: number
    product_name: string
    type: string
    total_quantity: number
    movement_count: number
    last_movement: string | null
  }>
  total_products: number
}

export default function StockMovementsReport(): JSX.Element {
  const [data, setData] = useState<StockMovementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [movementType, setMovementType] = useState('')

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      if (movementType) params.append('movement_type', movementType)

      const response = await api.get(`/reports/stock-movements?${params}`)
      setData(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    loadReport()
  }

  const clearFilters = () => {
    setStartDate('')
    setEndDate('')
    setMovementType('')
    loadReport()
  }

  const exportToCSV = () => {
    if (!data) return

    const headers = ['Produto', 'Tipo', 'Quantidade Total', 'Nº Movimentações', 'Última Movimentação']
    const rows = data.movements.map(movement => [
      movement.product_name,
      movement.type,
      movement.total_quantity,
      movement.movement_count,
      movement.last_movement ? new Date(movement.last_movement).toLocaleDateString('pt-BR') : ''
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `movimentacoes_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando relatório...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">❌ Erro ao carregar relatório</div>
        <div className="text-gray-600">{error}</div>
        <button
          onClick={loadReport}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Relatório de Movimentações de Estoque</h2>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
        >
          📊 Exportar CSV
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Movimento</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA_MANUAL">Saída Manual</option>
              <option value="SAIDA_PEDIDO">Saída Pedido</option>
              <option value="PERDA">Perda</option>
            </select>
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Filtrar
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{data.summary.total_entries}</div>
          <div className="text-sm text-gray-600">Entradas</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{data.summary.total_manual_exits}</div>
          <div className="text-sm text-gray-600">Saídas Manuais</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{data.summary.total_order_exits}</div>
          <div className="text-sm text-gray-600">Saídas Pedidos</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{data.summary.total_losses}</div>
          <div className="text-sm text-gray-600">Perdas</div>
        </div>
        <div className={`p-4 rounded-lg text-center ${data.summary.net_movement >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className={`text-2xl font-bold ${data.summary.net_movement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.summary.net_movement}
          </div>
          <div className="text-sm text-gray-600">Saldo Líquido</div>
        </div>
      </div>

      {/* Tabela de movimentações */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantidade Total</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nº Movimentações</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Última Movimentação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.movements.map((movement) => (
              <tr key={`${movement.product_id}-${movement.type}`} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-900">{movement.product_name}</td>
                <td className="px-4 py-2 text-sm text-gray-900">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    movement.type === 'ENTRADA' ? 'bg-green-100 text-green-800' :
                    movement.type === 'SAIDA_MANUAL' ? 'bg-blue-100 text-blue-800' :
                    movement.type === 'SAIDA_PEDIDO' ? 'bg-purple-100 text-purple-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {movement.type}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 font-medium">{movement.total_quantity}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{movement.movement_count}</td>
                <td className="px-4 py-2 text-sm text-gray-900">
                  {movement.last_movement ? new Date(movement.last_movement).toLocaleDateString('pt-BR') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.movements.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhum movimento encontrado para os filtros aplicados.
        </div>
      )}
    </div>
  )
}