import React, { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { Address } from '../types/address'
import AddressAutocomplete from './AddressAutocomplete'
import CitySelect from './CitySelect'

interface AddressFormProps {
  address?: Address | null
  onSave: (address: Omit<Address, 'id'>) => Promise<{ error?: string }>
  onCancel: () => void
  isOpen: boolean
}

export const AddressForm: React.FC<AddressFormProps> = ({
  address,
  onSave,
  onCancel,
  isOpen
}) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    apartment: '',
    floor: '',
    entrance: '',
    notes: '',
    isDefault: false
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // Initialize form data when address changes
  useEffect(() => {
    if (address) {
      setFormData({
        name: address.name,
        address: address.address,
        city: address.city,
        apartment: address.apartment,
        floor: address.floor,
        entrance: address.entrance,
        notes: address.notes,
        isDefault: address.isDefault
      })
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        apartment: '',
        floor: '',
        entrance: '',
        notes: '',
        isDefault: false
      })
    }
    setError('')
  }, [address, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validacija
    if (!formData.name.trim()) {
      setError('Naziv adrese je obavezan')
      return
    }
    if (!formData.address.trim()) {
      setError('Adresa je obavezna')
      return
    }
    if (!formData.city.trim()) {
      setError('Grad je obavezan')
      return
    }

    setIsSaving(true)
    const result = await onSave(formData)
    setIsSaving(false)

    if (result.error) {
      setError(result.error)
    } else {
      onCancel() // Zatvori modal nakon uspješnog čuvanja
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {address ? 'Uredi adresu' : 'Dodaj novu adresu'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Naziv adrese */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Naziv adrese *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="npr. Kuća, Stan, Kancelarija..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Adresa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adresa *
            </label>
            <AddressAutocomplete
              value={formData.address}
              onChange={(value) => handleInputChange('address', value)}
              placeholder="Unesite adresu..."
            />
          </div>

          {/* Grad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Grad *
            </label>
            <CitySelect
              value={formData.city}
              onChange={(value) => handleInputChange('city', value)}
              placeholder="Odaberite grad..."
            />
          </div>

          {/* Stan i sprat */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stan
              </label>
              <input
                type="text"
                value={formData.apartment}
                onChange={(e) => handleInputChange('apartment', e.target.value)}
                placeholder="npr. 15"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sprat
              </label>
              <input
                type="text"
                value={formData.floor}
                onChange={(e) => handleInputChange('floor', e.target.value)}
                placeholder="npr. 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Broj ulaza */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Broj ulaza
            </label>
            <input
              type="text"
              value={formData.entrance}
              onChange={(e) => handleInputChange('entrance', e.target.value)}
              placeholder="npr. A, 1, 2..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Napomene */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Napomene
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Dodatne informacije o adresi..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Glavna adresa checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => handleInputChange('isDefault', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isDefault" className="ml-2 text-sm text-gray-700">
              Postavi kao glavnu adresu
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Čuva se...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Sačuvaj
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}