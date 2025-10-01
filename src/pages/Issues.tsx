import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  Eye
} from 'lucide-react'
import Layout from '../components/Layout'
import { supabase, type Issue } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function Issues() {
  const { user } = useAuthStore()
  const [issues, setIssues] = useState<Issue[]>([])
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  useEffect(() => {
    fetchIssues()
  }, [user])

  useEffect(() => {
    filterIssues()
  }, [issues, searchTerm, statusFilter, priorityFilter])

  const fetchIssues = async () => {
    if (!user) return

    try {
      const { data } = await supabase
        .from('issues')
        .select(`
          *,
          apartments (
            apartment_number,
            floor
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) {
        setIssues(data)
      }
    } catch (error) {
      console.error('Error fetching issues:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterIssues = () => {
    let filtered = issues

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(issue =>
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(issue => issue.priority === priorityFilter)
    }

    setFilteredIssues(filtered)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

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
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Moje prijave</h1>
            <p className="mt-1 text-gray-600">
              Pregledajte sve svoje prijave kvarova i njihov status
            </p>
          </div>
          <Link
            to="/report-issue"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Prijavi novi kvar
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Pretraži prijave..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Svi statusi</option>
              <option value="open">Otvorene</option>
              <option value="in_progress">U toku</option>
              <option value="closed">Zatvorene</option>
            </select>

            {/* Priority filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Svi prioriteti</option>
              <option value="urgent">Hitno</option>
              <option value="high">Visok</option>
              <option value="medium">Srednji</option>
              <option value="low">Nizak</option>
            </select>

            {/* Results count */}
            <div className="flex items-center text-sm text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              {filteredIssues.length} od {issues.length} prijava
            </div>
          </div>
        </div>

        {/* Issues list */}
        {filteredIssues.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {issues.length === 0 ? 'Nema prijava' : 'Nema rezultata'}
            </h3>
            <p className="mt-2 text-gray-600">
              {issues.length === 0 
                ? 'Još niste prijavili nijedan kvar.'
                : 'Pokušajte sa drugim filterima pretrage.'
              }
            </p>
            {issues.length === 0 && (
              <div className="mt-6">
                <Link
                  to="/report-issue"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Prijavi prvi kvar
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIssues.map((issue) => (
              <div key={issue.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(issue.status)}
                      <h3 className="text-lg font-medium text-gray-900">
                        {issue.title}
                      </h3>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {issue.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(issue.created_at).toLocaleDateString('sr-RS')}
                      </span>
                      
                      {issue.apartments && (
                        <span>
                          Stan {issue.apartments.apartment_number} - {issue.apartments.floor}. sprat
                        </span>
                      )}
                      
                      {issue.location_details?.room && (
                        <span>
                          {issue.location_details.room}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2 ml-6">
                    <div className="flex space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                        {getStatusText(issue.status)}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(issue.priority)}`}>
                        {getPriorityText(issue.priority)}
                      </span>
                    </div>
                    
                    <Link
                      to={`/issues/${issue.id}`}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Detalji
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}