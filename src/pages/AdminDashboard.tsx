import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle, Clock, BarChart3, Building2, Building, Plus, Users } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase, type Issue } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Building as BuildingType } from '../types/building'
import Building2D from '../components/Building2D/Building2D'
import { Issue2D } from '../types/building2d'

interface Tenant {
  id: string
  name: string
  email: string
  phone?: string
  apartment_number?: string
  floor?: number
  move_in_date?: string
  building_name?: string
  building_address?: string
  created_at: string
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [activeSection, setActiveSection] = useState<'dashboard' | 'issues'>('dashboard')
  const [buildings, setBuildings] = useState<BuildingType[]>([])
  const [buildingIssues, setBuildingIssues] = useState<{ [buildingId: string]: Issue2D[] }>({})
  const [buildingsLoading, setBuildingsLoading] = useState(true)

  // Check if user is admin/company
  const isAdmin = user?.app_metadata?.role === 'admin' ||
                  user?.user_metadata?.role === 'company' || 
                  user?.app_metadata?.role === 'company'

  // Reduced debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('AdminDashboard - User:', user?.email, 'isAdmin:', isAdmin, 'Buildings count:', buildings.length)
  }

  // Stats state
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeIssues: 0,
    resolvedIssues: 0,
    pendingIssues: 0
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [recentIssues, setRecentIssues] = useState<Issue[]>([])
  const [issuesLoading, setIssuesLoading] = useState(true)
  const [recentTenants, setRecentTenants] = useState<Tenant[]>([])
  const [tenantsLoading, setTenantsLoading] = useState(true)



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const fetchTenantStats = useCallback(async () => {
    if (!user?.id || !isAdmin) {
      setStatsLoading(false)
      return
    }

    try {
      // First, get buildings for this user
      const { data: userBuildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, user_id')
        .eq('user_id', user.id)

      if (buildingsError) {
        console.error('Error fetching buildings:', buildingsError)
        setStats(prev => ({ ...prev, totalUsers: 0 }))
        return
      }

      if (!userBuildings || userBuildings.length === 0) {
        setStats(prev => ({ ...prev, totalUsers: 0 }))
        return
      }

      const buildingIds = userBuildings.map(b => b.id)

      // Count active tenants
      const { count, error } = await supabase
        .from('apartment_tenants_with_details')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .in('building_id', buildingIds)

      if (error) {
        console.error('Error fetching tenant stats:', error)
        setStats(prev => ({ ...prev, totalUsers: 0 }))
      } else {
        setStats(prev => ({ ...prev, totalUsers: count || 0 }))
      }
    } catch (error) {
      console.error('Tenant stats fetch error:', error)
      setStats(prev => ({ ...prev, totalUsers: 0 }))
    } finally {
      setStatsLoading(false)
    }
  }, [user?.id, isAdmin])

  const fetchBuildings = useCallback(async () => {
    if (!user?.id || !isAdmin) {
      setBuildingsLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('buildings')
        .select(`
          *,
          building_models (
            id,
            floors_count,
            model_config
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching buildings:', error)
        return
      }

      if (data) {
        setBuildings(data)
        // Fetch issues for each building
        await fetchBuildingIssues(data)
      }
    } catch (error) {
      console.error('Buildings fetch error:', error)
    } finally {
      setBuildingsLoading(false)
    }
  }, [user?.id, isAdmin])

  const fetchActiveIssues = useCallback(async () => {
    if (!user?.id || !isAdmin) {
      setIssuesLoading(false)
      return
    }

    try {
      setIssuesLoading(true)
      
      // First, get buildings owned by this company user
      const { data: userBuildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id')
        .eq('user_id', user.id)

      if (buildingsError || !userBuildings || userBuildings.length === 0) {
        setRecentIssues([])
        setStats(prev => ({ ...prev, activeIssues: 0, pendingIssues: 0, resolvedIssues: 0 }))
        return
      }

      const buildingIds = userBuildings.map(b => b.id)

      // Get all issues for buildings owned by this company user using proper join
      const { data: allIssues, error: issuesError } = await supabase
        .from('issues')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          category,
          created_at,
          user_id,
          apartment_id,
          apartments!inner (
            id,
            building_id,
            floor,
            apartment_number
          )
        `)
        .in('apartments.building_id', buildingIds)
        .order('created_at', { ascending: false })

      if (issuesError) {
        console.error('Error fetching issues:', issuesError)
        setRecentIssues([])
        setStats(prev => ({ ...prev, activeIssues: 0, pendingIssues: 0, resolvedIssues: 0 }))
        return
      }

      if (allIssues) {
        // Filter active issues (not closed/resolved)
        const activeIssues = allIssues.filter(issue => 
          issue.status !== 'closed' && issue.status !== 'resolved'
        )
        
        // Calculate stats
        const pendingIssues = allIssues.filter(issue => issue.status === 'pending' || issue.status === 'open').length
        const resolvedIssues = allIssues.filter(issue => issue.status === 'closed' || issue.status === 'resolved').length

        // Add updated_at field to issues for compatibility
        const issuesWithUpdatedAt = activeIssues.map(issue => ({
          ...issue,
          updated_at: issue.created_at // Use created_at as fallback for updated_at
        }))
        setRecentIssues(issuesWithUpdatedAt.slice(0, 10)) // Show latest 10 active issues
        setStats(prev => ({
          ...prev,
          activeIssues: activeIssues.length,
          pendingIssues: pendingIssues,
          resolvedIssues: resolvedIssues
        }))
      }
    } catch (error) {
      console.error('Active issues fetch error:', error)
      setRecentIssues([])
      setStats(prev => ({ ...prev, activeIssues: 0, pendingIssues: 0, resolvedIssues: 0 }))
    } finally {
      setIssuesLoading(false)
    }
  }, [user?.id, isAdmin])

  const fetchBuildingIssues = async (buildings: BuildingType[]) => {
    const issuesMap: { [buildingId: string]: Issue2D[] } = {}

    for (const building of buildings) {
      try {
        const { data, error } = await supabase
          .from('issues')
          .select(`
            id,
            title,
            description,
            status,
            priority,
            category,
            created_at,
            apartments!inner (
              building_id,
              floor,
              apartment_number
            )
          `)
          .eq('apartments.building_id', building.id)

        if (!error && data) {
          // Transform issues to Issue2D format
          const transformedIssues: Issue2D[] = data.map(issue => ({
            id: issue.id,
            title: issue.title,
            description: issue.description,
            status: issue.status as 'new' | 'in_progress' | 'resolved',
            priority: issue.priority as 'low' | 'medium' | 'high' | 'critical',
            type: (issue.category || 'other') as 'plumbing' | 'electrical' | 'structural' | 'heating' | 'other',
            floor_number: Array.isArray(issue.apartments) ? issue.apartments[0]?.floor || 0 : (issue.apartments as any)?.floor || 0,
            apartment_number: Array.isArray(issue.apartments) ? issue.apartments[0]?.apartment_number || null : (issue.apartments as any)?.apartment_number || null,
            created_at: issue.created_at,
            position: {
              x: Math.random() * 80 + 10,
              y: Math.random() * 60 + 10
            }
          }))

          issuesMap[building.id] = transformedIssues
        }
      } catch (error) {
        console.error(`Error fetching issues for building ${building.id}:`, error)
        issuesMap[building.id] = []
      }
    }

    setBuildingIssues(issuesMap)
  }

  const handleFloorClick = (buildingId: string, floorNumber: number) => {
    navigate(`/buildings/${buildingId}?floor=${floorNumber}`)
  }

  const handleIssueClick = (issueId: string) => {
    navigate(`/issues/${issueId}`)
  }

  const handleBuildingClick = (buildingId: string) => {
    navigate(`/buildings/${buildingId}`)
  }

  const fetchRecentTenants = useCallback(async () => {
    if (!user?.id || !isAdmin) {
      setTenantsLoading(false)
      return
    }

    try {
      setTenantsLoading(true)
      // First, get buildings owned by this company user
      const { data: userBuildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, address')
        .eq('user_id', user.id)

      if (buildingsError || !userBuildings || userBuildings.length === 0) {
        setRecentTenants([])
        return
      }

      const buildingIds = userBuildings.map(b => b.id)

      // Get recent tenants for buildings owned by this company user using JOIN
      const { data: tenants, error: tenantsError } = await supabase
        .from('apartment_tenants')
        .select(`
          id,
          created_at,
          status,
          tenant_id,
          apartment_id,
          apartments!inner (
            id,
            apartment_number,
            floor,
            building_id,
            buildings!inner (
              id,
              name,
              address
            )
          ),
          user_profiles!apartment_tenants_tenant_id_fkey (
            name,
            email,
            phone
          )
        `)
        .in('apartments.building_id', buildingIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5)

      if (tenantsError) {
        console.error('❌ Error fetching recent tenants:', tenantsError)
        setRecentTenants([])
        return
      }

      if (tenants) {
        const transformedTenants: Tenant[] = tenants.map(tenant => ({
          id: tenant.id,
          name: 'Nepoznat korisnik',
          email: '',
          phone: '',
          apartment_number: '',
          floor: 0,
          move_in_date: null, // Not available in apartment_tenants table
          building_name: 'Nepoznata zgrada',
          building_address: 'Nepoznata adresa',
          created_at: tenant.created_at
        }))

        setRecentTenants(transformedTenants)
      }
    } catch (error) {
      console.error('Error fetching recent tenants:', error)
      setRecentTenants([])
    } finally {
      setTenantsLoading(false)
    }
  }, [user?.id, isAdmin])

  // Single useEffect that runs only when user or isAdmin changes
  useEffect(() => {
    if (user?.id && isAdmin) {
      fetchBuildings()
      fetchTenantStats()
      fetchActiveIssues()
      fetchRecentTenants()
    }
  }, [user?.id, isAdmin, fetchBuildings, fetchTenantStats, fetchActiveIssues, fetchRecentTenants])

  return (
    <Layout>
      <div className="p-6">
        {/* Stats Cards - Always visible at the top */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ukupno korisnika</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statsLoading ? '...' : stats.totalUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktivni kvarovi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {issuesLoading ? '...' : stats.activeIssues}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Riješeni kvarovi</p>
                <p className="text-2xl font-bold text-gray-900">
                  {issuesLoading ? '...' : stats.resolvedIssues}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Na čekanju</p>
                <p className="text-2xl font-bold text-gray-900">
                  {issuesLoading ? '...' : stats.pendingIssues}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Buildings section for admin/company users */}
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Building2 className="h-6 w-6 text-blue-600 mr-3" />
                  <h2 className="text-lg font-semibold text-gray-900">Moje zgrade</h2>
                </div>
                <Link
                  to="/buildings"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Pogledaj sve
                </Link>
              </div>
            </div>
            
            {buildingsLoading ? (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-200 rounded-lg h-64 mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : buildings.length === 0 ? (
              <div className="p-6 text-center">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nema zgrada</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Počnite dodavanjem prve zgrade.
                </p>
                <div className="mt-6">
                  <Link
                    to="/buildings/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj zgradu
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {buildings.map((building) => (
                    <div key={building.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="mb-4">
                        <h3 className="font-medium text-gray-900 mb-1">{building.name}</h3>
                        <p className="text-sm text-gray-600 flex items-center">
                          <Building className="h-4 w-4 mr-1" />
                          {building.address}
                        </p>
                        {buildingIssues[building.id] && buildingIssues[building.id].length > 0 && (
                          <p className="text-sm text-red-600 mt-1">
                            {buildingIssues[building.id].length} aktivnih kvarova
                          </p>
                        )}
                      </div>
                      
                      <div 
                        className="cursor-pointer"
                        onClick={() => handleBuildingClick(building.id)}
                      >
                        <Building2D
                          building={building}
                          issues={buildingIssues[building.id] || []}
                          onFloorClick={(floorNumber) => handleFloorClick(building.id, floorNumber)}
                          onIssueClick={handleIssueClick}
                        />
                      </div>
                      

                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Issues - Left Column */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Najnoviji kvarovi</h3>
              </div>
              <div className="p-6">
                {issuesLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 bg-gray-50 rounded-lg">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recentIssues.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nema aktivnih kvarova</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Trenutno nema prijavljenih kvarova u vašim objektima.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentIssues.map((issue) => (
                      <div key={issue.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{issue.title}</h4>
                          <p className="text-sm text-gray-600">
                            Prijavio: Nepoznat korisnik
                          </p>
                          {issue.apartment && (
                            <p className="text-xs text-gray-500">
                              Stan {issue.apartment.apartment_number}, Sprat {issue.apartment.floor}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(issue.priority)}`}>
                            {issue.priority === 'high' ? 'Visok' : 
                             issue.priority === 'medium' ? 'Srednji' : 
                             issue.priority === 'urgent' ? 'Kritičan' : 'Nizak'}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(issue.status)}`}>
                            {issue.status === 'open' ? 'Otvoren' :
                             issue.status === 'assigned_to_master' ? 'Dodeljen majstoru' :
                             issue.status === 'in_progress' ? 'U toku' : 
                             issue.status === 'closed' ? 'Završeno' : 'Otvoren'}
                          </span>
                          <button 
                            onClick={() => handleIssueClick(issue.id)}
                            className="ml-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Pogledaj
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Tenants - Right Column */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Najnoviji stanari</h3>
              </div>
              <div className="p-6">
                {tenantsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 bg-gray-50 rounded-lg">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : recentTenants.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nema novih stanara</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Trenutno nema nedavno dodanih stanara u vašim objektima.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentTenants.map((tenant) => (
                      <div key={tenant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{tenant.name}</h4>
                          <p className="text-sm text-gray-600">{tenant.email}</p>
                          {tenant.apartment_number && (
                            <p className="text-xs text-gray-500">
                              Stan {tenant.apartment_number}, Sprat {tenant.floor}
                            </p>
                          )}
                          {tenant.building_name && (
                            <p className="text-xs text-gray-500">
                              {tenant.building_name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-xs font-medium rounded-full text-blue-600 bg-blue-100">
                            {new Date(tenant.created_at).toLocaleDateString('sr-RS')}
                          </span>
                          <Link 
                            to="/tenants"
                            className="ml-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Pogledaj
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}