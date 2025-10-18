import { useEffect, useRef, useState } from 'react'
import { api } from '../../services/api'
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
import { Line } from 'react-chartjs-2'

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

export default function Dashboard() {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const chartRef = useRef<any>(null)
  const [isSmall, setIsSmall] = useState<boolean>(false)

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/dash/overview')
        setData(r.data)
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Erro ao carregar dashboard')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    const onResize = () => {
      setIsSmall(window.innerWidth < 640)
      // trigger chart update if already mounted
      if (chartRef.current && chartRef.current.update) chartRef.current.update()
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })
  const integer = new Intl.NumberFormat('pt-BR')

  useEffect(() => {
    // create gradient once the chart and data are available
    if (!chartRef.current || !data) return
    try {
      const chart = chartRef.current
      const ctx = chart.ctx || (chart.chart && chart.chart.ctx)
      const height = chart.height || (chart.chart && chart.chart.height) || 200
      if (!ctx) return
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      grad.addColorStop(0, 'rgba(59,130,246,0.35)')
      grad.addColorStop(1, 'rgba(59,130,246,0.04)')
      if (chart.data && chart.data.datasets && chart.data.datasets[0]) {
        chart.data.datasets[0].backgroundColor = grad
        // adjust point radius for small screens
        chart.data.datasets[0].pointRadius = isSmall ? 0 : 2
        chart.update()
      }
    } catch (e) {
      // ignore gradient errors
    }
  }, [data, isSmall])

  if (loading) return <div>Carregando...</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="col-span-1 sm:col-span-1 bg-sky-600 text-white p-4 sm:p-5 rounded shadow min-w-0 w-full">
          <div className="text-sm opacity-90">Pedidos em aberto</div>
          <div className="text-2xl md:text-3xl font-extrabold mt-3 leading-tight truncate">{integer.format(data.pedidos_abertos)}</div>
        </div>
          <div className="col-span-1 sm:col-span-1 bg-emerald-600 text-white p-4 sm:p-5 rounded shadow min-w-0 w-full">
          <div className="text-sm opacity-90">Média saída mensal</div>
          <div className="text-2xl md:text-3xl font-extrabold mt-3 leading-tight truncate">{currency.format(Number(data.medias_saida_mensal || 0))}</div>
        </div>
          <div className="col-span-1 sm:col-span-1 bg-amber-600 text-white p-4 sm:p-5 rounded shadow min-w-0 w-full">
          <div className="text-sm opacity-90">Total em estoque</div>
          <div className="text-2xl md:text-3xl font-extrabold mt-3 leading-tight truncate">{currency.format(Number(data.total_estoque_em_rs || 0))}</div>
        </div>
      </div>

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
              <div className="w-full h-44 md:h-56 lg:h-72">
                <Line
                  ref={chartRef}
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
                    responsive: true,
                    maintainAspectRatio: false,
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
