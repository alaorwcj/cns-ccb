import { useEffect, useState } from 'react'
import { api } from '../../services/api'

export default function ProductsList() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [filterCat, setFilterCat] = useState<number | 'all'>('all')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [cats, prods] = await Promise.all([
        api.get('/categories'),
        api.get('/products', { params: filterCat === 'all' ? {} : { category_id: filterCat } })
      ])
      setCategories(cats.data)
      setProducts(prods.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterCat])

  const duplicate = async (id: number) => {
    try {
      await api.post(`/products/${id}/duplicate`)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao duplicar')
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <div className="bg-white rounded shadow">
      <div className="p-4 flex justify-between items-center border-b">
        <div className="font-semibold">Produtos</div>
        <select className="border rounded px-2 py-1" value={filterCat}
          onChange={(e) => setFilterCat(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
          <option value="all">Todas categorias</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {error && <div className="text-red-600 p-2">{error}</div>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">Cod.</th>
            <th className="p-2">Descrição</th>
            <th className="p-2">Categoria</th>
            <th className="p-2">Preço</th>
            <th className="p-2">Estoque</th>
            <th className="p-2">Ações</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{p.id}</td>
              <td className="p-2">{p.name}</td>
              <td className="p-2">{p.category_id || '-'}</td>
              <td className="p-2">R${Number(p.price).toFixed(2)}</td>
              <td className="p-2">{p.stock_qty}</td>
              <td className="p-2 flex gap-2">
                <button className="px-2 py-1 bg-sky-600 text-white rounded" onClick={() => duplicate(p.id)}>Duplicar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
