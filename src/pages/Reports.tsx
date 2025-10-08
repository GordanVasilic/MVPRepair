import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  BarChart3, 
  Users, 
  Building2, 
  TrendingUp, 
  AlertTriangle,
  FileText,
  Calendar,
  Activity
} from 'lucide-react'
import Layout from '../components/Layout'

interface DashboardStats {
  totalIssues: number
  totalTenants: number
  totalBuildings: number
  activeIssues: number
  recentIssues: Array<{
    id: string
    title: string
    status: string
    created_at: string
    tenants?: { name: string }
    buildings?: { name: string }
  }>
}

export default function Reports() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/reports/dashboard')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const reportCards = [
    {
      title: 'Izvještaj o kvarovima',
      description: 'Detaljni prikaz kvarova po statusu, prioritetu i kategoriji',
      icon: AlertTriangle,
      href: '/reports/issues',
      color: 'bg-red-500',
      stats: stats ? `${stats.activeIssues} aktivnih od ${stats.totalIssues}` : ''
    },
    {
      title: 'Izvještaj o stanarima',
      description: 'Statistike o stanarima i njihovoj aktivnosti',
      icon: Users,
      href: '/reports/tenants',
      color: 'bg-blue-500',
      stats: stats ? `${stats.totalTenants} stanara` : ''
    },
    {
      title: 'Izvještaj o objektima',
      description: 'Performanse i statistike po objektima',
      icon: Building2,
      href: '/reports/buildings',
      color: 'bg-green-500',
      stats: stats ? `${stats.totalBuildings} objekata` : ''
    },
    {
      title: 'Izvještaj o performansama',
      description: 'Analiza efikasnosti rješavanja kvarova',
      icon: TrendingUp,
      href: '/reports/performance',
      color: 'bg-purple-500',
      stats: 'Trendovi i metrike'
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Izvještaji</h1>
          <p className="mt-1 text-gray-600">
            Pregled statistika i izvještaja o kvarovima, stanarima i objektima
          </p>
        </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ukupno kvarova</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalIssues}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktivni kvarovi</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeIssues}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Stanari</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalTenants}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Building2 className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Objekti</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBuildings}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCards.map((report) => (
          <Link
            key={report.href}
            to={report.href}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow duration-200 border border-gray-200 hover:border-blue-300"
          >
            <div className="flex items-start space-x-4">
              <div className={`flex-shrink-0 p-3 rounded-lg ${report.color}`}>
                <report.icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {report.title}
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  {report.description}
                </p>
                {report.stats && (
                  <p className="text-sm font-medium text-blue-600">
                    {report.stats}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Issues */}
      {stats?.recentIssues && stats.recentIssues.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Najnoviji kvarovi</h2>
            <Link 
              to="/reports/issues" 
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Pogledaj sve
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentIssues.map((issue) => (
              <div key={issue.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{issue.title}</h4>
                  <p className="text-sm text-gray-600">
                    {issue.tenants?.name} • {issue.buildings?.name}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    issue.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    issue.status === 'open' ? 'bg-blue-100 text-blue-800' :
                    issue.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {issue.status === 'pending' ? 'Na čekanju' :
                     issue.status === 'open' ? 'Otvoren' :
                     issue.status === 'in_progress' ? 'U toku' : 'Završeno'}
                  </span>
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(issue.created_at).toLocaleDateString('hr-HR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </Layout>
  )
}