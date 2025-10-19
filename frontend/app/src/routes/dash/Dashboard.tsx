import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
import { useAuth } from '../../store/auth'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { CardGrid } from '../../components/CardGrid'
import { ChartWrapper } from '../../components/ChartWrapper'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

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

export default function Dashboard() {
  const { role } = useAuth()
  const [data, setData] = useState<any | null>(null)
  const [executiveData, setExecutiveData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = role === 'ADM'

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)

      // Carregar dados básicos para todos os usuários
      const basicResponse = await api.get('/dash/overview')
      setData(basicResponse.data)

      // Carregar dados executivos apenas para ADM
      if (isAdmin) {
        const executiveResponse = await api.get('/reports/dashboard')
        setExecutiveData(executiveResponse.data)
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })
  const integer = new Intl.NumberFormat('pt-BR')

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-gray-600">Carregando dashboard...</span>
    </div>
  )

  if (error) return (
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

  // Dashboard Executivo para ADM
  if (isAdmin && executiveData) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-6">Dashboard Executivo</h2>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📦</div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{executiveData.kpis.total_products}</div>
                <div className="text-sm text-gray-600">Total de Produtos</div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📊</div>
              <div>
                <div className="text-2xl font-bold text-green-600">{executiveData.kpis.total_stock_quantity}</div>
                <div className="text-sm text-gray-600">Total em Estoque</div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-6 rounded-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">📋</div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{executiveData.kpis.total_orders_month}</div>
                <div className="text-sm text-gray-600">Pedidos (30 dias)</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 p-6 rounded-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⏳</div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{executiveData.kpis.pending_orders}</div>
                <div className="text-sm text-gray-600">Pedidos Pendentes</div>
              </div>
            </div>
          </div>

          <div className="bg-red-50 p-6 rounded-lg">
            <div className="flex items-center">
              <div className="text-2xl mr-3">⚠️</div>
              <div>
                <div className="text-2xl font-bold text-red-600">{executiveData.kpis.low_stock_alerts}</div>
                <div className="text-sm text-gray-600">Produtos com Estoque Baixo</div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 p-6 rounded-lg">
            <div className="flex items-center">
              <img src="/casa.png" alt="Igrejas" className="h-8 w-8 mr-3 object-contain" />
              <div>
                <div className="text-2xl font-bold text-indigo-600">{executiveData.kpis.active_churches}</div>
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
              {executiveData.charts.orders_by_month.slice(-6).map((item) => (
                <div key={item.month} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {new Date(item.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </span>
                  <div className="flex items-center">
                    <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((item.count / Math.max(...executiveData.charts.orders_by_month.map(x => x.count))) * 100, 100)}%`
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
              {executiveData.charts.top_products.slice(0, 5).map((product, index) => (
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
            {executiveData.charts.stock_by_category.map((category) => (
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

  // Dashboard básico para usuários comuns
  if (!data) return null

  return (
    <div className="space-y-6">
      <CardGrid>
        <div className="bg-sky-600 text-white p-4 rounded shadow min-w-0 w-full overflow-hidden h-full flex flex-col justify-between">
          <div className="text-sm opacity-90">Pedidos em aberto</div>
          <div className="text-fluidTitle font-extrabold mt-3 leading-tight truncate">{integer.format(data.pedidos_abertos)}</div>
        </div>
        <div className="bg-emerald-600 text-white p-4 rounded shadow min-w-0 w-full overflow-hidden h-full flex flex-col justify-between">
          <div className="text-sm opacity-90">Média saída mensal</div>
          <div className="text-fluidTitle font-extrabold mt-3 leading-tight truncate">{currency.format(Number(data.medias_saida_mensal || 0))}</div>
        </div>
        <div className="bg-amber-600 text-white p-4 rounded shadow min-w-0 w-full overflow-hidden h-full flex flex-col justify-between">
          <div className="text-sm opacity-90">Total em estoque</div>
          <div className="text-fluidTitle font-extrabold mt-3 leading-tight truncate">{currency.format(Number(data.total_estoque_em_rs || 0))}</div>
        </div>
      </CardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 dark:text-gray-100 p-0 rounded shadow overflow-hidden flex flex-col min-w-0">
          <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
            <div className="font-semibold">Baixo estoque</div>
          </div>
          <div className="p-4 flex-1 min-w-0">
            <div className="grid grid-cols-1 gap-3">
              {data.low_stock.length === 0 && <div className="text-sm text-gray-500 dark:text-gray-400">Nenhum item com baixo estoque</div>}
              {data.low_stock.slice(0, 8).map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm items-center py-2 border-b last:border-b-0 min-w-0">
                  <div className="truncate max-w-full pr-4 text-sm leading-relaxed">{p.name}</div>
                  <div className="text-gray-600 dark:text-gray-300 text-sm">{integer.format(p.stock_qty)} <span className="text-xs text-gray-400 dark:text-gray-500">(min {integer.format(p.low_stock_threshold)})</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-gray-800 dark:text-gray-100 p-0 rounded shadow overflow-hidden flex flex-col min-w-0">
          <div className="bg-white dark:bg-gray-800 p-4 border-b dark:border-gray-700">
            <div className="font-semibold">Resumo rápido</div>
          </div>
          <div className="p-4 flex-1">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Pedidos abertos: <strong className="text-gray-900 dark:text-white">{integer.format(data.pedidos_abertos)}</strong></div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">Média saída/mês: <strong className="text-gray-900 dark:text-white">{currency.format(Number(data.medias_saida_mensal || 0))}</strong></div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Valor em estoque: <strong className="text-gray-900 dark:text-white">{currency.format(Number(data.total_estoque_em_rs || 0))}</strong></div>
            <div className="mt-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Saída mensal (últimos 12 meses)</div>
              <div className="w-full">
                <ChartWrapper
                  data={{
                    labels: data.monthly_labels,
                    datasets: [
                      {
                        label: 'Saída (R$)',
                        data: (data.monthly_out || []).map((v: any) => Number(v)),
                        fill: true,
                        backgroundColor: 'rgba(59,130,246,0.12)',
                        borderColor: 'rgba(59,130,246,1)',
                        tension: 0.3,
                        pointRadius: 2,
                      },
                    ],
                  }}
                  options={{
                    plugins: { legend: { display: false } },
                    layout: { padding: 0 },
                    scales: { y: { ticks: { callback: (val: any) => currency.format(Number(val)) } } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
