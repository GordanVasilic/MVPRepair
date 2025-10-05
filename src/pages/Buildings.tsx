import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Filter, 
  Building2,
  MapPin,
  Plus,
  Edit,
  Eye,
  Layers
} from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Building } from '../types/building'
import { toast } from 'sonner'

export default function Buildings() {
  const { user } = useAuthStore()
  const [buildings, setBuildings] = useState<Building[]>([])
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const isAdmin = user?.app_metadata?.role === 'admin' ||
                  user?.user_metadata?.role === 'company' || user?.app_metadata?.role === 'company'

  const fetchBuildings = useCallback(async () => {
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
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching buildings:', error)
        toast.error('Greška pri učitavanju objekata')
        return
      }

      if (data) {
        setBuildings(data)
      }
    } catch (error) {
      console.error('Buildings fetch error:', error)
      toast.error('Greška pri učitavanju objekata')
    } finally {
      setLoading(false)
    }
  }, [])

  const filterBuildings = useCallback(() => {
    let filtered = buildings

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(building =>
        building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        building.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (building.description && building.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    setFilteredBuildings(filtered)
  }, [buildings, searchTerm])

  useEffect(() => {
    fetchBuildings()
  }, [fetchBuildings])

  useEffect(() => {
    filterBuildings()
  }, [filterBuildings])

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Objekti</h1>
            <p className="text-gray-600">Upravljanje objektima firme</p>
          </div>
          
          {isAdmin && (
            <Link
              to="/buildings/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Dodaj objekat
            </Link>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Pretraži objekte..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Buildings List */}
        <div className="space-y-4">
          {filteredBuildings.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-sm text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'Nema rezultata pretrage' : 'Nema objekata'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Pokušajte sa drugim pojmom pretrage'
                  : 'Dodajte prvi objekat da biste počeli'
                }
              </p>
              {isAdmin && !searchTerm && (
                <Link
                  to="/buildings/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj objekat
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBuildings.map((building) => (
                <div key={building.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    {/* Building Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {building.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-start mb-4">
                      <MapPin className="h-4 w-4 text-gray-400 mt-1 mr-2 flex-shrink-0" />
                      <p className="text-gray-600 text-sm">{building.address}</p>
                    </div>

                    {/* Floors Count */}
                    {building.building_models && building.building_models.length > 0 && (
                      <div className="flex items-center mb-4">
                        <Layers className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">
                          {building.building_models[0].floors_count} sprat{building.building_models[0].floors_count !== 1 ? 'ova' : ''}
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {building.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {building.description}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex space-x-2">
                        <Link
                          to={`/buildings/${building.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Prikaži
                        </Link>
                        
                        {isAdmin && (
                          <Link
                            to={`/buildings/${building.id}/edit`}
                            className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Uredi
                          </Link>
                        )}
                      </div>
                      
                      <span className="text-xs text-gray-500">
                        {new Date(building.created_at).toLocaleDateString('sr-RS')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        {filteredBuildings.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600">
              Prikazano {filteredBuildings.length} od {buildings.length} objekata
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}