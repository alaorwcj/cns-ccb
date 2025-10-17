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
    : data.filter(c => c.city === filterCity)

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
      <div className="bg-white rounded shadow">
        <div className="p-4 flex justify-between items-center border-b">
          <div className="font-semibold">Igrejas</div>
          <div className="flex gap-3 items-center">
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">#</th>
                <th className="p-3">Nome da Igreja</th>
                <th className="p-3">Cidade</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    {filterCity === 'all' ? 'Nenhuma igreja cadastrada' : `Nenhuma igreja encontrada em ${filterCity}`}
                  </td>
                </tr>
              )}
              {filteredData.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{c.id}</td>
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-gray-600">{c.city}</td>
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
    </>
  )
}
