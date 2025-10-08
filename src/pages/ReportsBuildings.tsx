import { useState, useEffect } from 'react'
import { Building, Filter, Download, Users, AlertTriangle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface BuildingReport {
  id: string
  name: string
  address: string
  tenant_count: number
  total_issues: number
  active_issues: number
  resolved_issues: number
  avg_resolution_time: number
  common_categories: string[]
}

interface BuildingsReport {
  buildings: BuildingReport[]
  totalCount: number
  stats: {
    totalBuildings: number
    totalTenants: number
    totalIssues: number
    avgIssuesPerBuilding: number
  }
}

export default function ReportsBuildings() {
  const [report, setReport] = useState<BuildingsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    hasIssues: '',
    sortBy: 'name'
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

      const response = await fetch(`/api/reports/buildings?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReport(data)
      }
    } catch (error) {
      console.error('Error fetching buildings report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      hasIssues: '',
      sortBy: 'name'
    })
  }

  const exportToPDF = () => {
    // Basic PDF export functionality
    window.print()
  }

  // Chart data preparation
  const issuesChartData = report ? report.buildings.map(building => ({
    name: building.name.length > 15 ? building.name.substring(0, 15) + '...' : building.name,
    aktivni: building.active_issues,
    riješeni: building.resolved_issues
  })) : []

  const resolutionTimeData = report ? report.buildings
    .filter(b => b.avg_resolution_time > 0)
    .map(building => ({
      name: building.name.length > 15 ? building.name.substring(0, 15) + '...' : building.name,
      vrijeme: building.avg_resolution_time
    })) : []

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
            <Building className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Izvještaj o objektima</h1>
              <p className="text-gray-600">Pregled objekata, stanara i kvarova</p>
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objekti sa kvarovima
            </label>
            <select
              value={filters.hasIssues}
              onChange={(e) => handleFilterChange('hasIssues', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Svi objekti</option>
              <option value="true">Sa kvarovima</option>
              <option value="false">Bez kvarova</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sortiraj po
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Naziv</option>
              <option value="tenant_count">Broj stanara</option>
              <option value="total_issues">Broj kvarova</option>
              <option value="avg_resolution_time">Vrijeme rješavanja</option>
            </select>
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

      {/* Statistics Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ukupno objekata</p>
                <p className="text-2xl font-bold text-gray-900">{report.stats.totalBuildings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ukupno stanara</p>
                <p className="text-2xl font-bold text-gray-900">{report.stats.totalTenants}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ukupno kvarova</p>
                <p className="text-2xl font-bold text-gray-900">{report.stats.totalIssues}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Prosječno kvarova po objektu</p>
                <p className="text-2xl font-bold text-gray-900">
                  {report.stats.avgIssuesPerBuilding.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Issues by Building */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kvarovi po objektima</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={issuesChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="aktivni" fill="#EF4444" name="Aktivni" />
                <Bar dataKey="riješeni" fill="#10B981" name="Riješeni" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Resolution Time */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Prosječno vrijeme rješavanja (dani)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={resolutionTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="vrijeme" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Buildings Table */}
      {report && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Lista objekata ({report.totalCount})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Objekat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stanari
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktivni kvarovi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Riješeni kvarovi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prosječno vrijeme
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Česte kategorije
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {report.buildings.map((building) => (
                  <tr key={building.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{building.name}</div>
                      <div className="text-sm text-gray-500">{building.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">{building.tenant_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        building.active_issues === 0 ? 'bg-green-100 text-green-800' :
                        building.active_issues <= 3 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {building.active_issues}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {building.resolved_issues}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-900">
                          {building.avg_resolution_time > 0 ? 
                            `${building.avg_resolution_time.toFixed(1)} dana` : 
                            'N/A'
                          }
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {building.common_categories.slice(0, 2).map((category, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded"
                          >
                            {category}
                          </span>
                        ))}
                        {building.common_categories.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            +{building.common_categories.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {report.buildings.length === 0 && (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nema objekata koji odgovaraju odabranim filterima.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}