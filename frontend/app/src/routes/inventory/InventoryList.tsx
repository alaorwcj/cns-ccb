import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'

type InventoryStatus = 'EM_ANDAMENTO' | 'FINALIZADO'

type Inventory = {
  id: number
  created_at: string
  created_by_name: string
  status: InventoryStatus
  notes?: string
  finalized_at?: string
  items: any[]
}

export default function InventoryList() {
  const [inventories, setInventories] = useState<Inventory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.get('/inventory')
      setInventories(r.data.data || [])
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar inventários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createInventory = async () => {
    if (!window.confirm('Iniciar novo inventário? Isto criará uma contagem para todos os produtos.')) {
      return
    }

    setCreating(true)
    setError(null)

    try {
      const r = await api.post('/inventory', {
        notes: `Inventário iniciado em ${new Date().toLocaleDateString('pt-BR')}`
      })
      navigate(`/inventory/${r.data.id}`)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao criar inventário')
    } finally {
      setCreating(false)
    }
  }

  const getStatusColor = (status: InventoryStatus) => {
    return status === 'FINALIZADO' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
  }

  const getStatusText = (status: InventoryStatus) => {
    return status === 'FINALIZADO' ? 'Finalizado' : 'Em Andamento'
  }

  return (
    <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow">
      <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
        <h2 className="font-semibold">Inventário de Estoque</h2>
        <button
          onClick={createInventory}
          disabled={creating}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {creating ? 'Criando...' : '📋 Novo Inventário'}
        </button>
      </div>

      {error && <div className="p-4 text-red-600">{error}</div>}

      {loading ? (
        <div className="p-8 text-center text-gray-500">Carregando...</div>
      ) : inventories.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>Nenhum inventário encontrado.</p>
          <p className="text-sm mt-2">Clique em "Novo Inventário" para começar.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr className="text-left">
                <th className="p-3">#</th>
                <th className="p-3">Data</th>
                <th className="p-3">Criado por</th>
                <th className="p-3">Status</th>
                <th className="p-3">Total Itens</th>
                <th className="p-3">Notas</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventories.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-3 font-mono text-xs">{inv.id}</td>
                  <td className="p-3 text-xs">
                    {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    {' '}
                    {new Date(inv.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                  </td>
                  <td className="p-3">{inv.created_by_name || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(inv.status)}`}>
                      {getStatusText(inv.status)}
                    </span>
                  </td>
                  <td className="p-3">{inv.items?.length || 0} produtos</td>
                  <td className="p-3 text-xs text-gray-600 dark:text-gray-300 truncate max-w-xs">
                    {inv.notes || '-'}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => navigate(`/inventory/${inv.id}`)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      {inv.status === 'EM_ANDAMENTO' ? 'Continuar' : 'Ver Detalhes'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
