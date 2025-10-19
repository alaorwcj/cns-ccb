import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface ProductData {
  summary: {
    total_products: number
    low_stock_products: number
    out_of_stock_products: number
    total_stock_value: number
  }
  products: Array<{
    product_id: number
    name: string
    category_name: string
    stock_quantity: number
    low_stock_threshold: number | null
    last_movement: string | null
    movement_count: number
    status: string
  }>
}

export default function ProductsReport(): JSX.Element {
  const [data, setData] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReport()
  }, [])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await api.get('/reports/products')
      setData(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!data) return

    const headers = ['Produto', 'Categoria', 'Estoque', 'Estoque Mínimo', 'Status', 'Última Movimentação', 'Nº Movimentações']
    const rows = data.products.map(product => [
      product.name,
      product.category_name,
      product.stock_quantity,
      product.low_stock_threshold || '',
      product.status,
      product.last_movement ? new Date(product.last_movement).toLocaleDateString('pt-BR') : '',
      product.movement_count
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `produtos_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK': return 'bg-red-100 text-red-800'
      case 'LOW_STOCK': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'OUT_OF_STOCK': return 'Sem Estoque'
      case 'LOW_STOCK': return 'Estoque Baixo'
      default: return 'Normal'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando relatório...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">❌ Erro ao carregar relatório</div>
        <div className="text-gray-600">{error}</div>
        <button
          onClick={loadReport}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Relatório de Produtos</h2>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
        >
          📊 Exportar CSV
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{data.summary.total_products}</div>
          <div className="text-sm text-gray-600">Total de Produtos</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{data.summary.total_stock_value}</div>
          <div className="text-sm text-gray-600">Total em Estoque</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{data.summary.low_stock_products}</div>
          <div className="text-sm text-gray-600">Estoque Baixo</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{data.summary.out_of_stock_products}</div>
          <div className="text-sm text-gray-600">Sem Estoque</div>
        </div>
      </div>

      {/* Alertas */}
      {(data.summary.low_stock_products > 0 || data.summary.out_of_stock_products > 0) && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-yellow-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Alertas de Estoque</h3>
              <div className="text-sm text-yellow-700 mt-1">
                {data.summary.low_stock_products > 0 && `${data.summary.low_stock_products} produto(s) com estoque baixo. `}
                {data.summary.out_of_stock_products > 0 && `${data.summary.out_of_stock_products} produto(s) sem estoque.`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de produtos */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estoque</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mínimo</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Última Mov.</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Movimentações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.products.map((product) => (
              <tr key={product.product_id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-900 font-medium">{product.name}</td>
                <td className="px-4 py-2 text-sm text-gray-900">{product.category_name}</td>
                <td className="px-4 py-2 text-sm text-gray-900">
                  <span className={`font-medium ${
                    product.stock_quantity === 0 ? 'text-red-600' :
                    product.low_stock_threshold && product.stock_quantity <= product.low_stock_threshold ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {product.stock_quantity}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm text-gray-900">{product.low_stock_threshold || '-'}</td>
                <td className="px-4 py-2 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(product.status)}`}>
                    {getStatusText(product.status)}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm text-gray-900">
                  {product.last_movement ? new Date(product.last_movement).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900">{product.movement_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.products.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Nenhum produto encontrado.
        </div>
      )}
    </div>
  )
}