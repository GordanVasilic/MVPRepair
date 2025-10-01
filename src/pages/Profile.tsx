import { useState } from 'react'
import { User, Mail, Phone, MapPin, Camera, Save, Edit2 } from 'lucide-react'
import Layout from '../components/Layout'

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: 'Marko Petrović',
    email: 'marko.petrovic@example.com',
    phone: '+387 65 123 456',
    address: 'Zmaja od Bosne 12, Sarajevo',
    apartment: 'Stan 15, Zgrada A',
    role: 'resident'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSave = () => {
    // Ovdje će biti API poziv za ažuriranje profila
    setIsEditing(false)
    // Pokazati success poruku
  }

  const handleCancel = () => {
    // Reset form data to original values
    setFormData({
      name: 'Marko Petrović',
      email: 'marko.petrovic@example.com',
      phone: '+387 65 123 456',
      address: 'Zmaja od Bosne 12, Sarajevo',
      apartment: 'Stan 15, Zgrada A',
      role: 'resident'
    })
    setIsEditing(false)
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Moj profil</h1>
          <p className="text-gray-600">Upravljajte svojim ličnim podacima</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          {/* Header */}
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700">
                    <Camera className="w-3 h-3" />
                  </button>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{formData.name}</h2>
                  <p className="text-gray-600 capitalize">
                    {formData.role === 'resident' ? 'Stanar' : 
                     formData.role === 'maintenance' ? 'Održavanje' : 'Administrator'}
                  </p>
                </div>
              </div>
              
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                >
                  <Edit2 className="w-4 h-4" />
                  Uredi profil
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Otkaži
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Save className="w-4 h-4" />
                    Sačuvaj
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Form */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ime i prezime */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ime i prezime
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : 'bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email adresa
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : 'bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Broj telefona
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : 'bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Adresa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresa
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      !isEditing ? 'bg-gray-50 text-gray-500' : 'bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Stan/Apartman */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stan/Apartman
                </label>
                <input
                  type="text"
                  name="apartment"
                  value={formData.apartment}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    !isEditing ? 'bg-gray-50 text-gray-500' : 'bg-white'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Statistike */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">12</div>
              <div className="text-sm text-gray-600">Prijavljeni kvarovi</div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">8</div>
              <div className="text-sm text-gray-600">Riješeni kvarovi</div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">4</div>
              <div className="text-sm text-gray-600">U toku</div>
            </div>
          </div>
        </div>

        {/* Sigurnost */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">Sigurnost</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Promijeni lozinku</h4>
                    <p className="text-sm text-gray-600">Ažuriraj svoju lozinku</p>
                  </div>
                  <div className="text-gray-400">→</div>
                </div>
              </button>
              
              <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Dvofaktorska autentifikacija</h4>
                    <p className="text-sm text-gray-600">Dodatna sigurnost za tvoj nalog</p>
                  </div>
                  <div className="text-gray-400">→</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}