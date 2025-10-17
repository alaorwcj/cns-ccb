import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { useAuth } from '../../store/auth'

type StatusBadgeProps = { status: string }
function StatusBadge({ status }: StatusBadgeProps) {
  const colors = {
    PENDENTE: 'bg-yellow-100 text-yellow-800',
    APROVADO: 'bg-blue-100 text-blue-800',
    ENTREGUE: 'bg-green-100 text-green-800',
  }
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

export default function OrdersList() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const role = useAuth((s) => s.role)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.get('/orders')
      setOrders(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const approve = async (id: number) => {
    try {
      await api.put(`/orders/${id}/approve`)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao aprovar')
    }
  }

  const deliver = async (id: number) => {
    try {
      await api.put(`/orders/${id}/deliver`)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao entregar')
    }
  }

  if (loading) return <div>Carregando...</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div className="bg-white rounded shadow">
      <div className="p-4 border-b font-semibold">Pedidos</div>
      {error && <div className="p-4 text-red-600">{error}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">#</th>
              <th className="p-3">Igreja</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">Status</th>
              <th className="p-3">Itens</th>
              <th className="p-3">Data</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">Nenhum pedido encontrado</td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{o.id}</td>
                <td className="p-3 font-medium">{o.church?.name || `Igreja #${o.church_id}`}</td>
                <td className="p-3 text-gray-600">{o.church?.city || '-'}</td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
                <td className="p-3">
                  <div className="text-xs space-y-1">
                    {o.items?.slice(0, 3).map((it: any, idx: number) => (
                      <div key={idx}>{it.product?.name || `Produto #${it.product_id}`} × {it.qty}</div>
                    ))}
                    {o.items?.length > 3 && (
                      <div className="text-gray-500">+ {o.items.length - 3} mais...</div>
                    )}
                  </div>
                </td>
                <td className="p-3 text-xs text-gray-600">
                  {new Date(o.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {role === 'ADM' && o.status === 'PENDENTE' && (
                      <button className="px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium" onClick={() => approve(o.id)}>Aprovar</button>
                    )}
                    {role === 'ADM' && o.status === 'APROVADO' && (
                      <button className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-medium" onClick={() => deliver(o.id)}>Entregar</button>
                    )}
                    {role === 'ADM' && o.status === 'ENTREGUE' && (
                      <a className="inline-block px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium" href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/orders/${o.id}/receipt`} target="_blank" rel="noreferrer">Recibo</a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
