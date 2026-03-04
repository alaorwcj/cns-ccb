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
  const [cart, setCart] = useState<Record<number, number>>({})
  const [churchId, setChurchId] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const role = decodeRoleFromJWT(localStorage.getItem('access_token') || '')

  useEffect(() => {
    (async () => {
      try {
        const [cats, prods, chs] = await Promise.all([
          api.get('/categories'),
          api.get('/products?limit=500'),
          (async () => {
            const role = decodeRoleFromJWT(localStorage.getItem('access_token') || '')
            if (role === 'ADM') return api.get('/churches')
            return api.get('/churches/mine')
          })(),
        ])
        setCategories(cats.data)
        setProducts(prods.data.data || [])
        const fetchedChurches = chs.data?.data ?? chs.data
        setChurches(fetchedChurches || [])
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // Filtrar produtos por categoria e busca
  const filtered = useMemo(() => {
    return products.filter((p: any) => {
      const matchCategory = filterCat === 'all' || p.category_id === filterCat
      const matchSearch = searchTerm === '' || p.name.toLowerCase().includes(searchTerm.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [products, filterCat, searchTerm])

  // Itens no carrinho com detalhes
  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([pid, qty]) => {
        const product = products.find((p: any) => p.id === Number(pid))
        return product ? { ...product, qty } : null
      })
      .filter(Boolean)
  }, [cart, products])

  // Total do carrinho
  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item: any) => {
      return sum + (Number(item.price || 0) * item.qty)
    }, 0)
  }, [cartItems])

  const cartQtyTotal = useMemo(() => {
    return cartItems.reduce((sum, item: any) => sum + item.qty, 0)
  }, [cartItems])

  // Adicionar ao carrinho
  const addToCart = (productId: number, qty: number = 1) => {
    const product = products.find((p: any) => p.id === productId)
    if (!product) return
    
    const currentQty = cart[productId] || 0
    const maxQty = product.max_qty_per_order && product.max_qty_per_order > 0 
      ? Math.min(product.stock_qty, product.max_qty_per_order) 
      : product.stock_qty
    const newQty = Math.min(currentQty + qty, maxQty)
    setCart((prev) => ({ ...prev, [productId]: newQty }))
  }

  // Remover do carrinho
  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const newCart = { ...prev }
      delete newCart[productId]
      return newCart
    })
  }

  // Atualizar quantidade no carrinho
  const updateCartQty = (productId: number, qty: number) => {
    const product = products.find((p: any) => p.id === productId)
    if (!product) return
    
    const maxQty = product.max_qty_per_order && product.max_qty_per_order > 0 
      ? Math.min(product.stock_qty, product.max_qty_per_order) 
      : product.stock_qty
    
    if (qty <= 0) {
      removeFromCart(productId)
    } else {
      setCart((prev) => ({ ...prev, [productId]: Math.min(qty, maxQty) }))
    }
  }

  // Limpar carrinho
  const clearCart = () => {
    setCart({})
  }

  const submit = async () => {
    setError(null)
    try {
      if (!churchId) throw new Error('Selecione a igreja')
      if (cartItems.length === 0) throw new Error('Adicione ao menos 1 item ao carrinho')
      
      // Validar igreja para não-admin
      if (role !== 'ADM') {
        const allowedIds = (churches || []).map((c: any) => c.id)
        if (!allowedIds.includes(Number(churchId))) {
          throw new Error('Igreja inválida para o seu usuário')
        }
      }

      const items = cartItems.map((item: any) => ({
        product_id: item.id,
        qty: item.qty
      }))

      setSubmitting(true)
      await api.post('/orders', { church_id: churchId, items })
      alert('Pedido criado com sucesso!')
      navigate('/orders')
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Falha ao criar pedido')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  // Calcular mês de entrega
  const now = new Date()
  const deliveryMonth = now.getMonth() + 1
  const deliveryYear = deliveryMonth > 11 ? now.getFullYear() + 1 : now.getFullYear()
  const actualDeliveryMonth = deliveryMonth > 11 ? 0 : deliveryMonth
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const deliveryMonthName = monthNames[actualDeliveryMonth]

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Coluna Esquerda - Produtos */}
      <div className="flex-1 min-w-0">
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 mb-4">
          📅 <strong>Previsão de entrega:</strong> {deliveryMonthName}/{deliveryYear}
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            type="text"
            placeholder="🔍 Buscar produto..."
            className="border rounded px-3 py-2 flex-1 min-w-48 dark:bg-gray-700 dark:border-gray-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select 
            className="border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600" 
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          >
            <option value="all">Todas categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Grid de Produtos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((p: any) => {
            const inCart = cart[p.id] || 0
            const disabled = (p.stock_qty || 0) === 0
            const maxQty = p.max_qty_per_order && p.max_qty_per_order > 0 ? Math.min(p.stock_qty, p.max_qty_per_order) : p.stock_qty
            
            return (
              <div key={p.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-2 transition-all ${inCart > 0 ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-transparent'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Estoque: {p.stock_qty} {p.unit}
                      {p.max_qty_per_order && p.max_qty_per_order > 0 && (
                        <span className="ml-2 text-orange-600">(máx: {p.max_qty_per_order})</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="font-bold text-blue-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
                    </div>
                  </div>
                </div>

                {disabled ? (
                  <div className="mt-3 text-center py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-500">
                    Sem estoque
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2">
                    {inCart > 0 ? (
                      <>
                        <button 
                          onClick={() => updateCartQty(p.id, inCart - 1)}
                          className="w-8 h-8 rounded bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center font-bold"
                        >
                          −
                        </button>
                        <span className="w-12 text-center font-semibold text-lg">{inCart}</span>
                        <button 
                          onClick={() => updateCartQty(p.id, inCart + 1)}
                          disabled={inCart >= maxQty}
                          className="w-8 h-8 rounded bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                        <button 
                          onClick={() => removeFromCart(p.id)}
                          className="ml-auto text-xs text-red-600 hover:underline"
                        >
                          Remover
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => addToCart(p.id, 1)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
                      >
                        + Adicionar
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum produto encontrado
          </div>
        )}
      </div>

      {/* Coluna Direita - Carrinho */}
      <div className="lg:w-96 lg:sticky lg:top-4 lg:self-start">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700">
          {/* Header do Carrinho */}
          <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                🛒 Carrinho
                {cartQtyTotal > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {cartQtyTotal}
                  </span>
                )}
              </h2>
              {cartItems.length > 0 && (
                <button onClick={clearCart} className="text-xs text-red-600 hover:underline">
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Seleção de Igreja */}
          <div className="p-4 border-b dark:border-gray-700">
            <label className="block text-sm font-medium mb-2">Igreja</label>
            <select 
              className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
              value={churchId} 
              onChange={(e) => setChurchId(Number(e.target.value))}
            >
              <option value="">Selecione a igreja...</option>
              {churches.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.city}</option>)}
            </select>
            {role !== 'ADM' && (churches || []).length === 0 && (
              <div className="text-xs text-yellow-600 mt-2">Você não possui igrejas atribuídas.</div>
            )}
          </div>

          {/* Itens do Carrinho */}
          <div className="max-h-72 overflow-y-auto">
            {cartItems.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">🛒</div>
                <div>Carrinho vazio</div>
                <div className="text-sm">Adicione produtos ao carrinho</div>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-700">
                {cartItems.map((item: any) => (
                  <div key={item.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.name}</div>
                      <div className="text-xs text-gray-500">
                        {item.qty} × {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm text-blue-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price * item.qty)}
                      </div>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo e Botão */}
          {cartItems.length > 0 && (
            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Total ({cartQtyTotal} itens)</span>
                <span className="text-xl font-bold text-blue-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}
                </span>
              </div>
              <button
                onClick={submit}
                disabled={submitting || !churchId}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '⏳ Enviando...' : '✓ Finalizar Pedido'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
