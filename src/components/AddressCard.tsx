import React, { useState } from 'react'
import { MapPin, Edit, Trash2, Star } from 'lucide-react'
import { Address } from '../types/address'

interface AddressCardProps {
  address: Address
  onEdit: (address: Address) => void
  onDelete: (id: string) => void
  onSetDefault: (id: string) => void
  disabled?: boolean
}

export const AddressCard: React.FC<AddressCardProps> = ({
  address,
  onEdit,
  onDelete,
  onSetDefault,
  disabled = false
}) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    await onDelete(address.id)
    setIsDeleting(false)
  }

  const formatAddress = () => {
    const parts = []
    if (address.address) parts.push(address.address)
    if (address.city) parts.push(address.city)
    if (address.apartment) parts.push(`Stan ${address.apartment}`)
    if (address.floor) parts.push(`${address.floor}. sprat`)
    if (address.entrance) parts.push(`Ulaz ${address.entrance}`)
    return parts.join(', ')
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${address.isDefault ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <h3 className="font-medium text-gray-900">{address.name}</h3>
          {address.isDefault && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              <Star className="w-3 h-3 fill-current" />
              Glavna
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(address)}
            disabled={disabled}
            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Uredi adresu"
          >
            <Edit className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDelete}
            disabled={disabled || isDeleting}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Obriši adresu"
          >
            <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-3">
        {formatAddress()}
      </div>

      {address.notes && (
        <div className="text-sm text-gray-500 mb-3 p-2 bg-gray-50 rounded">
          <strong>Napomene:</strong> {address.notes}
        </div>
      )}

      {!address.isDefault && (
        <button
          onClick={() => onSetDefault(address.id)}
          disabled={disabled}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Postavi kao glavnu adresu
        </button>
      )}
    </div>
  )
}