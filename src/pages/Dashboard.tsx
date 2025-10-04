import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus,
  TrendingUp,
  Building,
  Users
} from 'lucide-react'
import Layout from '../components/Layout'
import { supabase, type Issue } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

interface DashboardStats {
  totalIssues: number
  openIssues: number
  inProgressIssues: number
  closedIssues: number
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats>({
    totalIssues: 0,
    openIssues: 0,
    inProgressIssues: 0,
    closedIssues: 0
  })
  const [recentIssues, setRecentIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    if (!user) return

    try {
      // Fetch user's issues
      const { data: issues } = await supabase
        .from('issues')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (issues) {
        // Calculate stats
        const stats: DashboardStats = {
          totalIssues: issues.length,
          openIssues: issues.filter(issue => issue.status === 'open').length,
          inProgressIssues: issues.filter(issue => issue.status === 'in_progress').length,
          closedIssues: issues.filter(issue => issue.status === 'closed').length,
        }
        setStats(stats)

        // Get recent issues (last 5)
        setRecentIssues(issues.slice(0, 5))
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-red-600 bg-red-100'
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100'
      case 'closed':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open':
        return 'Otvoren'
      case 'assigned_to_master':
        return 'Dodijeljen majstoru'
      case 'in_progress':
        return 'U toku'
      case 'closed':
        return 'Zatvoren'
      default:
        return status
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-700 bg-red-100'
      case 'high':
        return 'text-orange-700 bg-orange-100'
      case 'medium':
        return 'text-yellow-700 bg-yellow-100'
      case 'low':
        return 'text-green-700 bg-green-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Hitno'
      case 'high':
        return 'Visok'
      case 'medium':
        return 'Srednji'
      case 'low':
        return 'Nizak'
      default:
        return priority
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Dobrodošli, {user?.name}!
          </h1>
          <p className="text-blue-100">
            Ovdje možete pratiti status svojih prijava i prijaviti nove kvarove.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ukupno prijava</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalIssues}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Clock className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Otvorene</p>
                <p className="text-2xl font-bold text-gray-900">{stats.openIssues}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">U toku</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgressIssues}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Riješene</p>
                <p className="text-2xl font-bold text-gray-900">{stats.closedIssues}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Brze akcije</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/report-issue"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Plus className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900">Prijavi kvar</p>
                <p className="text-sm text-gray-600">Prijavite novi kvar u vašem stanu</p>
              </div>
            </Link>

            <Link
              to="/3d-view"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900">3D prikaz</p>
                <p className="text-sm text-gray-600">Pogledajte 3D model zgrade</p>
              </div>
            </Link>

            <Link
              to="/issues"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-900">Moje prijave</p>
                <p className="text-sm text-gray-600">Pregledajte sve svoje prijave</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent issues */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Nedavne prijave</h2>
              <Link
                to="/issues"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Pogledaj sve
              </Link>
            </div>
          </div>
          
          {recentIssues.length === 0 ? (
            <div className="p-6 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nema prijava</h3>
              <p className="mt-1 text-sm text-gray-500">
                Počnite prijavljivanjem prvog kvara.
              </p>
              <div className="mt-6">
                <Link
                  to="/report-issue"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Prijavi kvar
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentIssues.map((issue) => (
                <div key={issue.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Link
                        to={`/issues/${issue.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {issue.title}
                      </Link>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {issue.description}
                      </p>
                      <div className="mt-2 flex items-center space-x-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                          {getStatusText(issue.status)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                          {getPriorityText(issue.priority)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(issue.created_at).toLocaleDateString('sr-RS')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}