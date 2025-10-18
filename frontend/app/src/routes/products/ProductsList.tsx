import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'
import ProductForm from '../../components/ProductForm'
import ResponsiveTableWrapper from '../../components/ResponsiveTableWrapper'

export default function ProductsList() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [filterCat, setFilterCat] = useState<number | 'all'>('all')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [cats, prods] = await Promise.all([
        api.get('/categories'),
        api.get('/products', { params: filterCat === 'all' ? {} : { category_id: filterCat } })
      ])
      setCategories(cats.data || [])
      setProducts(prods.data || [])
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterCat])

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

  if (loading) return <div>Carregando...</div>

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-screen-xl mx-auto py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Produtos</h1>
          <div className="flex items-center gap-2">
            <button onClick={openNew} className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">Novo</button>
          </div>
        </div>

        {error && <div className="mb-4 text-red-600">{error}</div>}

        <div className="space-y-4">
          <div className="hidden md:block">
            <ResponsiveTableWrapper>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nome</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Categoria</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Preço</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {products.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">Nenhum produto encontrado</td></tr>
                  ) : (
                    products.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm min-w-0">
                          <div className="truncate">{p.name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm min-w-0">
                          <div className="truncate">{p.category_name || '-'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">R$ {p.price?.toFixed?.(2) ?? p.price}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="inline-flex items-center gap-2">
                            <button onClick={() => openEdit(p)} className="text-sm px-2 py-1 bg-yellow-400 rounded">Editar</button>
                            <button onClick={() => duplicate(p.id)} className="text-sm px-2 py-1 bg-sky-600 text-white rounded">Duplicar</button>
                            <button onClick={() => remove(p.id)} className="text-sm px-2 py-1 bg-red-500 text-white rounded">Excluir</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ResponsiveTableWrapper>
          </div>

          <div className="md:hidden space-y-3">
            {products.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Nenhum produto encontrado</div>
            ) : products.map((p) => (
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

        {showForm && (
          <ProductForm product={editing} onClose={closeForm} onSave={() => { closeForm(); load() }} />
        )}
      </div>
    </div>
  )
}

