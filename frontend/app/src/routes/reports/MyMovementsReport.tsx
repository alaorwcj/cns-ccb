import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface MovementData {
  movements: Array<{
    movement_id: number
    product_name: string
    type: string
    quantity: number
    created_at: string
    order_id: number | null
  }>
  total_movements: number
}

export default function MyMovementsReport(): JSX.Element {
  const [data, setData] = useState<MovementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await api.get('/reports/my-movements')
      setData(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando movimentações...</span>
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
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Minhas Movimentações</h2>
        <p className="text-gray-600 mt-1">Histórico de saídas relacionadas aos seus pedidos</p>
      </div>

      {/* Resumo */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{data.total_movements}</div>
          <div className="text-sm text-gray-600">Total de Movimentações</div>
        </div>
      </div>

      {/* Lista de movimentações */}
      <div className="space-y-4">
        {data.movements.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📈</div>
            <div>Nenhuma movimentação encontrada para seus pedidos.</div>
          </div>
        ) : (
          data.movements.map((movement) => (
            <div key={movement.movement_id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{movement.product_name}</h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      Saída Pedido
                    </span>
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>
                      <strong>Quantidade:</strong> {movement.quantity} un.
                    </span>
                    <span>
                      <strong>Data:</strong> {new Date(movement.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    {movement.order_id && (
                      <span>
                        <strong>Pedido:</strong> #{movement.order_id}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-2xl mb-1">📦</div>
                  <div className="text-xs text-gray-500">Saída</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Timeline visual (opcional) */}
      {data.movements.length > 0 && (
        <div className="mt-8 bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Timeline de Movimentações</h3>
          <div className="space-y-4">
            {data.movements
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 10)
              .map((movement, index) => (
              <div key={movement.movement_id} className="flex items-center space-x-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  {index < data.movements.slice(0, 10).length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-300 mt-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="text-sm font-medium text-gray-900">
                    {movement.quantity} un. de {movement.product_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(movement.created_at).toLocaleDateString('pt-BR')} • Pedido #{movement.order_id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}