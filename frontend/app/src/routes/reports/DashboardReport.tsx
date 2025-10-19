import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface DashboardData {
  kpis: {
    total_products: number
    total_stock_quantity: number
    total_orders_month: number
    pending_orders: number
    low_stock_alerts: number
    active_churches: number
  }
  charts: {
    orders_by_month: Array<{ month: string; count: number }>
    stock_by_category: Array<{ category: string; stock: number }>
    top_products: Array<{ name: string; ordered: number }>
  }
}

export default function DashboardReport(): JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const response = await api.get('/reports/dashboard')
      setData(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">❌ Erro ao carregar dashboard</div>
        <div className="text-gray-600">{error}</div>
        <button
          onClick={loadDashboard}
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
      <h2 className="text-xl font-semibold mb-6">Dashboard Executivo</h2>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📦</div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{data.kpis.total_products}</div>
              <div className="text-sm text-gray-600">Total de Produtos</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📊</div>
            <div>
              <div className="text-2xl font-bold text-green-600">{data.kpis.total_stock_quantity}</div>
              <div className="text-sm text-gray-600">Total em Estoque</div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📋</div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{data.kpis.total_orders_month}</div>
              <div className="text-sm text-gray-600">Pedidos (30 dias)</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⏳</div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{data.kpis.pending_orders}</div>
              <div className="text-sm text-gray-600">Pedidos Pendentes</div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⚠️</div>
            <div>
              <div className="text-2xl font-bold text-red-600">{data.kpis.low_stock_alerts}</div>
              <div className="text-sm text-gray-600">Produtos com Estoque Baixo</div>
            </div>
          </div>
        </div>

        <div className="bg-indigo-50 p-6 rounded-lg">
          <div className="flex items-center">
            <img src="/casa.png" alt="Igrejas" className="h-8 w-8 mr-3 object-contain" />
            <div>
              <div className="text-2xl font-bold text-indigo-600">{data.kpis.active_churches}</div>
              <div className="text-sm text-gray-600">Igrejas Ativas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos por mês */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Pedidos por Mês</h3>
          <div className="space-y-2">
            {data.charts.orders_by_month.slice(-6).map((item) => (
              <div key={item.month} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {new Date(item.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center">
                  <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((item.count / Math.max(...data.charts.orders_by_month.map(x => x.count))) * 100, 100)}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top produtos */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Produtos Mais Solicitados</h3>
          <div className="space-y-3">
            {data.charts.top_products.slice(0, 5).map((product, index) => (
              <div key={product.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 mr-2">#{index + 1}</span>
                  <span className="text-sm text-gray-700 truncate">{product.name}</span>
                </div>
                <span className="text-sm font-medium text-blue-600">{product.ordered}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Estoque por categoria */}
      <div className="mt-6 bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Estoque por Categoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.charts.stock_by_category.map((category) => (
            <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-sm font-medium text-gray-700">{category.category}</span>
              <span className="text-sm font-bold text-green-600">{category.stock}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}