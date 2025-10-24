import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface ChurchData {
  summary: {
    total_churches: number
    active_churches: number
    inactive_churches: number
    total_orders: number
  }
  churches: Array<{
    church_id: number
    name: string
    total_orders: number
    total_quantity: number
    last_order: string | null
    avg_order_size: number
    status: string
  }>
}

export default function ChurchesReport(): JSX.Element {
  const [data, setData] = useState<ChurchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await api.get('/reports/churches')
      setData(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!data) return

    const headers = ['Igreja', 'Total Pedidos', 'Quantidade Total', 'Último Pedido', 'Tamanho Médio', 'Status']
    const rows = data.churches.map(church => [
      church.name,
      church.total_orders,
      church.total_quantity,
      church.last_order ? new Date(church.last_order).toLocaleDateString('pt-BR') : '',
      church.avg_order_size,
      church.status
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `igrejas_${new Date().toISOString().split('T')[0]}.csv`
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
        <h2 className="text-xl font-semibold">Relatório de Igrejas</h2>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
        >
          📊 Exportar CSV
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{data.summary.total_churches}</div>
          <div className="text-sm text-gray-600">Total de Igrejas</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{data.summary.active_churches}</div>
          <div className="text-sm text-gray-600">Igrejas Ativas</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-600">{data.summary.inactive_churches}</div>
          <div className="text-sm text-gray-600">Igrejas Inativas</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{data.summary.total_orders}</div>
          <div className="text-sm text-gray-600">Total de Pedidos</div>
        </div>
      </div>

      {/* Ranking de igrejas */}
      <div className="bg-white border rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="text-lg font-medium text-gray-900">Ranking de Igrejas por Atividade</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Posição</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Igreja</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pedidos</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Média/Pedido</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Último Pedido</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.churches
                .sort((a, b) => b.total_orders - a.total_orders)
                .map((church, index) => (
                <tr key={church.church_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">#{index + 1}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">{church.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{church.total_orders}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{church.total_quantity}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{church.avg_order_size.toFixed(1)}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {church.last_order ? new Date(church.last_order).toLocaleDateString('pt-BR') : 'Nunca'}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      church.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {church.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gráfico de distribuição */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Distribuição por Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Igrejas Ativas</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-3 mr-3">
                  <div
                    className="bg-green-600 h-3 rounded-full"
                    style={{
                      width: data.summary.total_churches > 0
                        ? `${(data.summary.active_churches / data.summary.total_churches) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-green-600">{data.summary.active_churches}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Igrejas Inativas</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-3 mr-3">
                  <div
                    className="bg-gray-400 h-3 rounded-full"
                    style={{
                      width: data.summary.total_churches > 0
                        ? `${(data.summary.inactive_churches / data.summary.total_churches) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-600">{data.summary.inactive_churches}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top 5 Igrejas</h3>
          <div className="space-y-3">
            {data.churches
              .sort((a, b) => b.total_orders - a.total_orders)
              .slice(0, 5)
              .map((church, index) => (
              <div key={church.church_id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">#{index + 1}</span>
                  <span className="text-sm text-gray-700 truncate max-w-32">{church.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-600">{church.total_orders} pedidos</div>
                  <div className="text-xs text-gray-500">{church.total_quantity} itens</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}