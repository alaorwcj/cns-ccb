import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'
import ProductForm from '../../components/ProductForm'
import { ResponsiveTable } from '../../components/ResponsiveTable'

export default function ProductsList() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [filterCat, setFilterCat] = useState<number | 'all'>('all')
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params: any = { page, limit: 10 }
      if (filterCat !== 'all') params.category_id = filterCat
      if (search) params.search = search
      if (filterActive !== 'all') params.is_active = filterActive === 'active'

      const [cats, prods] = await Promise.all([
        api.get('/categories'),
        api.get('/products', { params })
      ])
      setCategories(cats.data || [])
      setProducts(prods.data.data || [])
      setTotal(prods.data.total || 0)
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products

  const openEdit = (p: any) => { setEditing(p); setShowForm(true) }
  const openNew = () => { setEditing(null); setShowForm(true) }
  const closeForm = () => { setEditing(null); setShowForm(false) }

  const remove = async (id: number) => {
    if (!confirm('Deseja realmente excluir este produto?')) return
    try {
      await api.delete(`/products/${id}`)
      await load()
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Erro ao excluir')
    }
  }

  const duplicate = async (id: number) => {
    try {
      await api.post(`/products/${id}/duplicate`)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao duplicar')
    }
  }

  const toggleActive = async (id: number) => {
    try {
      await api.patch(`/products/${id}/toggle-active`)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao alterar status')
    }
  }

  useEffect(() => {
    load()
  }, [page, filterCat, search, filterActive])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-fluidTitle font-semibold">Produtos</h1>
        <div className="flex items-center gap-2">
          <button onClick={openNew} className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">Novo</button>
        </div>
      </div>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <select className="border rounded px-2 py-1" value={filterCat} onChange={(e) => setFilterCat(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            <option value="all">Todas categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="border rounded px-2 py-1" value={filterActive} onChange={(e) => setFilterActive(e.target.value as any)}>
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          <input
            type="text"
            placeholder="Buscar produto..."
            className="border rounded px-2 py-1 flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="hidden md:block">
          <ResponsiveTable>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nome</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Categoria</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Preço</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                  {filteredProducts.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Nenhum produto encontrado</td></tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm min-w-0">
                        <div className="truncate max-w-full">{p.name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm min-w-0">
                        <div className="truncate max-w-full">{p.category_name || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">R$ {p.price?.toFixed?.(2) ?? p.price}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {p.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className="inline-flex items-center gap-2">
                          <button onClick={() => openEdit(p)} className="text-sm px-2 py-1 bg-yellow-400 rounded">Editar</button>
                          <button onClick={() => duplicate(p.id)} className="text-sm px-2 py-1 bg-sky-600 text-white rounded">Duplicar</button>
                          <button onClick={() => toggleActive(p.id)} className={`text-sm px-2 py-1 rounded ${p.is_active ? 'bg-orange-500 text-white' : 'bg-green-600 text-white'}`}>{p.is_active ? 'Inativar' : 'Ativar'}</button>
                          <button onClick={() => remove(p.id)} className="text-sm px-2 py-1 bg-red-500 text-white rounded">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>

        <div className="md:hidden space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Nenhum produto encontrado</div>
          ) : filteredProducts.map((p) => (
            <div key={p.id} className="border rounded p-3 bg-white shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-gray-500">{p.category_name || '-'}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">R$ {p.price?.toFixed?.(2) ?? p.price}</div>
                  <div className="mt-2 flex gap-2 justify-end">
                    <button onClick={() => openEdit(p)} className="px-2 py-1 bg-yellow-400 rounded text-sm">Editar</button>
                    <button onClick={() => remove(p.id)} className="px-2 py-1 bg-red-500 rounded text-white text-sm">Excluir</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-700">
          Mostrando {products.length} de {total} produtos
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Anterior
          </button>
          <span className="text-sm">Página {page}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={products.length < 10}
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Próxima
          </button>
        </div>
      </div>

      {showForm && (
        <ProductForm product={editing} onClose={closeForm} onSave={() => { closeForm(); load() }} />
      )}
    </div>
  )
}

