import { useEffect, useState } from 'react'
import { api } from '../../services/api'

export default function Dashboard() {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) return <div>Carregando...</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded shadow">
        <div className="text-sm text-gray-500">Pedidos em aberto</div>
        <div className="text-3xl font-semibold">{data.pedidos_abertos}</div>
      </div>
      <div className="bg-white p-4 rounded shadow">
        <div className="text-sm text-gray-500">Média saída mensal (R$)</div>
        <div className="text-3xl font-semibold">{data.medias_saida_mensal}</div>
      </div>
      <div className="bg-white p-4 rounded shadow md:col-span-2">
        <div className="text-sm text-gray-500 mb-2">Total em estoque (R$)</div>
        <div className="text-2xl font-semibold">{data.total_estoque_em_rs}</div>
      </div>
      <div className="bg-white p-4 rounded shadow md:col-span-2">
        <div className="font-semibold mb-2">Baixo estoque</div>
        <ul className="list-disc pl-6">
          {data.low_stock.map((p: any) => (
            <li key={p.id}>{p.name} — {p.stock_qty} (min {p.low_stock_threshold})</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
