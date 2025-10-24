import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'

export default function CategoriesList() {
  const [categories, setCategories] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any | null>(null)
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.get('/categories')
      setCategories(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openEdit = (category: any) => {
    setEditingCategory(category)
    setName(category.name)
    setShowForm(true)
  }

  const openNew = () => {
    setEditingCategory(null)
    setName('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingCategory(null)
    setName('')
  }

  const save = async () => {
    if (!name.trim()) return
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, { name })
      } else {
        await api.post('/categories', { name })
      }
      await load()
      closeForm()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao salvar')
    }
  }

  const deleteCategory = async (id: number) => {
    if (!confirm('Deseja realmente excluir esta categoria?')) return
    try {
      await api.delete(`/categories/${id}`)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao deletar')
    }
  }

  const filteredCategories = categories.filter((c: any) => {
    const query = search.toLowerCase()
    return !query || c.name.toLowerCase().includes(query)
  })

  return (
    <>
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow p-6 w-full max-w-md">
            <div className="font-semibold mb-4">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</div>
            <input
              className="w-full border rounded px-3 py-2 mb-4"
              placeholder="Nome da categoria"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={save} className="bg-blue-600 text-white rounded px-4 py-2">Salvar</button>
              <button onClick={closeForm} className="border rounded px-4 py-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow min-w-0">
        <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
          <div className="font-semibold">Categorias</div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Buscar categoria..."
              className="border rounded px-2 py-1 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button onClick={openNew} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">+ Nova Categoria</button>
          </div>
        </div>

        {error && <div className="text-red-600 p-4">{error}</div>}

        <div className="p-0">
          <div className="block sm:hidden p-3">
            {filteredCategories.map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow p-3 mb-3 flex justify-between items-center">
                <div className="font-medium">{c.name}</div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(c)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Editar</button>
                  <button onClick={() => deleteCategory(c.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Excluir</button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden sm:block">
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-sm min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr className="text-left">
                    <th className="p-3">#</th>
                    <th className="p-3">Nome</th>
                    <th className="p-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCategories.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-gray-500">Nenhuma categoria encontrada</td>
                    </tr>
                  )}
                  {filteredCategories.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{c.id}</td>
                      <td className="p-3 font-medium min-w-0"><div className="truncate max-w-full">{c.name}</div></td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(c)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium">Editar</button>
                          <button onClick={() => deleteCategory(c.id)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}