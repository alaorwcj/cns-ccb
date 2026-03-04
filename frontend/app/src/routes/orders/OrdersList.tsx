import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth } from '../../store/auth'
import Modal from '../../components/Modal'
import ReceiptUpload from '../../components/ReceiptUpload'

type StatusBadgeProps = { status: string }
function StatusBadge({ status }: StatusBadgeProps) {
  const colors = {
    PENDENTE: 'bg-yellow-100 text-yellow-800',
    APROVADO: 'bg-blue-100 text-blue-800',
    ENTREGUE: 'bg-green-100 text-green-800',
    CANCELADO: 'bg-red-100 text-red-800',
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
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const pageSize = 30
  
  // Filtros de data
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateUntil, setDateUntil] = useState<string>('')
  
  // Filtro por igreja
  const [churches, setChurches] = useState<any[]>([])
  const [filterChurchId, setFilterChurchId] = useState<string>('')
  
  // Batch printing state
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [printingBatch, setPrintingBatch] = useState(false)
  
  // WhatsApp sending state
  const [sendingWhatsApp, setSendingWhatsApp] = useState<number | null>(null)
  
  const sendWhatsApp = async (orderId: number) => {
    setSendingWhatsApp(orderId)
    try {
      await api.post(`/orders/${orderId}/whatsapp`)
      alert('WhatsApp enviado com sucesso!')
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Erro ao enviar WhatsApp')
    } finally {
      setSendingWhatsApp(null)
    }
  }
  
  // Carregar igrejas para o filtro
  const loadChurches = async () => {
    try {
      const r = await api.get('/churches?limit=500')
      setChurches(r.data.data || r.data || [])
    } catch (e) {
      console.error('Erro ao carregar igrejas', e)
    }
  }

  const load = async (page: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      let url = `/orders?page=${page}&limit=${pageSize}`
      if (dateFrom) url += `&date_from=${dateFrom}`
      if (dateUntil) url += `&date_until=${dateUntil}`
      if (filterChurchId) url += `&church_id=${filterChurchId}`
      
      const r = await api.get(url)
      setOrders(r.data.data || [])
      setTotalOrders(r.data.total || 0)
      setTotalPages(Math.ceil((r.data.total || 0) / pageSize))
      setCurrentPage(page)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1); loadChurches(); }, [])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      load(page)
    }
  }

  const handleStatusFilterChange = (status: string) => {
    setFilterStatus(status)
    // Note: For now, client-side filtering. Could be moved to server-side if needed
  }

  const approve = async (id: number) => {
    // show confirm modal
    setConfirm({ id, action: 'approve' })
  }

  const deliver = async (id: number) => {
    setConfirm({ id, action: 'deliver' })
  }

  const cancel = async (id: number) => {
    setConfirm({ id, action: 'cancel' })
  }

  const [viewOrder, setViewOrder] = useState<any | null>(null)
  const [confirm, setConfirm] = useState<{ id: number; action: 'approve' | 'deliver' | 'cancel' } | null>(null)
  
  // Estado para foto do recibo na entrega
  const [deliveryPhoto, setDeliveryPhoto] = useState<File | null>(null)
  const [deliveryPhotoPreview, setDeliveryPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleDeliveryPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de arquivo inválido. Use JPG, PNG ou PDF.')
      return
    }
    
    // Validar tamanho (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Tamanho máximo: 10MB.')
      return
    }
    
    setDeliveryPhoto(file)
    
    // Criar preview se for imagem
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setDeliveryPhotoPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setDeliveryPhotoPreview(null)
    }
  }
  
  const clearDeliveryPhoto = () => {
    setDeliveryPhoto(null)
    setDeliveryPhotoPreview(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const doConfirm = async () => {
    if (!confirm) return
    try {
      if (confirm.action === 'approve') await api.put(`/orders/${confirm.id}/approve`)
      if (confirm.action === 'deliver') {
        // Se tem foto, faz upload primeiro
        if (deliveryPhoto) {
          setUploadingPhoto(true)
          try {
            const formData = new FormData()
            formData.append('file', deliveryPhoto)
            await api.post(`/orders/${confirm.id}/receipt-upload`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            })
          } finally {
            setUploadingPhoto(false)
          }
        }
        // Confirma entrega
        await api.put(`/orders/${confirm.id}/deliver`)
        clearDeliveryPhoto()
      }
      if (confirm.action === 'cancel') await api.put(`/orders/${confirm.id}/cancel`)
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

  // Open view modal (backend now provides product_name on items)
  const openViewOrder = (o: any) => {
    setViewOrder(o)
  }

  // Batch selection handlers
  const toggleSelectOrder = (id: number) => {
    const newSelected = new Set(selectedOrders)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedOrders(newSelected)
  }

  const selectAllDelivered = () => {
    const deliveredIds = orders.filter(o => o.status === 'ENTREGUE').map(o => o.id)
    setSelectedOrders(new Set(deliveredIds))
  }

  const selectAllApproved = () => {
    const approvedIds = orders.filter(o => o.status === 'APROVADO').map(o => o.id)
    setSelectedOrders(new Set(approvedIds))
  }

  const clearSelection = () => {
    setSelectedOrders(new Set())
  }

  const printBatch = async () => {
    if (selectedOrders.size === 0) {
      alert('Selecione pelo menos um pedido para imprimir')
      return
    }
    
    const newWin = window.open('', '_blank')
    setPrintingBatch(true)
    try {
      const orderIds = Array.from(selectedOrders)
      const r = await api.post('/orders/batch-receipts', { order_ids: orderIds }, { responseType: 'blob' })
      const blob = new Blob([r.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      if (newWin) {
        newWin.location.href = url
      } else {
        window.open(url, '_blank')
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 10000)
      clearSelection()
    } catch (e: any) {
      if (newWin) newWin.close()
      alert(e?.response?.data?.detail || 'Falha ao gerar recibos em lote')
    } finally {
      setPrintingBatch(false)
    }
  }

  const filteredOrders = filterStatus === 'all' ? orders : orders.filter((o: any) => o.status === filterStatus)

  return (
    <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow min-w-0">
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center flex-wrap gap-2">
        <div className="font-semibold">Pedidos</div>
        <div className="flex gap-2 items-center flex-wrap">
          {role === 'ADM' && selectedOrders.size > 0 && (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">{selectedOrders.size} selecionado(s)</span>
              <button 
                onClick={printBatch} 
                disabled={printingBatch}
                className={`px-3 py-1 rounded text-white text-xs font-medium ${printingBatch ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {printingBatch ? 'Gerando...' : 'Imprimir Selecionados'}
              </button>
              <button onClick={clearSelection} className="px-2 py-1 border rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700">Limpar</button>
            </div>
          )}
          {role === 'ADM' && selectedOrders.size === 0 && (
            <>
              <button onClick={selectAllApproved} className="px-2 py-1 border rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700">Selecionar Aprovados</button>
              <button onClick={selectAllDelivered} className="px-2 py-1 border rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700">Selecionar Entregues</button>
            </>
          )}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="all">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="APROVADO">Aprovado</option>
            <option value="ENTREGUE">Entregue</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
          {role === 'ADM' && (
            <select 
              value={filterChurchId} 
              onChange={e => { setFilterChurchId(e.target.value); setTimeout(() => load(1), 100); }}
              className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">Todas as igrejas</option>
              {churches.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.city}</option>
              ))}
            </select>
          )}
          <div className="flex gap-2 items-center">
            <label className="text-sm font-medium">De:</label>
            <input 
              type="date" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <label className="text-sm font-medium">Até:</label>
            <input 
              type="date" 
              value={dateUntil}
              onChange={(e) => setDateUntil(e.target.value)}
              className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600"
            />
            <button 
              onClick={() => load(1)} 
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Filtrar
            </button>
            {(dateFrom || dateUntil || filterChurchId) && (
              <button 
                onClick={() => { setDateFrom(''); setDateUntil(''); setFilterChurchId(''); setTimeout(() => load(1), 100); }}
                className="px-2 py-1 border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <div className="p-4 text-red-600">{error}</div>}
      <div className="p-0">
        <div className="block sm:hidden p-3">
          {filteredOrders.map((o) => (
            <div key={o.id} className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow p-3 mb-3">
              <div className="flex justify-between items-center">
                <div className="font-medium">Pedido #{o.id}</div>
                <div><StatusBadge status={o.status} /></div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">Igreja: {o.church_name || `#${o.church_id}`}</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Cidade: {o.church_city || '-'}</div>
              <div className="text-sm sm:text-right text-left text-indigo-600 dark:text-indigo-400 mt-2 font-semibold">Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                (o.items || []).reduce((acc: number, it: any) => acc + Number(it.subtotal || it.unit_price || 0), 0)
              )}</div>
              {/* Items list removed from compact card view; use 'Ver' para detalhes */}
            </div>
          ))}
        </div>
        <div className="hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr className="text-left">
              {role === 'ADM' && <th className="p-3 w-12"></th>}
              <th className="p-3">#</th>
              <th className="p-3">Igreja</th>
              <th className="p-3">Cidade</th>
              <th className="p-3">Status</th>
              {/* Coluna 'Itens' removida conforme solicitação */}
              <th className="p-3">Data</th>
              <th className="p-3 text-right">Total</th>
              <th className="p-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.length === 0 && (
              <tr>
                <td colSpan={role === 'ADM' ? 8 : 7} className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum pedido encontrado</td>
              </tr>
            )}
            {filteredOrders.map((o: any) => (
              <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {role === 'ADM' && (
                  <td className="p-3">
                    {(o.status === 'APROVADO' || o.status === 'ENTREGUE') && (
                      <input 
                        type="checkbox" 
                        checked={selectedOrders.has(o.id)}
                        onChange={() => toggleSelectOrder(o.id)}
                        className="w-4 h-4"
                      />
                    )}
                  </td>
                )}
                <td className="p-3 font-mono text-xs">
                  {o.id}
                  {o.signed_receipt_path && (
                    <span className="ml-1 text-green-600" title="Recibo assinado anexado">📎</span>
                  )}
                </td>
                <td className="p-3 font-medium min-w-0"><div className="truncate">{o.church_name || `Igreja #${o.church_id}`}</div></td>
                <td className="p-3 text-gray-600 dark:text-gray-300 min-w-0"><div className="truncate">{o.church_city || '-'}</div></td>
                <td className="p-3"><StatusBadge status={o.status} /></td>
                {/* Coluna de itens removida da listagem; detalhes via modal */}
                <td className="p-3 text-xs text-gray-600 dark:text-gray-300">
                  {new Date(o.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-3 font-semibold text-right text-indigo-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  (o.items || []).reduce((acc: number, it: any) => acc + Number(it.subtotal || it.unit_price || 0), 0)
                )}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 text-xs" onClick={() => openViewOrder(o)}>Ver</button>
                    {o.status === 'PENDENTE' && (
                      <button className="px-2 py-1 rounded bg-white dark:bg-gray-700 dark:text-white border dark:border-gray-600 text-xs" onClick={() => startEdit(o)}>Editar</button>
                    )}
                    {role === 'ADM' && o.status === 'PENDENTE' && (
                      <button className="px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium" onClick={() => approve(o.id)}>Aprovar</button>
                    )}
                    {role === 'ADM' && o.status === 'APROVADO' && (
                      <>
                        <button className="px-2 py-1 rounded bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border border-orange-300 dark:border-orange-700 text-xs" onClick={() => startEdit(o)}>Editar</button>
                        <button className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-medium" onClick={() => deliver(o.id)}>Entregar</button>
                        <button className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium" onClick={() => cancel(o.id)}>Cancelar</button>
                        <button
                          className={`inline-block px-3 py-1 rounded text-white text-xs font-medium ${downloadingId === o.id ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                          onClick={() => downloadReceipt(o.id)}
                          disabled={downloadingId === o.id}
                        >
                          {downloadingId === o.id ? 'Baixando...' : 'Recibo'}
                        </button>
                      </>
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
                    {role === 'ADM' && o.whatsapp_phone && (
                      <button
                        onClick={() => sendWhatsApp(o.id)}
                        disabled={sendingWhatsApp === o.id}
                        className={`px-2 py-1 rounded text-white text-xs font-medium ${sendingWhatsApp === o.id ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
                        title="Enviar via WhatsApp"
                      >
                        {sendingWhatsApp === o.id ? 'Enviando...' : '📱 Zap'}
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
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostrando {orders.length} de {totalOrders} pedidos
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Anterior
            </button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                if (pageNum > totalPages) return null
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 border rounded text-sm ${
                      pageNum === currentPage 
                        ? 'bg-blue-600 text-white border-blue-600' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
      {viewOrder && (
        <Modal title={`Pedido #${viewOrder.id}`} onClose={() => setViewOrder(null)}>
          <div>
            <div className="mb-2 text-sm"><strong>Resumo do Pedido</strong></div>
            <div className="mb-2"><strong>Número:</strong> {viewOrder.id}</div>
            <div className="mb-2"><strong>Igreja:</strong> {viewOrder.church_name || viewOrder.church?.name || `Igreja #${viewOrder.church_id}`}</div>
            <div className="mb-2"><strong>Status:</strong> {viewOrder.status}</div>

            <div className="mb-2">
              <strong>Itens:</strong>
              <ul className="list-disc ml-6">
                {viewOrder.items?.map((it: any) => (
                  <li key={it.id} className="text-sm">
                    {it.product_name ? it.product_name : `Produto #${it.product_id}`} × {it.qty}
                    {it.unit_price != null && (
                      <span className="text-xs text-gray-600"> — {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(it.unit_price))}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* total do pedido (soma de subtotais quando disponível) */}
            {viewOrder.items && viewOrder.items.length > 0 && (
              <div className="mt-2 mb-2 font-semibold text-right text-indigo-600">Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                viewOrder.items.reduce((acc: number, it: any) => acc + (Number(it.subtotal || (it.unit_price || 0)) ), 0)
              )}</div>
            )}

            {/* Upload recibo assinado */}
            <ReceiptUpload 
              orderId={viewOrder.id} 
              currentReceipt={viewOrder.signed_receipt_path}
              onUploadSuccess={() => {
                load(currentPage)
                setViewOrder(null)
              }}
              isAdmin={role === 'ADM'}
            />

            <div className="flex gap-2 justify-end mt-4">
              <button className="px-3 py-1 border rounded" onClick={() => setViewOrder(null)}>Fechar</button>
            </div>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title={`Confirmação`} onClose={() => { setConfirm(null); clearDeliveryPhoto(); }}>
          <div>
            <p>
              {confirm.action === 'approve' && `Confirma a aprovação do pedido #${confirm.id}?`}
              {confirm.action === 'deliver' && `Confirma a entrega do pedido #${confirm.id}?`}
              {confirm.action === 'cancel' && (
                <>Confirma o <strong className="text-red-600">cancelamento</strong> do pedido #{confirm.id}? O estoque será restaurado automaticamente.</>
              )}
            </p>
            
            {/* Opção de câmera/foto na entrega */}
            {confirm.action === 'deliver' && (
              <div className="mt-4 p-3 border rounded bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
                <div className="font-medium text-sm mb-2">📷 Anexar foto do recibo (opcional)</div>
                
                {!deliveryPhoto ? (
                  <div className="flex gap-2 flex-wrap">
                    {/* Botão Câmera (mobile) */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                    >
                      📷 Tirar Foto
                    </button>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleDeliveryPhotoSelect}
                      className="hidden"
                    />
                    
                    {/* Botão Arquivo */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 flex items-center gap-1"
                    >
                      📁 Escolher Arquivo
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleDeliveryPhotoSelect}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deliveryPhotoPreview && (
                      <img 
                        src={deliveryPhotoPreview} 
                        alt="Preview" 
                        className="max-h-40 rounded border"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-600 dark:text-green-400">✓ {deliveryPhoto.name}</span>
                      <button
                        type="button"
                        onClick={clearDeliveryPhoto}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">Formatos: JPG, PNG, PDF (máx 10MB)</p>
              </div>
            )}
            
            <div className="mt-4 flex gap-2 justify-end">
              <button className="px-3 py-1 border rounded" onClick={() => { setConfirm(null); clearDeliveryPhoto(); }}>Não</button>
              <button 
                className={`px-3 py-1 text-white rounded ${confirm.action === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}
                onClick={doConfirm}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? 'Enviando...' : `Sim, ${confirm.action === 'cancel' ? 'Cancelar' : 'Confirmar'}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
