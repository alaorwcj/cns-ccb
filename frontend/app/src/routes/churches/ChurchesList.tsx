import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import ChurchForm from '../../components/ChurchForm'

export default function ChurchesList() {
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingChurch, setEditingChurch] = useState<any | null>(null)
  const [filterCity, setFilterCity] = useState<string>('all')
  const [cities, setCities] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [churchesRes, citiesRes] = await Promise.all([
        api.get('/churches'),
        api.get('/churches/cities')
      ])
      setData(churchesRes.data)
      setCities(citiesRes.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar igrejas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openEdit = (church: any) => {
    setEditingChurch(church)
    setShowForm(true)
  }

  const openNew = () => {
    setEditingChurch(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingChurch(null)
  }

  const deleteChurch = async (id: number) => {
    if (!confirm('Deseja realmente excluir esta igreja?')) return
    try {
      await api.delete(`/churches/${id}`)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao deletar')
    }
  }

  const filteredData = filterCity === 'all'
    ? data
    : data.filter((c: any) => c.city === filterCity)

  const finalFiltered = filteredData.filter((c: any) => {
    const query = search.toLowerCase()
    return !query || c.name.toLowerCase().includes(query) || c.city.toLowerCase().includes(query)
  })

  if (loading) return <div>Carregando...</div>

  return (
    <>
      {showForm && (
        <ChurchForm
          church={editingChurch}
          onClose={closeForm}
          onSave={() => {
            load()
            closeForm()
          }}
        />
      )}

      <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow min-w-0">
          <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
            <div className="font-semibold">Igrejas</div>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="Buscar nome ou cidade..."
                className="border rounded px-2 py-1 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="border rounded px-2 py-1 text-sm"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
              >
                <option value="all">Todas as cidades</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <button
                onClick={openNew}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
              >
                + Nova Igreja
              </button>
            </div>
          </div>
          {error && <div className="text-red-600 p-4">{error}</div>}
          <div className="p-0">
            <div className="block sm:hidden p-3">
              {finalFiltered.map((c: any) => (
                <div key={c.id} className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow p-3 mb-3">
                  <div className="font-medium truncate max-w-full">{c.name}</div>
                  <div className="text-sm text-gray-500 truncate max-w-full">{c.city}</div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              <div className="overflow-x-auto min-w-0">
                <table className="w-full text-sm min-w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr className="text-left">
                      <th className="p-3">#</th>
                      <th className="p-3">Nome da Igreja</th>
                      <th className="p-3">Cidade</th>
                      <th className="p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {finalFiltered.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500">
                          Nenhuma igreja encontrada
                        </td>
                      </tr>
                    )}
                    {finalFiltered.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{c.id}</td>
                        <td className="p-3 font-medium min-w-0"><div className="truncate max-w-full">{c.name}</div></td>
                        <td className="p-3 text-gray-600 min-w-0"><div className="truncate max-w-full">{c.city}</div></td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                              onClick={() => openEdit(c)}
                            >
                              Editar
                            </button>
                            <button
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                              onClick={() => deleteChurch(c.id)}
                            >
                              Deletar
                            </button>
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
      </div>
    </>
  )
}
