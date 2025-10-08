import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle,
  User,
  Building,
  Home,
  X,
  ChevronDown
} from 'lucide-react'
import Layout from '../components/Layout'
import { supabase, type Issue } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Building as BuildingType } from '../types/building'

interface Apartment {
  id: string
  apartment_number: string
  floor: number
  building_id: string
  building?: {
    name: string
  }
}

interface Tenant {
  id: string
  name: string
  email: string
}

interface IssueFilters {
  search: string
  status: string
  priority: string
  building: string
  floor: string
  tenant: string
  dateFrom: string
  dateTo: string
}

export default function AdminIssues() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [issues, setIssues] = useState<Issue[]>([])
  const [filteredIssues, setFilteredIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [buildings, setBuildings] = useState<BuildingType[]>([])
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  
  const [filters, setFilters] = useState<IssueFilters>({
    search: '',
    status: 'all',
    priority: 'all',
    building: 'all',
    floor: 'all',
    tenant: 'all',
    dateFrom: '',
    dateTo: ''
  })

  const [showFilters, setShowFilters] = useState(false)

  // Check if user is admin/company
  const isAdmin = user?.app_metadata?.role === 'admin' ||
                  user?.user_metadata?.role === 'company' || 
                  user?.app_metadata?.role === 'company'

  const fetchBuildings = useCallback(async () => {
    if (!user || !isAdmin) return

    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      if (data) setBuildings(data)
    } catch (error) {
      console.error('Error fetching buildings:', error)
    }
  }, [user, isAdmin])

  const fetchApartments = useCallback(async () => {
    if (!user || !isAdmin) return

    try {
      const { data, error } = await supabase
        .from('apartments')
        .select(`
          id,
          apartment_number,
          floor,
          building_id,
          building:buildings!inner (
            name,
            user_id
          )
        `)
        .eq('building.user_id', user.id)
        .order('building_id')
        .order('floor')
        .order('apartment_number')

      if (error) throw error
      if (data) setApartments(data as any)
    } catch (error) {
      console.error('Error fetching apartments:', error)
    }
  }, [user, isAdmin])

  const fetchTenants = useCallback(async () => {
    if (!user || !isAdmin) return

    try {
      // Get all tenants from buildings owned by this company using apartment_tenants as bridge
      const { data, error } = await supabase
        .from('apartment_tenants')
        .select(`
          tenant_id,
          apartments!inner (
            buildings!inner (
              user_id
            )
          )
        `)
        .eq('apartments.buildings.user_id', user.id)
        .eq('status', 'active')

      if (error) throw error
      
      if (data && data.length > 0) {
        // Get unique tenant IDs
        const tenantIds = [...new Set(data.map(item => item.tenant_id))]
        
        // Fetch user profiles separately
        const { data: userProfiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id, name, email')
          .in('id', tenantIds)

        if (profilesError) throw profilesError
        
        if (userProfiles) {
          const tenants = userProfiles.map(profile => ({
            id: profile.id,
            name: profile.name || profile.email,
            email: profile.email
          }))
          setTenants(tenants)
        }
      } else {
        setTenants([])
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    }
  }, [user, isAdmin])

  const fetchIssues = useCallback(async () => {
    if (!user || !isAdmin) return

    console.log('AdminIssues: Fetching issues for user:', user.id, 'isAdmin:', isAdmin)

    try {
      // First get buildings owned by this company
      const { data: userBuildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id')
        .eq('user_id', user.id)

      if (buildingsError) throw buildingsError
      if (!userBuildings || userBuildings.length === 0) {
        setIssues([])
        return
      }

      const buildingIds = userBuildings.map(b => b.id)

      // Get all issues from apartments in these buildings
      const { data, error } = await supabase
        .from('issues')
        .select(`
          *,
          apartments!inner (
            id,
            apartment_number,
            floor,
            building_id,
            buildings!inner (
              id,
              name,
              user_id
            )
          ),
          user_profiles!issues_user_id_fkey (
            name,
            email
          )
        `)
        .in('apartments.building_id', buildingIds)
        .order('created_at', { ascending: false })

      console.log('AdminIssues: Query result:', { data, error })
      
      if (error) throw error
      if (data) {
        console.log('AdminIssues: Found', data.length, 'issues')
        setIssues(data as any)
      }
    } catch (error) {
      console.error('Error fetching issues:', error)
    } finally {
      setLoading(false)
    }
  }, [user, isAdmin])

  const filterIssues = useCallback(() => {
    let filtered = issues

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(issue =>
        issue.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        issue.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        issue.user_profiles?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        issue.user_profiles?.email?.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(issue => issue.status === filters.status)
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(issue => issue.priority === filters.priority)
    }

    // Building filter
    if (filters.building !== 'all') {
      filtered = filtered.filter(issue => 
        issue.apartments?.buildings?.id === filters.building
      )
    }

    // Floor filter
    if (filters.floor !== 'all') {
      filtered = filtered.filter(issue => 
        issue.apartments?.floor?.toString() === filters.floor
      )
    }

    // Tenant filter
    if (filters.tenant !== 'all') {
      filtered = filtered.filter(issue => issue.user_id === filters.tenant)
    }

    // Date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(issue => 
        new Date(issue.created_at) >= new Date(filters.dateFrom)
      )
    }

    if (filters.dateTo) {
      filtered = filtered.filter(issue => 
        new Date(issue.created_at) <= new Date(filters.dateTo + 'T23:59:59')
      )
    }

    setFilteredIssues(filtered)
  }, [issues, filters])

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      priority: 'all',
      building: 'all',
      floor: 'all',
      tenant: 'all',
      dateFrom: '',
      dateTo: ''
    })
  }

  const updateFilter = (key: keyof IssueFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      case 'urgent': return 'text-purple-600 bg-purple-100'
      case 'critical': return 'text-red-800 bg-red-200'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'open': return 'text-blue-600 bg-blue-100'
      case 'in_progress': return 'text-orange-600 bg-orange-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'closed': return 'text-gray-600 bg-gray-100'
      case 'resolved': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Na čekanju'
      case 'open': return 'Otvoren'
      case 'in_progress': return 'U toku'
      case 'completed': return 'Završeno'
      case 'closed': return 'Zatvoreno'
      case 'resolved': return 'Riješeno'
      default: return status
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return 'Nizak'
      case 'medium': return 'Srednji'
      case 'high': return 'Visok'
      case 'urgent': return 'Hitno'
      case 'critical': return 'Kritičan'
      default: return priority
    }
  }

  // Get unique floors from selected building
  const getFloorsForBuilding = (buildingId: string) => {
    if (buildingId === 'all') return []
    return [...new Set(
      apartments
        .filter(apt => apt.building_id === buildingId)
        .map(apt => apt.floor)
    )].sort((a, b) => a - b)
  }

  useEffect(() => {
    if (isAdmin) {
      fetchBuildings()
      fetchApartments()
      fetchTenants()
      fetchIssues()
    }
  }, [fetchBuildings, fetchApartments, fetchTenants, fetchIssues, isAdmin])

  useEffect(() => {
    filterIssues()
  }, [filterIssues])

  if (!isAdmin) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Nemate dozvolu</h3>
          <p className="mt-1 text-sm text-gray-500">
            Samo administratori mogu pristupiti ovoj stranici.
          </p>
        </div>
      </Layout>
    )
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
            <h1 className="text-2xl font-bold text-gray-900">Upravljanje kvarovima</h1>
            <p className="mt-1 text-gray-600">
              Pregledajte i upravljajte svim kvarovima u vašim objektima
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Ukupno: {filteredIssues.length} od {issues.length} kvarova
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Filteri</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Očisti filtere
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  <Filter className="w-4 h-4 mr-1" />
                  {showFilters ? 'Sakrij' : 'Prikaži'} filtere
                  <ChevronDown className={`w-4 h-4 ml-1 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Search bar - always visible */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Pretraži po naslovu, opisu, ili korisniku..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Advanced filters - collapsible */}
          {showFilters && (
            <div className="p-4 pt-0 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => updateFilter('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Svi statusi</option>
                    <option value="pending">Na čekanju</option>
                    <option value="open">Otvoren</option>
                    <option value="in_progress">U toku</option>
                    <option value="completed">Završeno</option>
                    <option value="closed">Zatvoreno</option>
                    <option value="resolved">Riješeno</option>
                  </select>
                </div>

                {/* Priority filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioritet</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => updateFilter('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Svi prioriteti</option>
                    <option value="low">Nizak</option>
                    <option value="medium">Srednji</option>
                    <option value="high">Visok</option>
                    <option value="urgent">Hitno</option>
                    <option value="critical">Kritičan</option>
                  </select>
                </div>

                {/* Building filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objekat</label>
                  <select
                    value={filters.building}
                    onChange={(e) => {
                      updateFilter('building', e.target.value)
                      updateFilter('floor', 'all') // Reset floor when building changes
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Svi objekti</option>
                    {buildings.map(building => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Floor filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sprat</label>
                  <select
                    value={filters.floor}
                    onChange={(e) => updateFilter('floor', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={filters.building === 'all'}
                  >
                    <option value="all">Svi spratovi</option>
                    {getFloorsForBuilding(filters.building).map(floor => (
                      <option key={floor} value={floor.toString()}>
                        {floor === 0 ? 'Prizemlje' : `${floor}. sprat`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tenant filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stanar</label>
                  <select
                    value={filters.tenant}
                    onChange={(e) => updateFilter('tenant', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">Svi stanari</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date from */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Od datuma</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Date to */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Do datuma</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Issues list */}
        <div className="bg-white rounded-lg shadow-sm border">
          {filteredIssues.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {issues.length === 0 ? 'Nema prijavljenih kvarova' : 'Nema kvarova koji odgovaraju filterima'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {issues.length === 0 
                  ? 'Trenutno nema prijavljenih kvarova u vašim objektima.'
                  : 'Pokušajte promijeniti filtere da vidite više rezultata.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredIssues.map((issue) => (
                <div key={issue.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {issue.title}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(issue.priority)}`}>
                          {getPriorityLabel(issue.priority)}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(issue.status)}`}>
                          {getStatusLabel(issue.status)}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {issue.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {issue.user_profiles?.name || issue.user_profiles?.email || 'Nepoznat korisnik'}
                        </div>
                        
                        <div className="flex items-center">
                          <Building className="w-4 h-4 mr-1" />
                          {issue.apartment?.building?.name}
                        </div>
                        
                        <div className="flex items-center">
                          <Home className="w-4 h-4 mr-1" />
                          Stan {issue.apartment?.apartment_number}, {issue.apartment?.floor === 0 ? 'Prizemlje' : `${issue.apartment?.floor}. sprat`}
                        </div>
                        
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(issue.created_at).toLocaleDateString('sr-RS')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <Link
                        to={`/issues/${issue.id}`}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Pogledaj
                      </Link>
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