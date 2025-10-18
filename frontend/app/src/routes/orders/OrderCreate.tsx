import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'

function decodeUserIdFromJWT(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload?.user_id || null
  } catch {
    return null
  }
}

export default function OrderCreate() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [churches, setChurches] = useState<any[]>([])
  const [filterCat, setFilterCat] = useState<number | 'all'>('all')
  const [items, setItems] = useState<Record<number, number>>({})
  const [churchId, setChurchId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [existingOrder, setExistingOrder] = useState<any | null>(null)

  const userId = decodeUserIdFromJWT(localStorage.getItem('access_token') || '')

  useEffect(() => {
    (async () => {
      try {
        const [cats, prods, chs, ordersRes] = await Promise.all([
          api.get('/categories'),
          api.get('/products?limit=100'),
          api.get('/churches'),
          api.get('/orders'),
        ])
        setCategories(cats.data)
        setProducts(prods.data.data || [])
        setChurches(chs.data)

        // Check if user has a pending order
        const userOrders = ordersRes.data || []
        const pendingOrder = userOrders.find((o: any) => o.status === 'PENDENTE' && o.requester_id === userId)

        if (pendingOrder) {
          setExistingOrder(pendingOrder)
          setChurchId(pendingOrder.church_id)
          const initialItems: Record<number, number> = {}
          pendingOrder.items.forEach((it: any) => {
            initialItems[it.product_id] = it.qty
          })
          setItems(initialItems)
        }
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  const filtered = useMemo(() => {
    return products.filter((p: any) => filterCat === 'all' || p.category_id === filterCat)
  }, [products, filterCat])

  const setQty = (id: number, qty: number) => {
    setItems((prev) => ({ ...prev, [id]: qty }))
  }

  const submit = async () => {
    setError(null)
    try {
      const chosen = Object.entries(items)
        .map(([pid, qty]) => ({ product_id: Number(pid), qty: Number(qty) }))
        .filter((it) => it.qty > 0)
      if (!churchId) throw new Error('Selecione a igreja')
      if (chosen.length === 0) throw new Error('Selecione ao menos 1 item')

      if (existingOrder) {
        // Update existing order
        await api.put(`/orders/${existingOrder.id}`, { church_id: churchId, items: chosen })
        alert('Pedido atualizado')
      } else {
        // Create new order
        await api.post('/orders', { church_id: churchId, items: chosen })
        alert('Pedido criado')
      }
      navigate('/orders')
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Falha ao salvar pedido')
    }
  }

  if (loading) return <div>Carregando...</div>
  return (
    <div className="grid gap-4">
      {error && <div className="text-red-600">{error}</div>}
      {existingOrder && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="text-blue-800 font-medium">Editando Pedido Pendente</div>
          <div className="text-blue-600 text-sm">Pedido #{existingOrder.id} - Criado em {new Date(existingOrder.created_at).toLocaleDateString('pt-BR')}</div>
        </div>
      )}
      <div className="flex gap-2 items-center">
        <select className="border rounded px-2 py-1" value={filterCat}
          onChange={(e) => setFilterCat(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">Todas categorias</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="border rounded px-2 py-1" value={churchId} onChange={(e) => setChurchId(Number(e.target.value))}>
          <option value="">Selecione a igreja</option>
          {churches.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.city}</option>)}
        </select>
        <button className="bg-blue-600 text-white rounded px-3 py-1" onClick={submit}>
          {existingOrder ? 'Atualizar Pedido' : 'Confirmar Pedido'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((p: any) => {
          const disabled = (p.stock_qty || 0) === 0
          const qty = items[p.id] || 0
          return (
            <div key={p.id} className="bg-white rounded shadow p-3">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-xs text-gray-600 truncate">Estoque: {p.stock_qty}  {p.unit}</div>
              <div className="mt-2 flex gap-2 items-center">
                <input type="number" min={0} max={p.stock_qty} disabled={disabled}
                  className="border rounded px-2 py-1 w-24"
                  value={qty}
                  onChange={(e) => setQty(p.id, Math.max(0, Math.min(parseInt(e.target.value || '0'), p.stock_qty)))} />
                {disabled && <span className="text-xs text-red-600">Sem estoque</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
