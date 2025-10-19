import React, { useEffect, useState } from 'react'
import { api } from '../../services/api'

interface ProductCatalogData {
  products: Array<{
    product_id: number
    name: string
    category_name: string
    stock_quantity: number
    description: string | null
  }>
  total_products: number
}

export default function ProductCatalog(): JSX.Element {
  const [data, setData] = useState<ProductCatalogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadCatalog()
  }, [])

  const loadCatalog = async () => {
    try {
      setLoading(true)
      const response = await api.get('/reports/product-catalog')
      setData(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Erro ao carregar catálogo')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar produtos
  const filteredProducts = data?.products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category_name === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesCategory && matchesSearch
  }) || []

  // Obter categorias únicas
  const categories = data ? [...new Set(data.products.map(p => p.category_name))].sort() : []

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando catálogo...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">❌ Erro ao carregar catálogo</div>
        <div className="text-gray-600">{error}</div>
        <button
          onClick={loadCatalog}
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
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Catálogo de Produtos</h2>
        <p className="text-gray-600 mt-1">Produtos disponíveis para pedidos</p>
      </div>

      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar produto</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do produto..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as categorias</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="mb-6">
        <div className="text-sm text-gray-600">
          Mostrando {filteredProducts.length} de {data.total_products} produtos
        </div>
      </div>

      {/* Grid de produtos */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🔍</div>
          <div>Nenhum produto encontrado com os filtros aplicados.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.product_id} className="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full ml-2 flex-shrink-0">
                    {product.category_name}
                  </span>
                </div>

                {product.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{product.description}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">Disponível:</span>
                    <span className={`font-medium ${
                      product.stock_quantity === 0 ? 'text-red-600' :
                      product.stock_quantity < 10 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {product.stock_quantity} un.
                    </span>
                  </div>

                  {product.stock_quantity === 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                      Indisponível
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}