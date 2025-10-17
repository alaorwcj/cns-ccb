import { useEffect, useState } from 'react'
import { api } from '../../services/api'

export default function UsersList() {
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/users')
        setUsers(r.data)
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Erro ao carregar usuários')
      }
    })()
  }, [])

  return (
    <div className="bg-white rounded shadow">
      <div className="p-4 border-b font-semibold">Usuários</div>
      {error && <div className="text-red-600 p-2">{error}</div>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">ID</th>
            <th className="p-2">Nome</th>
            <th className="p-2">Email</th>
            <th className="p-2">Papel</th>
            <th className="p-2">Ativo</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b">
              <td className="p-2">{u.id}</td>
              <td className="p-2">{u.name}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2">{u.is_active ? 'Sim' : 'Não'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
