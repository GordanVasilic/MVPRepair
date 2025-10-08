import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Mail, MapPin, Building2, Users } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuthStore } from '../stores/authStore'
import InviteTenantModal from '../components/InviteTenantModal'

interface Tenant {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
  building: {
    id: string
    name: string
    address: string
  }
  apartment: {
    id: string
    apartment_number: string
    floor: number
  }
  status: 'active' | 'inactive' | 'pending'
  invited_at: string
  joined_at?: string
}

interface Building {
  id: string
  name: string
  address: string
}

export default function Tenants() {
  const { user } = useAuthStore()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBuilding, setSelectedBuilding] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Check if user is admin/company
  const isAdmin = user?.app_metadata?.role === 'admin' ||
                  user?.user_metadata?.role === 'company' || 
                  user?.app_metadata?.role === 'company'

  useEffect(() => {
    console.log('🚀 TENANTS COMPONENT MOUNTED')
    console.log('User state:', user)
    console.log('User role:', user?.user_metadata?.role || user?.app_metadata?.role)
    
    if (isAdmin) {
      console.log('✅ User has permission to fetch tenants')
      fetchTenants()
      fetchBuildings()
    } else {
      console.log('❌ User does not have permission or user is null')
      console.log('User exists:', !!user)
      if (user) {
        console.log('User role:', user.user_metadata?.role || user.app_metadata?.role)
      }
    }
  }, [isAdmin, user])

  const fetchTenants = async () => {
    console.log('🔍 FETCHING TENANTS - START')
    console.log('User:', user)
    console.log('User access_token exists:', !!user?.access_token)
    
    try {
      const response = await fetch('/api/tenants', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      })
      
      console.log('📡 API Response status:', response.status)
      console.log('📡 API Response ok:', response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 API Response data:', data)
        console.log('📊 Tenants array:', data.tenants)
        console.log('📊 Tenants length:', data.tenants?.length || 0)
        console.log('🔄 Setting tenants state...')
        setTenants(data.tenants || [])
        console.log('✅ Tenants state set')
      } else {
        const errorText = await response.text()
        console.error('❌ Failed to fetch tenants:', response.status, errorText)
      }
    } catch (error) {
      console.error('❌ Error fetching tenants:', error)
    } finally {
      setLoading(false)
      console.log('🔍 FETCHING TENANTS - END')
    }
  }

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings', {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBuildings(data.buildings || [])
      }
    } catch (error) {
      console.error('Error fetching buildings:', error)
    }
  }

  const handleInviteSuccess = () => {
    setShowInviteModal(false)
    fetchTenants() // Refresh the list
  }

  const handleRemoveTenant = async (tenantId: string) => {
    if (!confirm('Da li ste sigurni da želite da uklonite ovog stanara?')) {
      return
    }

    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      })

      if (response.ok) {
        fetchTenants() // Refresh the list
      } else {
        alert('Greška pri uklanjanju stanara')
      }
    } catch (error) {
      console.error('Error removing tenant:', error)
      alert('Greška pri uklanjanju stanara')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Aktivan'
      case 'pending':
        return 'Na čekanju'
      case 'inactive':
        return 'Neaktivan'
      default:
        return status
    }
  }

  // Filter tenants based on search and filters
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.apartment_number?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesBuilding = !selectedBuilding || tenant.building?.name === selectedBuilding
    const matchesStatus = !statusFilter || tenant.status === statusFilter

    return matchesSearch && matchesBuilding && matchesStatus
  })

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Nemate dozvolu</h1>
            <p className="text-gray-600 mt-2">Samo administratori mogu pristupiti ovoj stranici.</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Upravljanje stanarima</h1>
              <p className="text-gray-600 mt-2">Pozovite i upravljajte stanarima u vašim objektima</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Pozovi stanara
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ukupno stanara</p>
                <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aktivni stanari</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tenants.filter(t => t.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Mail className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pozivnice</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tenants.filter(t => t.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Objekti</p>
                <p className="text-2xl font-bold text-gray-900">{buildings.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Pretraži stanare..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Building Filter */}
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={selectedBuilding}
                  onChange={(e) => setSelectedBuilding(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Svi objekti</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.name}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Svi statusi</option>
                  <option value="active">Aktivni</option>
                  <option value="pending">Na čekanju</option>
                  <option value="inactive">Neaktivni</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              Stanari ({filteredTenants.length})
            </h3>
          </div>
          
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Učitavanje...</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-6 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {tenants.length === 0 ? 'Nema stanara' : 'Nema rezultata za pretragu'}
              </p>
              <div className="mt-4 text-sm text-gray-500">
                <p>Debug info:</p>
                <p>Tenants array length: {tenants.length}</p>
                <p>Filtered tenants length: {filteredTenants.length}</p>
                <p>Loading: {loading.toString()}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stanar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Objekat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stan/Sprat
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pozvan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akcije
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.user?.name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{tenant.user?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.building?.name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {tenant.building?.address}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          Stan {tenant.apartment?.apartment_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {tenant.apartment?.floor}. sprat
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(tenant.status)}`}>
                          {getStatusText(tenant.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tenant.invited_at).toLocaleDateString('sr-RS')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleRemoveTenant(tenant.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Ukloni
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite Tenant Modal */}
        {showInviteModal && (
          <InviteTenantModal
            buildings={buildings}
            onClose={() => setShowInviteModal(false)}
            onSuccess={handleInviteSuccess}
          />
        )}
      </div>
    </Layout>
  )
}