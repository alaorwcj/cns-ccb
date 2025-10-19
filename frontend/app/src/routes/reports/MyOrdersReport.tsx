import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface MyOrderData {
  orders: Array<{
    order_id: number
    created_at: string
    status: string
    total_items: number
    total_quantity: number
    items: Array<{
      product_name: string
      quantity: number
    }>
  }>
  total_orders: number
  pending_orders: number
}

export default function MyOrdersReport(): JSX.Element {
  const [data, setData] = useState<MyOrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null)

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await api.get('/reports/my-orders')
      setData(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  const toggleOrderDetails = (orderId: number) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando seus pedidos...</span>
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
        <h2 className="text-xl font-semibold">Meus Pedidos</h2>
        <p className="text-gray-600 mt-1">Histórico completo dos pedidos da sua igreja</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{data.total_orders}</div>
          <div className="text-sm text-gray-600">Total de Pedidos</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{data.pending_orders}</div>
          <div className="text-sm text-gray-600">Pedidos Pendentes</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{data.total_orders - data.pending_orders}</div>
          <div className="text-sm text-gray-600">Pedidos Concluídos</div>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="space-y-4">
        {data.orders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📦</div>
            <div>Nenhum pedido encontrado para sua igreja.</div>
          </div>
        ) : (
          data.orders.map((order) => (
            <div key={order.order_id} className="bg-white border rounded-lg overflow-hidden">
              {/* Header do pedido */}
              <div
                className="px-6 py-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                onClick={() => toggleOrderDetails(order.order_id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-lg font-semibold text-gray-900">
                    Pedido #{order.order_id}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    order.status === 'ENTREGUE' ? 'bg-green-100 text-green-800' : 
                    order.status === 'APROVADO' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status === 'ENTREGUE' ? 'Entregue' : 
                     order.status === 'APROVADO' ? 'Aprovado' :
                     'Pendente'}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                  <span>{order.total_quantity} itens</span>
                  <span className={`transform transition-transform ${expandedOrder === order.order_id ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {/* Detalhes do pedido */}
              {expandedOrder === order.order_id && (
                <div className="px-6 pb-4 border-t bg-gray-50">
                  <div className="py-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Itens do Pedido</h4>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                          <span className="text-sm text-gray-900">{item.product_name}</span>
                          <span className="text-sm font-medium text-blue-600">{item.quantity} un.</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}