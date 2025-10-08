import { useState, useEffect } from 'react'
import { X, Mail, Building2, MapPin, Hash } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface Building {
  id: string
  name: string
  address: string
}

interface Apartment {
  id: string
  apartment_number: string
  floor: number
  building_id: string
}

interface InviteTenantModalProps {
  buildings: Building[]
  onClose: () => void
  onSuccess: () => void
}

export default function InviteTenantModal({ buildings, onClose, onSuccess }: InviteTenantModalProps) {
  const { user } = useAuthStore()
  const [formData, setFormData] = useState({
    email: '',
    building_id: '',
    apartment_id: ''
  })
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [loadingApartments, setLoadingApartments] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Fetch apartments when building is selected
  useEffect(() => {
    if (formData.building_id) {
      fetchApartments(formData.building_id)
    } else {
      setApartments([])
    }
  }, [formData.building_id])

  const fetchApartments = async (buildingId: string) => {
    setLoadingApartments(true)
    try {
      const response = await fetch(`/api/buildings/${buildingId}/apartments`, {
        headers: {
          'Authorization': `Bearer ${user?.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setApartments(data.apartments || [])
      } else {
        console.error('Failed to fetch apartments')
        setApartments([])
      }
    } catch (error) {
      console.error('Error fetching apartments:', error)
      setApartments([])
    } finally {
      setLoadingApartments(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!formData.email || !formData.apartment_id) {
      setError('Sva polja su obavezna')
      setLoading(false)
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Unesite validnu email adresu')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/tenants/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify({
          email: formData.email,
          apartment_id: formData.apartment_id
        })
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
      } else {
        setError(data.error || 'Greška pri slanju pozivnice')
      }
    } catch (error) {
      console.error('Error inviting tenant:', error)
      setError('Greška pri slanju pozivnice')
    } finally {
      setLoading(false)
    }
  }

  const selectedBuilding = buildings.find(b => b.id === formData.building_id)
  const selectedApartment = apartments.find(a => a.id === formData.apartment_id)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Pozovi stanara</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email adresa
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="stanar@example.com"
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Building */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Objekat
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={formData.building_id}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  building_id: e.target.value,
                  apartment_id: '' // Reset apartment when building changes
                })}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Izaberite objekat</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedBuilding && (
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <MapPin className="w-3 h-3 mr-1" />
                {selectedBuilding.address}
              </div>
            )}
          </div>

          {/* Apartment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stan
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={formData.apartment_id}
                onChange={(e) => setFormData({ ...formData, apartment_id: e.target.value })}
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!formData.building_id || loadingApartments}
              >
                <option value="">
                  {!formData.building_id 
                    ? 'Prvo izaberite objekat' 
                    : loadingApartments 
                    ? 'Učitavanje...' 
                    : 'Izaberite stan'
                  }
                </option>
                {apartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    Stan {apartment.apartment_number} ({apartment.floor}. sprat)
                  </option>
                ))}
              </select>
            </div>
            {selectedApartment && (
              <div className="mt-1 text-sm text-gray-500">
                Stan {selectedApartment.apartment_number}, {selectedApartment.floor}. sprat
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-600">
              Pozivnica će biti poslana na email adresu. Stanar će moći da se registruje koristeći link iz pozivnice.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading || !formData.apartment_id}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Šalje se...' : 'Pošalji pozivnicu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}