import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { useAuth } from '../../store/auth'

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
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">#</th>
            <th className="p-2">Igreja</th>
            <th className="p-2">Status</th>
            <th className="p-2">Itens</th>
            <th className="p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b">
              <td className="p-2">{o.id}</td>
              <td className="p-2">{o.church_id}</td>
              <td className="p-2">{o.status}</td>
              <td className="p-2">{o.items.map((it: any) => `${it.product_id} x${it.qty}`).join(', ')}</td>
              <td className="p-2 flex gap-2">
                {role === 'ADM' && o.status === 'PENDENTE' && (
                  <button className="px-2 py-1 rounded bg-yellow-500 text-white" onClick={() => approve(o.id)}>Aprovar</button>
                )}
                {role === 'ADM' && o.status === 'APROVADO' && (
                  <button className="px-2 py-1 rounded bg-green-600 text-white" onClick={() => deliver(o.id)}>Entregar</button>
                )}
                {role === 'ADM' && o.status === 'ENTREGUE' && (
                  <a className="px-2 py-1 rounded bg-blue-600 text-white" href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/orders/${o.id}/receipt`} target="_blank" rel="noreferrer">Recibo</a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
