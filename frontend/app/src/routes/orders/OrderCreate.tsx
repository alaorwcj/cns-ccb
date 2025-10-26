import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'

function decodeRoleFromJWT(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload?.role || null
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

  const role = decodeRoleFromJWT(localStorage.getItem('access_token') || '')

  useEffect(() => {
    (async () => {
      try {
        const [cats, prods, chs] = await Promise.all([
          api.get('/categories'),
          api.get('/products?limit=100'),
          // fetch either all churches (for admin) or only user's assigned churches
          (async () => {
            const role = decodeRoleFromJWT(localStorage.getItem('access_token') || '')
            if (role === 'ADM') return api.get('/churches')
            return api.get('/churches/mine')
          })(),
        ])
        setCategories(cats.data)
        setProducts(prods.data.data || [])
        // normalize churches payload (some endpoints return array directly)
        const fetchedChurches = chs.data?.data ?? chs.data
        setChurches(fetchedChurches || [])
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

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
      // frontend guard: ensure non-admin users can only pick assigned churches
      if (role !== 'ADM') {
        const allowedIds = (churches || []).map((c: any) => c.id)
        if (!allowedIds.includes(Number(churchId))) {
          throw new Error('Igreja inválida para o seu usuário')
        }
      }
      if (chosen.length === 0) throw new Error('Selecione ao menos 1 item')

      // Always create a new order
      await api.post('/orders', { church_id: churchId, items: chosen })
      alert('Pedido criado')
      navigate('/orders')
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Falha ao salvar pedido')
    }
  }

  if (loading) return <div>Carregando...</div>
  return (
    <div className="grid gap-4">
      {error && <div className="text-red-600">{error}</div>}
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
        {role !== 'ADM' && (churches || []).length === 0 && (
          <div className="text-sm text-yellow-600">Você não possui igrejas atribuídas.</div>
        )}
        <button className="bg-blue-600 text-white rounded px-3 py-1" onClick={submit}>
          Confirmar Pedido
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
