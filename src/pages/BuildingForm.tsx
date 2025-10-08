import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft, Building2, MapPin, Layers, FileText, Save, Home, Eye } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { Building, CreateBuildingRequest, UpdateBuildingRequest } from '../types/building'

const buildingSchema = z.object({
  name: z.string().min(1, 'Naziv objekta je obavezan'),
  address: z.string().min(1, 'Adresa je obavezna'),
  description: z.string().optional(),
  floors_count: z.number().min(1, 'Broj spratova mora biti najmanje 1').max(50, 'Maksimalno 50 spratova'),
  garage_levels: z.number().min(0, 'Broj garažnih nivoa mora biti 0 ili više').max(10, 'Maksimalno 10 garažnih nivoa'),
  apartments_per_floor: z.number().min(1, 'Broj apartmana po spratu mora biti najmanje 1').max(20, 'Maksimalno 20 apartmana po spratu')
})

type BuildingFormData = z.infer<typeof buildingSchema>

// Helper function to generate apartment numbers
const generateApartmentNumbers = (floorsCount: number, apartmentsPerFloor: number) => {
  const apartments = []
  const letters = 'ABCDEFGHIJKLMNOPQRST' // Up to 20 apartments per floor
  
  for (let floor = 1; floor <= floorsCount; floor++) {
    for (let apt = 0; apt < apartmentsPerFloor; apt++) {
      apartments.push({
        floor,
        number: `${floor}${letters[apt]}`,
        letter: letters[apt]
      })
    }
  }
  
  return apartments
}

export default function BuildingForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!!id)
  const [building, setBuilding] = useState<Building | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const isAdmin = user?.app_metadata?.role === 'admin' ||
                  user?.user_metadata?.role === 'company' || user?.app_metadata?.role === 'company'
  const isEdit = !!id

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    control
  } = useForm<BuildingFormData>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      name: '',
      address: '',
      description: '',
      floors_count: 1,
      garage_levels: 0,
      apartments_per_floor: 2
    }
  })

  // Watch form values for preview
  const watchedValues = useWatch({ control })
  const previewApartments = generateApartmentNumbers(
    watchedValues.floors_count || 1, 
    watchedValues.apartments_per_floor || 2
  )

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      toast.error('Nemate dozvolu za pristup ovoj stranici')
      navigate('/buildings')
    }
  }, [isAdmin, navigate])

  // Load building data for editing
  useEffect(() => {
    if (!id) return

    const fetchBuilding = async () => {
      try {
        const { data, error } = await supabase
          .from('buildings')
          .select(`
            *,
            building_models (
              floors_count
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
        
        // Populate form with existing data
        setValue('name', data.name)
        setValue('address', data.address)
        setValue('description', data.description || '')
        setValue('floors_count', data.building_models?.[0]?.floors_count || 1)
        setValue('garage_levels', data.garage_levels || 0)
        setValue('apartments_per_floor', data.apartments_per_floor || 2)
        
      } catch (error) {
        console.error('Error:', error)
        toast.error('Greška pri učitavanju objekta')
        navigate('/buildings')
      } finally {
        setInitialLoading(false)
      }
    }

    fetchBuilding()
  }, [id, navigate, setValue])

  const onSubmit = async (data: BuildingFormData) => {
    if (!isAdmin) return

    setLoading(true)
    try {
      // Get current session and validate authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        throw new Error('Greška pri dobijanju sesije: ' + sessionError.message)
      }
      
      if (!session?.access_token) {
        toast.error('Niste prijavljeni. Molimo prijavite se ponovo.')
        navigate('/login')
        return
      }

      if (isEdit && building) {
        // Update existing building
        const updateData: UpdateBuildingRequest = {
          name: data.name,
          address: data.address,
          description: data.description,
          floors_count: data.floors_count,
          garage_levels: data.garage_levels,
          apartments_per_floor: data.apartments_per_floor
        }

        const response = await fetch(`/api/buildings/${building.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          let errorMessage = 'Greška pri ažuriranju objekta'
          
          if (response.status === 401) {
            toast.error('Niste autorizovani. Molimo prijavite se ponovo.')
            navigate('/login')
            return
          }
          
          if (response.status === 403) {
            toast.error('Nemate dozvolu za ovu akciju.')
            return
          }
          
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (jsonError) {
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          }
          
          throw new Error(errorMessage)
        }

        toast.success('Objekat je uspešno ažuriran')
        navigate(`/buildings/${building.id}`)
      } else {
        // Create new building
        const createData: CreateBuildingRequest = {
          name: data.name,
          address: data.address,
          description: data.description,
          floors_count: data.floors_count,
          garage_levels: data.garage_levels,
          apartments_per_floor: data.apartments_per_floor
        }

        const response = await fetch('/api/buildings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(createData)
        })

        if (!response.ok) {
          let errorMessage = 'Greška pri kreiranju objekta'
          
          if (response.status === 401) {
            toast.error('Niste autorizovani. Molimo prijavite se ponovo.')
            navigate('/login')
            return
          }
          
          if (response.status === 403) {
            toast.error('Nemate dozvolu za kreiranje objekata.')
            return
          }
          
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (jsonError) {
            // If JSON parsing fails, use the response status text
            errorMessage = `Server error: ${response.status} ${response.statusText}`
          }
          throw new Error(errorMessage)
        }

        const result = await response.json()
        toast.success('Objekat je uspešno kreiran')
        navigate(`/buildings/${result.building.id}`)
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error(error instanceof Error ? error.message : 'Greška pri čuvanju objekta')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return null
  }

  if (initialLoading) {
    return (
      <Layout>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/buildings')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Uredi objekat' : 'Dodaj novi objekat'}
            </h1>
            <p className="text-gray-600">
              {isEdit ? 'Ažurirajte informacije o objektu' : 'Unesite osnovne informacije o objektu'}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Building Name */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Building2 className="h-4 w-4 mr-2" />
                Naziv objekta *
              </label>
              <input
                type="text"
                {...register('name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Unesite naziv objekta"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 mr-2" />
                Adresa *
              </label>
              <input
                type="text"
                {...register('address')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Unesite adresu objekta"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
              )}
            </div>

            {/* Floors Count */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Layers className="h-4 w-4 mr-2" />
                Broj spratova *
              </label>
              <input
                type="number"
                min="1"
                max="50"
                {...register('floors_count', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1"
              />
              {errors.floors_count && (
                <p className="mt-1 text-sm text-red-600">{errors.floors_count.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Unesite broj spratova iznad prizemlja (1-50)
              </p>
            </div>

            {/* Garage Levels */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Layers className="h-4 w-4 mr-2" />
                Broj garažnih nivoa
              </label>
              <input
                type="number"
                min="0"
                max="10"
                {...register('garage_levels', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
              {errors.garage_levels && (
                <p className="mt-1 text-sm text-red-600">{errors.garage_levels.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Unesite broj garažnih/podrumskih nivoa ispod zemlje (0-10)
              </p>
            </div>

            {/* Apartments per Floor */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <Home className="h-4 w-4 mr-2" />
                Broj apartmana po spratu *
              </label>
              <input
                type="number"
                min="1"
                max="20"
                {...register('apartments_per_floor', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2"
              />
              {errors.apartments_per_floor && (
                <p className="mt-1 text-sm text-red-600">{errors.apartments_per_floor.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Unesite broj apartmana po spratu (1-20)
              </p>
            </div>

            {/* Preview Button */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Sakrij pregled' : 'Prikaži pregled apartmana'}
              </button>
              
              {showPreview && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Pregled apartmana ({previewApartments.length} ukupno)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                    {Array.from({ length: watchedValues.floors_count || 1 }, (_, floorIndex) => {
                      const floor = floorIndex + 1
                      const floorApartments = previewApartments.filter(apt => apt.floor === floor)
                      return (
                        <div key={floor} className="bg-white p-3 rounded border">
                          <div className="text-xs font-medium text-gray-600 mb-2">
                            {floor}. sprat
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {floorApartments.map(apt => (
                              <span
                                key={apt.number}
                                className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                              >
                                {apt.number}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    }).reverse()}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                <FileText className="h-4 w-4 mr-2" />
                Opis (opciono)
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Unesite dodatne informacije o objektu..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/buildings')}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Otkaži
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Čuvanje...' : (isEdit ? 'Ažuriraj objekat' : 'Kreiraj objekat')}
              </button>
            </div>
          </form>
        </div>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Napomene:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Naziv objekta i adresa su obavezni podaci</li>
            <li>• Broj spratova se koristi za kreiranje 3D modela objekta</li>
            <li>• Broj apartmana po spratu određuje raspored stanova</li>
            <li>• Apartmani se numerišu kao: 1A, 1B, 2A, 2B, itd.</li>
            <li>• Opis je opcioni i može sadržavati dodatne informacije</li>
            {isEdit && (
              <li>• Promena broja spratova ili apartmana će ažurirati strukturu objekta</li>
            )}
          </ul>
        </div>
      </div>
    </Layout>
  )
}