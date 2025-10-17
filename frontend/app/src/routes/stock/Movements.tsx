import { useEffect, useState } from 'react'
import { api } from '../../services/api'

export default function Movements() {
  const [movs, setMovs] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ product_id: '', type: 'ENTRADA', qty: 1, note: '' })

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await api.get('/stock/movements')
      setMovs(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    try {
      await api.post('/stock/movements', { ...form, product_id: Number(form.product_id), qty: Number(form.qty) })
      setForm({ product_id: '', type: 'ENTRADA', qty: 1, note: '' })
      load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Falha ao criar movimentação')
    }
  }

  return (
    <div className="grid gap-4">
      <div className="bg-white p-4 rounded shadow">
        <div className="font-semibold mb-3">Nova movimentação</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input className="border rounded px-2 py-1" placeholder="ID Produto" value={form.product_id} onChange={e => setForm(v => ({...v, product_id: e.target.value}))} />
          <select className="border rounded px-2 py-1" value={form.type} onChange={e => setForm(v => ({...v, type: e.target.value}))}>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA_MANUAL">Saída manual</option>
            <option value="PERDA">Perda</option>
          </select>
          <input type="number" className="border rounded px-2 py-1" placeholder="Qtd" value={form.qty} onChange={e => setForm(v => ({...v, qty: Number(e.target.value)}))} />
          <input className="border rounded px-2 py-1" placeholder="Motivo/nota" value={form.note} onChange={e => setForm(v => ({...v, note: e.target.value}))} />
        </div>
        <div className="mt-2">
          <button className="bg-blue-600 text-white rounded px-3 py-1" onClick={submit}>Salvar</button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <div className="font-semibold mb-3">Movimentações</div>
        {loading ? 'Carregando...' : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Data</th>
                <th className="p-2">Produto</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Qtd</th>
                <th className="p-2">Pedido</th>
                <th className="p-2">Nota</th>
              </tr>
            </thead>
            <tbody>
              {movs.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="p-2">{new Date(m.created_at || Date.now()).toLocaleString()}</td>
                  <td className="p-2">{m.product_id}</td>
                  <td className="p-2">{m.type}</td>
                  <td className="p-2">{m.qty}</td>
                  <td className="p-2">{m.related_order_id || '-'}</td>
                  <td className="p-2">{m.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {error && <div className="text-red-600">{error}</div>}
      </div>
    </div>
  )
}
