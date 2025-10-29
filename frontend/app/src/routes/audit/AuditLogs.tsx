import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface AuditLog {
  id: number
  timestamp: string
  user_id?: number
  user_name?: string
  action: string
  resource: string
  resource_id?: number
  old_values?: any
  new_values?: any
  ip_address: string
  user_agent: string
  session_id?: string
  success: boolean
  error_message?: string
  extra_metadata?: any
}

interface AuditStats {
  total_logs: number
  action_stats: Record<string, number>
  resource_stats: Record<string, number>
  success_stats: Record<string, number>
  recent_failures: AuditLog[]
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showStats, setShowStats] = useState(false)

  // Calculate default dates (last 7 days)
  const getDefaultDates = () => {
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)
    
    return {
      start: sevenDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    }
  }

  const defaultDates = getDefaultDates()

  // Filters (initialized with last 7 days)
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [resource, setResource] = useState('')
  const [success, setSuccess] = useState('')
  const [startDate, setStartDate] = useState(defaultDates.start)
  const [endDate, setEndDate] = useState(defaultDates.end)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)

  const loadLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (userId) params.append('user_id', userId)
      if (action) params.append('action', action)
      if (resource) params.append('resource', resource)
      if (success) params.append('success', success)
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      params.append('page', page.toString())
      params.append('limit', limit.toString())

      const r = await api.get(`/audit?${params}`)
      setLogs(r.data)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erro ao carregar logs de auditoria')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const r = await api.get('/audit/stats')
      setStats(r.data)
    } catch (e: any) {
      console.error('Erro ao carregar estatísticas:', e)
    }
  }

  useEffect(() => { loadLogs() }, [page])
  useEffect(() => { loadStats() }, [])

  const handleFilter = () => {
    setPage(1)
    loadLogs()
  }

  const clearFilters = () => {
    const defaults = getDefaultDates()
    setUserId('')
    setAction('')
    setResource('')
    setSuccess('')
    setStartDate(defaults.start)
    setEndDate(defaults.end)
    setPage(1)
    loadLogs()
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR')
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800'
      case 'UPDATE': return 'bg-blue-100 text-blue-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      case 'LOGIN_SUCCESS': return 'bg-green-100 text-green-800'
      case 'LOGIN_FAILED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getResourceColor = (resource: string) => {
    switch (resource) {
      case 'USER': return 'bg-purple-100 text-purple-800'
      case 'PRODUCT': return 'bg-blue-100 text-blue-800'
      case 'ORDER': return 'bg-orange-100 text-orange-800'
      case 'CHURCH': return 'bg-green-100 text-green-800'
      case 'CATEGORY': return 'bg-yellow-100 text-yellow-800'
      case 'STOCK': return 'bg-indigo-100 text-indigo-800'
      case 'AUTH': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow">
        <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
          <div>
            <h1 className="text-xl font-semibold">Auditoria do Sistema</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Logs de todas as operações realizadas no sistema</p>
          </div>
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
          >
            {showStats ? 'Ocultar Estatísticas' : 'Mostrar Estatísticas'}
          </button>
        </div>
      </div>

      {/* Statistics */}
      {showStats && stats && (
        <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold">Estatísticas Gerais</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
              <div className="text-2xl font-bold text-blue-600">{stats.total_logs}</div>
              <div className="text-sm text-blue-600">Total de Logs</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded">
              <div className="text-2xl font-bold text-green-600">{stats.success_stats.true || 0}</div>
              <div className="text-sm text-green-600">Operações Bem-sucedidas</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded">
              <div className="text-2xl font-bold text-red-600">{stats.success_stats.false || 0}</div>
              <div className="text-sm text-red-600">Operações com Falha</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded">
              <div className="text-2xl font-bold text-purple-600">{Object.keys(stats.action_stats).length}</div>
              <div className="text-sm text-purple-600">Tipos de Ação</div>
            </div>
          </div>

          {/* Action Stats */}
          <div className="p-4 border-t dark:border-gray-700">
            <h3 className="font-semibold mb-2">Ações Realizadas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(stats.action_stats).map(([action, count]) => (
                <div key={action} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm font-medium">{action}</span>
                  <span className="text-sm font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Resource Stats */}
          <div className="p-4 border-t dark:border-gray-700">
            <h3 className="font-semibold mb-2">Recursos Afetados</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(stats.resource_stats).map(([resource, count]) => (
                <div key={resource} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm font-medium">{resource}</span>
                  <span className="text-sm font-bold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Filtros</h2>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm font-medium">
              📅 Últimos 7 dias
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">ID do Usuário</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Ex: 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ação</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="CREATE">Criar</option>
                <option value="UPDATE">Atualizar</option>
                <option value="DELETE">Excluir</option>
                <option value="LOGIN_SUCCESS">Login Bem-sucedido</option>
                <option value="LOGIN_FAILED">Login Falhado</option>
                <option value="GET_REQUEST">Consulta</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recurso</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="USER">Usuário</option>
                <option value="PRODUCT">Produto</option>
                <option value="ORDER">Pedido</option>
                <option value="CHURCH">Igreja</option>
                <option value="CATEGORY">Categoria</option>
                <option value="STOCK">Estoque</option>
                <option value="AUTH">Autenticação</option>
                <option value="SYSTEM">Sistema</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={success}
                onChange={(e) => setSuccess(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="true">Bem-sucedido</option>
                <option value="false">Com falha</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Inicial</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Final</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
            >
              Filtrar
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 dark:text-gray-100 rounded shadow">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Logs de Auditoria</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{logs.length} registros encontrados</p>
          </div>
          <button
            onClick={loadLogs}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
          >
            Atualizar
          </button>
        </div>

        {error && <div className="text-red-600 p-4">{error}</div>}

        {loading ? (
          <div className="p-8 text-center">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr className="text-left">
                  <th className="p-3">ID</th>
                  <th className="p-3">Data/Hora</th>
                  <th className="p-3">Usuário</th>
                  <th className="p-3">Ação</th>
                  <th className="p-3">Recurso</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">IP</th>
                  <th className="p-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
                      Nenhum log encontrado
                    </td>
                  </tr>
                )}

                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="p-3 font-mono text-xs">{log.id}</td>
                    <td className="p-3 text-xs min-w-0">
                      <div className="truncate">{formatTimestamp(log.timestamp)}</div>
                    </td>
                    <td className="p-3 text-xs">{log.user_name || '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getResourceColor(log.resource)}`}>
                        {log.resource}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {log.success ? 'Sucesso' : 'Falha'}
                      </span>
                    </td>
                    <td className="p-3 text-xs font-mono">{log.ip_address}</td>
                    <td className="p-3 text-xs min-w-0">
                      <div className="truncate max-w-xs">
                        {log.error_message || log.extra_metadata?.path || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {logs.length > 0 && (
          <div className="p-4 border-t dark:border-gray-700 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Página {page}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded text-sm"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}