import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Building2, 
  Layers, 
  Edit, 
  Trash2,
  Eye,
  Grid,
  FileText
} from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { useAuthStore } from '../stores/authStore'
import { Building } from '../types/building'
import Building2D from '../components/Building2D/Building2D'
import { Issue2D } from '../types/building2d'

export default function BuildingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [building, setBuilding] = useState<Building | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [issues, setIssues] = useState<Issue2D[]>([])
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null)

  const isAdmin = user?.user_metadata?.role === 'admin' || user?.app_metadata?.role === 'admin' || 
                  user?.user_metadata?.role === 'company' || user?.app_metadata?.role === 'company'

  useEffect(() => {
    if (!id) {
      navigate('/buildings')
      return
    }

    const fetchBuilding = async () => {
      try {
        const { data, error } = await supabase
          .from('buildings')
          .select(`
            *,
            building_models (
              id,
              floors_count,
              model_config,
              created_at,
              updated_at
            ),
            floor_plans (
              id,
              floor_number,
              plan_config,
              rooms,
              created_at,
              updated_at
            )
          `)
          .eq('id', id)
          .single()

        if (error) {
          console.error('Error fetching building:', error)
          toast.error('Greška pri učitavanju objekta')
          navigate('/buildings')
          return
        }

        setBuilding(data)
      } catch (error) {
        console.error('Error:', error)
        toast.error('Greška pri učitavanju objekta')
        navigate('/buildings')
      } finally {
        setLoading(false)
      }
    }

    fetchBuilding()
    fetchIssues()
  }, [id, navigate])

  const fetchIssues = async () => {
    if (!id) return

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
          apartment:apartments (
            building_id,
            floor,
            apartment_number
          )
        `)
        .eq('apartment.building_id', id)

      if (error) {
        console.error('Error fetching issues:', error)
        return
      }

      // Transform issues to Issue3D format
      const transformedIssues: Issue3D[] = (data || []).map(issue => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        type: issue.category, // Use category instead of issue_type
        floorNumber: issue.apartment?.floor || 0, // Use apartment floor
        roomNumber: issue.apartment?.apartment_number || null, // Use apartment number
        position: {
          x: Math.random() * 80 + 10, // Random position for now
          y: Math.random() * 60 + 10,
          z: 0
        },
        createdAt: issue.created_at
      }))

      setIssues(transformedIssues)
    } catch (error) {
      console.error('Error fetching issues:', error)
    }
  }

  // Debug logging
  useEffect(() => {
    if (building) {
      console.log('=== BUILDING DEBUG INFO ===')
      console.log('Building data:', building)
      console.log('Building models:', building.building_models)
      console.log('Building models length:', building.building_models?.length)
      if (building.building_models && building.building_models.length > 0) {
        console.log('Floors count:', building.building_models[0].floors_count)
        console.log('Model config:', building.building_models[0].model_config)
        console.log('Has floors_count?', !!building.building_models[0].floors_count)
        console.log('Floors count type:', typeof building.building_models[0].floors_count)
      } else {
        console.log('NO BUILDING MODELS FOUND!')
      }
      console.log('=== END DEBUG INFO ===')
    }
  }, [building])

  const handleDelete = async () => {
    if (!building || !isAdmin) return

    const confirmed = window.confirm(
      `Da li ste sigurni da želite da obrišete objekat "${building.name}"? Ova akcija se ne može poništiti.`
    )

    if (!confirmed) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', building.id)

      if (error) {
        console.error('Error deleting building:', error)
        toast.error('Greška pri brisanju objekta')
        return
      }

      toast.success('Objekat je uspešno obrisan')
      navigate('/buildings')
    } catch (error) {
      console.error('Error:', error)
      toast.error('Greška pri brisanju objekta')
    } finally {
      setDeleting(false)
    }
  }

  const handleFloorClick = (floorNumber: number) => {
    setSelectedFloor(floorNumber === selectedFloor ? null : floorNumber)
  }

  const handleIssueClick = (issueId: string) => {
    // Navigate to issue detail or open modal
    navigate(`/issues/${issueId}`)
  }

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!building) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Objekat nije pronađen</h2>
          <p className="text-gray-600 mb-4">Traženi objekat ne postoji ili je uklonjen.</p>
          <Link
            to="/buildings"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Nazad na objekte
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/buildings')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{building.name}</h1>
              <p className="text-gray-600">Detalji objekta</p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center space-x-2">
              <Link
                to={`/buildings/${building.id}/edit`}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Uredi
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Brisanje...' : 'Obriši'}
              </button>
            </div>
          )}
        </div>

        {/* Building Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Basic Info */}
              <div>
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Naziv objekta</label>
                    <p className="text-gray-900 font-medium">{building.name}</p>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Adresa</label>
                    <p className="text-gray-900">{building.address}</p>
                  </div>
                </div>
              </div>

              {/* Floors Count */}
              {building.building_models && building.building_models.length > 0 && (
                <div>
                  <div className="flex items-start gap-3">
                    <Layers className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Broj spratova</label>
                      <p className="text-gray-900">
                        {building.building_models[0].floors_count} sprat{building.building_models[0].floors_count !== 1 ? 'ova' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Garage Levels */}
              {building.garage_levels !== undefined && building.garage_levels > 0 && (
                <div>
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Podrumski nivoi</label>
                      <p className="text-gray-900">
                        {building.garage_levels} nivo{building.garage_levels !== 1 ? 'a' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Created Date */}
              <div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Datum kreiranja</label>
                    <p className="text-gray-900">
                      {new Date(building.created_at).toLocaleDateString('sr-RS', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {building.description && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Opis</label>
                    <p className="text-gray-900">{building.description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2D Prikaz objekta */}
        <Building2D
          building={building}
          issues={issues}
          onFloorClick={handleFloorClick}
          onIssueClick={handleIssueClick}
        />

        {/* Building Model Details */}
        {building?.building_models && building.building_models.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h3 className="text-md font-medium text-gray-900 mb-4">Detalji modela</h3>
              <div className="space-y-4">
                {building.building_models[0].model_config.floors.map((floor, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-blue-600">{floor.number}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Sprat {floor.number}</p>
                        <p className="text-sm text-gray-600">Visina: {floor.height}m</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Pozicija: ({floor.position.x}, {floor.position.y}, {floor.position.z})
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link
                  to={`/buildings/${building.id}/3d-view`}
                  className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Detaljni 2D prikaz
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Floor Plans */}
        {building.floor_plans && building.floor_plans.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Grid className="h-5 w-5 mr-2" />
                Planovi spratova
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {building.floor_plans
                  .sort((a, b) => a.floor_number - b.floor_number)
                  .map((floorPlan) => (
                    <div key={floorPlan.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900">Sprat {floorPlan.floor_number}</h3>
                        <span className="text-xs text-gray-500">
                          {floorPlan.rooms.length} prostorij{floorPlan.rooms.length !== 1 ? 'a' : 'e'}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Širina: {floorPlan.plan_config.width}m</p>
                        <p>Visina: {floorPlan.plan_config.height}m</p>
                        <p>Grid: {floorPlan.plan_config.grid_size}m</p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                          Prikaži plan
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}