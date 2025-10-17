import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { useAuth } from '../../store/auth'
import Modal from '../../components/Modal'

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
    // show confirm modal
    setConfirm({ id, action: 'approve' })
  }

  const deliver = async (id: number) => {
    setConfirm({ id, action: 'deliver' })
  }

  const [viewOrder, setViewOrder] = useState<any | null>(null)
  const [confirm, setConfirm] = useState<{ id: number; action: 'approve' | 'deliver' } | null>(null)
  const [editOrder, setEditOrder] = useState<any | null>(null)

  const doConfirm = async () => {
    if (!confirm) return
    try {
      if (confirm.action === 'approve') await api.put(`/orders/${confirm.id}/approve`)
      if (confirm.action === 'deliver') await api.put(`/orders/${confirm.id}/deliver`)
      setConfirm(null)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha na operação')
    }
  }

  const startEdit = (o: any) => {
    setEditOrder(o)
  }

  const saveEdit = async (payload: any) => {
    try {
      await api.put(`/orders/${payload.id}`, payload)
      setEditOrder(null)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao atualizar pedido')
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
                    <button className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs" onClick={() => setViewOrder(o)}>Ver</button>
                    {o.status === 'PENDENTE' && o.requester_id === Number(localStorage.getItem('user_id')) && (
                      <button className="px-2 py-1 rounded bg-white border text-xs" onClick={() => startEdit(o)}>Editar</button>
                    )}
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
      {viewOrder && (
        <Modal title={`Pedido #${viewOrder.id}`} onClose={() => setViewOrder(null)}>
          <div>
            <div className="mb-2"><strong>Igreja:</strong> {viewOrder.church?.name}</div>
            <div className="mb-2"><strong>Status:</strong> {viewOrder.status}</div>
            <div className="mb-2">
              <strong>Itens:</strong>
              <ul className="list-disc ml-6">
                {viewOrder.items?.map((it: any) => (
                  <li key={it.id}>{it.product?.name || it.product_id} × {it.qty} — R$ {it.unit_price}</li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 border rounded" onClick={() => setViewOrder(null)}>Fechar</button>
            </div>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title={`Confirmação`} onClose={() => setConfirm(null)}>
          <div>
            <p>Confirma a ação <strong>{confirm.action}</strong> para pedido #{confirm.id}?</p>
            <div className="mt-4 flex gap-2 justify-end">
              <button className="px-3 py-1 border rounded" onClick={() => setConfirm(null)}>Cancelar</button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={doConfirm}>Confirmar</button>
            </div>
          </div>
        </Modal>
      )}
      {editOrder && (
        <Modal title={`Editar Pedido #${editOrder.id}`} onClose={() => setEditOrder(null)}>
          <EditOrderForm order={editOrder} onSave={saveEdit} onCancel={() => setEditOrder(null)} />
        </Modal>
      )}
    </div>
  )
}

function EditOrderForm({ order, onSave, onCancel }: any) {
  const [items, setItems] = useState(() => {
    const map: Record<number, number> = {}
    (order.items || []).forEach((it: any) => { map[it.product_id] = it.qty })
    return map
  })
  const [products, setProducts] = useState<any[]>([])
  useEffect(() => { (async () => { const r = await api.get('/products'); setProducts(r.data) })() }, [])

  const setQty = (pid: number, qty: number) => setItems((p) => ({ ...p, [pid]: qty }))

  const submit = () => {
    const chosen = Object.entries(items).map(([pid, qty]) => ({ product_id: Number(pid), qty: Number(qty) })).filter((it) => it.qty > 0)
    onSave({ id: order.id, church_id: order.church_id, items: chosen })
  }

  return (
    <div>
      <div className="grid gap-2 max-h-64 overflow-auto">
        {products.map((p) => (
          <div key={p.id} className="flex justify-between items-center">
            <div>{p.name} <span className="text-xs text-gray-500">(est: {p.stock_qty})</span></div>
            <input type="number" min={0} max={p.stock_qty} value={items[p.id] || 0} onChange={(e) => setQty(p.id, Math.max(0, Math.min(parseInt(e.target.value||'0'), p.stock_qty)))} className="w-20 border rounded px-2 py-1" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2 justify-end">
        <button className="px-3 py-1 border rounded" onClick={onCancel}>Cancelar</button>
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={submit}>Salvar</button>
      </div>
    </div>
  )
}
