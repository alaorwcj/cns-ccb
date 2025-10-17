import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import UserForm from '../../components/UserForm'

export default function UsersList() {
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.get('/users')
      setUsers(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openEdit = (user: any) => {
    setEditingUser(user)
    setShowForm(true)
  }

  const openNew = () => {
    setEditingUser(null)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingUser(null)
  }

  const deleteUser = async (id: number) => {
    if (!confirm('Deseja realmente excluir este usuário?')) return
    try {
      await api.delete(`/users/${id}`)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao deletar')
    }
  }

  const toggleActive = async (id: number) => {
    try {
      await api.patch(`/users/${id}/toggle-active`)
      await load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao alterar status')
    }
  }

  if (loading) return <div>Carregando...</div>

  return (
    <>
      {showForm && (
        <UserForm
          user={editingUser}
          onClose={closeForm}
          onSave={() => {
            load()
            closeForm()
          }}
        />
      )}
      <div className="bg-white rounded shadow">
        <div className="p-4 flex justify-between items-center border-b">
          <div className="font-semibold">Usuários</div>
          <button
            onClick={openNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
          >
            + Novo Usuário
          </button>
        </div>
        {error && <div className="text-red-600 p-4">{error}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="p-3">#</th>
                <th className="p-3">Nome</th>
                <th className="p-3">Email</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Papel</th>
                <th className="p-3">Igrejas</th>
                <th className="p-3">Status</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">Nenhum usuário encontrado</td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{u.id}</td>
                  <td className="p-3 font-medium">{u.name}</td>
                  <td className="p-3 text-gray-600">{u.email}</td>
                  <td className="p-3 text-gray-600">{u.phone || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      u.role === 'ADM' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {u.role === 'ADM' ? 'Administrador' : 'Usuário'}
                    </span>
                  </td>
                  <td className="p-3 text-xs">
                    {u.role === 'ADM' ? (
                      <span className="text-gray-500">Todas</span>
                    ) : (
                      <span>{u.churches?.length || 0} igreja(s)</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                        onClick={() => openEdit(u)}
                      >
                        Editar
                      </button>
                      <button
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          u.is_active
                            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        onClick={() => toggleActive(u.id)}
                      >
                        {u.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium"
                        onClick={() => deleteUser(u.id)}
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
