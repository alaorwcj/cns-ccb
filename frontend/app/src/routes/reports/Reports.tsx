import React, { useState } from 'react'
import { useAuth } from '../../store/auth'

// Componentes de relatórios ADM
import StockMovementsReport from './StockMovementsReport'
import OrdersReport from './OrdersReport'
import ProductsReport from './ProductsReport'
import ChurchesReport from './ChurchesReport'
import DashboardReport from './DashboardReport'

// Componentes de relatórios Usuário
import MyOrdersReport from './MyOrdersReport'
import ProductCatalog from './ProductCatalog'
import MyMovementsReport from './MyMovementsReport'

type ReportType = 'dashboard' | 'stock' | 'orders' | 'products' | 'churches' | 'my-orders' | 'catalog' | 'my-movements'

export default function Reports(): JSX.Element {
  const { role } = useAuth()
  const [activeReport, setActiveReport] = useState<ReportType>('dashboard')

  const isAdmin = role === 'ADM'

  const adminReports = [
    { id: 'dashboard' as ReportType, name: 'Dashboard Executivo', icon: '📊' },
    { id: 'stock' as ReportType, name: 'Movimentações', icon: '📦' },
    { id: 'orders' as ReportType, name: 'Pedidos', icon: '📋' },
    { id: 'products' as ReportType, name: 'Produtos', icon: '🛍️' },
    { id: 'churches' as ReportType, name: 'Igrejas', icon: '⛪' },
  ]

  const userReports = [
    { id: 'my-orders' as ReportType, name: 'Meus Pedidos', icon: '📋' },
    { id: 'catalog' as ReportType, name: 'Catálogo', icon: '📖' },
    { id: 'my-movements' as ReportType, name: 'Minhas Movimentações', icon: '📈' },
  ]

  const reports = isAdmin ? adminReports : userReports

  const renderReport = () => {
    switch (activeReport) {
      case 'dashboard':
        return isAdmin ? <DashboardReport /> : <MyOrdersReport />
      case 'stock':
        return <StockMovementsReport />
      case 'orders':
        return <OrdersReport />
      case 'products':
        return <ProductsReport />
      case 'churches':
        return <ChurchesReport />
      case 'my-orders':
        return <MyOrdersReport />
      case 'catalog':
        return <ProductCatalog />
      case 'my-movements':
        return <MyMovementsReport />
      default:
        return <div>Relatório não encontrado</div>
    }
  }

  return (
    <div className="min-w-0">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Relatórios</h1>
        <p className="text-gray-600">
          {isAdmin
            ? 'Análise completa do sistema e métricas de negócio'
            : 'Acompanhe seus pedidos e consulte o catálogo de produtos'
          }
        </p>
      </div>

      {/* Navegação por abas */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {reports.map((report) => (
              <button
                key={report.id}
                onClick={() => setActiveReport(report.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeReport === report.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{report.icon}</span>
                {report.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Conteúdo do relatório */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {renderReport()}
      </div>
    </div>
  )
}