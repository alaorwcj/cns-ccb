import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

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

  // track which order id is currently being downloaded
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const downloadReceipt = async (id: number) => {
    // open a blank tab first to avoid popup blockers, user action allows it
    const newWin = window.open('', '_blank')
    setDownloadingId(id)
    try {
      const r = await api.get(`/orders/${id}/receipt`, { responseType: 'blob' })
      const blob = new Blob([r.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      if (newWin) {
        // navigate the already-opened tab to the blob URL
        newWin.location.href = url
      } else {
        // fallback: open in current tab
        window.open(url, '_blank')
      }
      // revoke after a delay
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
    } catch (e: any) {
      if (newWin) newWin.close()
      alert(e?.response?.data?.detail || 'Falha ao baixar recibo')
    } finally {
      setDownloadingId(null)
    }
  }

  const startEdit = (o: any) => {
    navigate(`/orders/${o.id}/edit`)
  }

  if (loading) return <div>Carregando...</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow min-w-0">
      <div className="p-4 border-b font-semibold dark:border-gray-700">Pedidos</div>
      {error && <div className="p-4 text-red-600">{error}</div>}
      <div className="p-0">
        <div className="block sm:hidden p-3">
          {orders.map((o) => (
            <div key={o.id} className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow p-3 mb-3">
              <div className="flex justify-between items-center">
                <div className="font-medium">Pedido #{o.id}</div>
                <div><StatusBadge status={o.status} /></div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">Igreja: {o.church?.name || `#${o.church_id}`}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Itens: {o.items?.slice(0,3).map((it:any)=>it.product?.name||it.product_id).join(', ')}</div>
            </div>
          ))}
        </div>
        <div className="hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
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
                <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum pedido encontrado</td>
              </tr>
            )}
            {orders.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="p-3 font-mono text-xs">{o.id}</td>
                <td className="p-3 font-medium min-w-0"><div className="truncate">{o.church_name || `Igreja #${o.church_id}`}</div></td>
                <td className="p-3 text-gray-600 dark:text-gray-300 min-w-0"><div className="truncate">{o.church?.city || '-'}</div></td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
                <td className="p-3 min-w-0">
                  <div className="text-xs space-y-1">
                    {o.items?.slice(0, 3).map((it: any, idx: number) => (
                      <div key={idx}>{it.product?.name || `Produto #${it.product_id}`} × {it.qty}</div>
                    ))}
                    {o.items?.length > 3 && (
                      <div className="text-gray-500 dark:text-gray-400">+ {o.items.length - 3} mais...</div>
                    )}
                  </div>
                </td>
                <td className="p-3 text-xs text-gray-600 dark:text-gray-300">
                  {new Date(o.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 text-xs" onClick={() => setViewOrder(o)}>Ver</button>
                    {o.status === 'PENDENTE' && o.requester_id === Number(localStorage.getItem('user_id')) && (
                      <button className="px-2 py-1 rounded bg-white dark:bg-gray-700 dark:text-white border dark:border-gray-600 text-xs" onClick={() => startEdit(o)}>Editar</button>
                    )}
                    {role === 'ADM' && o.status === 'PENDENTE' && (
                      <button className="px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium" onClick={() => approve(o.id)}>Aprovar</button>
                    )}
                    {role === 'ADM' && o.status === 'APROVADO' && (
                      <button className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-medium" onClick={() => deliver(o.id)}>Entregar</button>
                    )}
                    {role === 'ADM' && o.status === 'ENTREGUE' && (
                      <button
                        className={`inline-block px-3 py-1 rounded text-white text-xs font-medium ${downloadingId === o.id ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        onClick={() => downloadReceipt(o.id)}
                        disabled={downloadingId === o.id}
                      >
                        {downloadingId === o.id ? 'Baixando...' : 'Recibo'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        </div>
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
    </div>
  )
}
