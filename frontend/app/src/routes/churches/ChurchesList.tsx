import { useEffect, useState } from 'react'
import { api } from '../../services/api'

export default function ChurchesList() {
  const [data, setData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get('/churches')
        setData(r.data)
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Erro ao carregar igrejas')
      }
    })()
  }, [])

  return (
    <div className="bg-white rounded shadow">
      <div className="p-4 border-b font-semibold">Igrejas</div>
      {error && <div className="text-red-600 p-2">{error}</div>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="p-2">ID</th>
            <th className="p-2">Nome</th>
            <th className="p-2">Cidade</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.id} className="border-b">
              <td className="p-2">{c.id}</td>
              <td className="p-2">{c.name}</td>
              <td className="p-2">{c.city}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
