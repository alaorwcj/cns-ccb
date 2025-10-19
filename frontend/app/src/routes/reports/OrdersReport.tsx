import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface OrderData {
  summary: {
    total_orders: number
    pending_orders: number
    delivered_orders: number
    total_quantity: number
    period_start: string | null
    period_end: string | null
  }
  orders: Array<{
    order_id: number
    church_name: string
    created_at: string
    status: string
    total_items: number
    total_quantity: number
  }>
  top_products: Array<{
    name: string
    quantity: number
    orders: number
  }>
}

export default function OrdersReport(): JSX.Element {
  const [data, setData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      if (status) params.append('status', status)

      const response = await api.get(`/reports/orders?${params}`)
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
    setStatus('')
    loadReport()
  }

  const exportToCSV = () => {
    if (!data) return

    const headers = ['ID Pedido', 'Igreja', 'Data', 'Status', 'Itens', 'Quantidade Total']
    const rows = data.orders.map(order => [
      order.order_id,
      order.church_name,
      new Date(order.created_at).toLocaleDateString('pt-BR'),
      order.status,
      order.total_items,
      order.total_quantity
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `pedidos_${new Date().toISOString().split('T')[0]}.csv`
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
        <h2 className="text-xl font-semibold">Relatório de Pedidos</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="APROVADO">Aprovado</option>
              <option value="ENTREGUE">Entregue</option>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{data.summary.total_orders}</div>
          <div className="text-sm text-gray-600">Total de Pedidos</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{data.summary.pending_orders}</div>
          <div className="text-sm text-gray-600">Pedidos Pendentes</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{data.summary.delivered_orders}</div>
          <div className="text-sm text-gray-600">Pedidos Entregues</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{data.summary.total_quantity}</div>
          <div className="text-sm text-gray-600">Quantidade Total</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela de pedidos */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <h3 className="text-lg font-medium text-gray-900">Pedidos Recentes</h3>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Igreja</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qtd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.orders.slice(0, 10).map((order) => (
                  <tr key={order.order_id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">#{order.order_id}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 truncate max-w-32">{order.church_name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'ENTREGUE' ? 'bg-green-100 text-green-800' : 
                        order.status === 'APROVADO' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status === 'ENTREGUE' ? 'Entregue' : 
                         order.status === 'APROVADO' ? 'Aprovado' :
                         'Pendente'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 font-medium">{order.total_quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top produtos */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Produtos Mais Solicitados</h3>
          <div className="space-y-3">
            {data.top_products.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">#{index + 1}</span>
                  <span className="text-sm text-gray-700 truncate max-w-40">{product.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">{product.quantity}</div>
                  <div className="text-xs text-gray-500">{product.orders} pedidos</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}