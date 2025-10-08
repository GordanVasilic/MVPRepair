import { useState, useEffect } from 'react'
import { TrendingUp, Filter, Download, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface PerformanceReport {
  totalIssues: number
  resolvedIssues: number
  resolutionRate: number
  avgResolutionTime: number
  monthlyTrends: Array<{
    month: string
    total: number
    resolved: number
    avgTime: number
  }>
  priorityDistribution: Record<string, number>
  categoryPerformance: Array<{
    category: string
    total: number
    resolved: number
    avgTime: number
  }>
}

export default function ReportsPerformance() {
  const [report, setReport] = useState<PerformanceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    period: '6months'
  })

  useEffect(() => {
    fetchReport()
  }, [filters])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/reports/performance?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReport(data)
      }
    } catch (error) {
      console.error('Error fetching performance report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      period: '6months'
    })
  }

  const exportToPDF = () => {
    // Basic PDF export functionality
    window.print()
  }

  // Chart data preparation
  const monthlyTrendsData = report ? report.monthlyTrends.map(trend => ({
    ...trend,
    resolutionRate: trend.total > 0 ? ((trend.resolved / trend.total) * 100).toFixed(1) : 0
  })) : []

  const priorityChartData = report ? Object.entries(report.priorityDistribution).map(([priority, count]) => ({
    name: priority === 'low' ? 'Nizak' :
          priority === 'medium' ? 'Srednji' :
          priority === 'high' ? 'Visok' : 'Hitno',
    value: count
  })) : []

  const categoryPerformanceData = report ? report.categoryPerformance.map(cat => ({
    name: cat.category,
    stopa: cat.total > 0 ? ((cat.resolved / cat.total) * 100).toFixed(1) : 0,
    vrijeme: cat.avgTime
  })) : []

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444']

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Izvještaj o performansama</h1>
              <p className="text-gray-600">Analiza efikasnosti rješavanja kvarova</p>
            </div>
          </div>
          <button
            onClick={exportToPDF}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            <span>Izvezi PDF</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filteri</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period
            </label>
            <select
              value={filters.period}
              onChange={(e) => handleFilterChange('period', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="3months">Zadnja 3 mjeseca</option>
              <option value="6months">Zadnjih 6 mjeseci</option>
              <option value="1year">Zadnja godina</option>
              <option value="custom">Prilagođeno</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Od datuma
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              disabled={filters.period !== 'custom'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Do datuma
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              disabled={filters.period !== 'custom'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Očisti filtere
            </button>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ukupno kvarova</p>
                <p className="text-2xl font-bold text-gray-900">{report.totalIssues}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Riješeno kvarova</p>
                <p className="text-2xl font-bold text-gray-900">{report.resolvedIssues}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Stopa rješavanja</p>
                <p className="text-2xl font-bold text-gray-900">{report.resolutionRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Prosječno vrijeme</p>
                <p className="text-2xl font-bold text-gray-900">{report.avgResolutionTime.toFixed(1)} dana</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Trends */}
      {report && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mjesečni trendovi</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Bar yAxisId="left" dataKey="total" fill="#3B82F6" name="Ukupno kvarova" />
              <Bar yAxisId="left" dataKey="resolved" fill="#10B981" name="Riješeno kvarova" />
              <Line yAxisId="right" type="monotone" dataKey="avgTime" stroke="#F59E0B" strokeWidth={2} name="Prosječno vrijeme (dani)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts Grid */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Priority Distribution */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribucija po prioritetu</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {priorityChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Performance */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performanse po kategorijama</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Bar yAxisId="left" dataKey="stopa" fill="#10B981" name="Stopa rješavanja (%)" />
                <Line yAxisId="right" type="monotone" dataKey="vrijeme" stroke="#EF4444" strokeWidth={2} name="Prosječno vrijeme (dani)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Performance Table */}
      {report && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detaljne performanse po kategorijama</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategorija
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ukupno kvarova
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Riješeno
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stopa rješavanja
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prosječno vrijeme
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.categoryPerformance.map((category, index) => {
                  const resolutionRate = category.total > 0 ? (category.resolved / category.total) * 100 : 0
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {category.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {category.total}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {category.resolved}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className={`h-2 rounded-full ${
                                resolutionRate >= 80 ? 'bg-green-500' :
                                resolutionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${resolutionRate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-900">{resolutionRate.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-900">
                            {category.avgTime.toFixed(1)} dana
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {report.categoryPerformance.length === 0 && (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nema podataka o performansama za odabrani period.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}