import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Address } from '../types/address'
import { AddressCard } from './AddressCard'
import { AddressForm } from './AddressForm'
import { useAuthStore } from '../stores/authStore'
import { toast } from 'sonner'

interface AddressManagerProps {
  disabled?: boolean
}

export const AddressManager: React.FC<AddressManagerProps> = ({ disabled = false }) => {
  const { addresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } = useAuthStore()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<Address | null>(null)

  const handleAddAddress = () => {
    setEditingAddress(null)
    setIsFormOpen(true)
  }

  const handleEditAddress = (address: Address) => {
    // Sprečiti uređivanje nasleđenih adresa
    if (address.isInherited) {
      toast.error('Ne možete menjati adresu dodeljenu od firme')
      return
    }
    setEditingAddress(address)
    setIsFormOpen(true)
  }

  const handleSaveAddress = async (addressData: Omit<Address, 'id'>) => {
    try {
      let result
      
      if (editingAddress) {
        // Ažuriranje postojeće adrese
        result = await updateAddress(editingAddress.id, addressData)
      } else {
        // Dodavanje nove adrese
        result = await addAddress(addressData)
      }

      if (result.error) {
        return { error: result.error }
      }

      toast.success(
        editingAddress ? 'Adresa je uspješno ažurirana' : 'Adresa je uspješno dodana'
      )
      return {}
    } catch (error) {
      const errorMessage = editingAddress 
        ? 'Greška pri ažuriranju adrese' 
        : 'Greška pri dodavanju adrese'
      return { error: errorMessage }
    }
  }

  const handleDeleteAddress = async (id: string) => {
    const addressToDelete = addresses.find(addr => addr.id === id)
    
    // Sprečiti brisanje nasleđenih adresa
    if (addressToDelete?.isInherited) {
      toast.error('Ne možete obrisati adresu dodeljenu od firme')
      return
    }

    if (addresses.length <= 1) {
      toast.error('Mora postojati najmanje jedna adresa')
      return
    }

    const result = await deleteAddress(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Adresa je uspješno obrisana')
    }
  }

  const handleSetDefaultAddress = async (id: string) => {
    const addressToSetDefault = addresses.find(addr => addr.id === id)
    
    // Sprečiti postavljanje nasleđenih adresa kao glavne
    if (addressToSetDefault?.isInherited) {
      toast.error('Ne možete postaviti adresu dodeljenu od firme kao glavnu')
      return
    }

    const result = await setDefaultAddress(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Glavna adresa je postavljena')
    }
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingAddress(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Moje adrese</h3>
        <button
          onClick={handleAddAddress}
          disabled={disabled || addresses.filter(addr => !addr.isInherited).length >= 5}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={addresses.filter(addr => !addr.isInherited).length >= 5 ? 'Maksimalno 5 ličnih adresa je dozvoljeno' : 'Dodaj novu adresu'}
        >
          <Plus className="w-4 h-4" />
          Dodaj novu adresu
        </button>
      </div>

      {/* Address limit info */}
      {addresses.filter(addr => !addr.isInherited).length >= 4 && (
        <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
          {addresses.filter(addr => !addr.isInherited).length === 5 
            ? 'Dostigli ste maksimalni broj ličnih adresa (5).'
            : `Možete dodati još ${5 - addresses.filter(addr => !addr.isInherited).length} ličnu adresu.`
          }
        </div>
      )}

      {/* Addresses list */}
      {addresses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="mb-4">
            <Plus className="w-12 h-12 mx-auto text-gray-300" />
          </div>
          <p className="text-lg font-medium mb-2">Nema dodanih adresa</p>
          <p className="text-sm mb-4">Dodajte svoju prvu adresu da biste mogli prijavljivati probleme.</p>
          <button
            onClick={handleAddAddress}
            disabled={disabled}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Dodaj adresu
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {/* Nasleđene adrese prvo */}
          {addresses.filter(addr => addr.isInherited).map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleEditAddress}
              onDelete={handleDeleteAddress}
              onSetDefault={handleSetDefaultAddress}
              disabled={disabled}
            />
          ))}
          
          {/* Lične adrese */}
          {addresses.filter(addr => !addr.isInherited).map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleEditAddress}
              onDelete={handleDeleteAddress}
              onSetDefault={handleSetDefaultAddress}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Address Form Modal */}
      <AddressForm
        address={editingAddress}
        onSave={handleSaveAddress}
        onCancel={handleCloseForm}
        isOpen={isFormOpen}
      />
    </div>
  )
}