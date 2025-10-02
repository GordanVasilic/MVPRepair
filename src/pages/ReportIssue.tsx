import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { 
  Camera, 
  X, 
  AlertTriangle,
  Loader2,
  Sparkles,
  Settings
} from 'lucide-react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const issueSchema = z.object({
  title: z.string().min(5, 'Naslov mora imati najmanje 5 karaktera'),
  description: z.string().min(10, 'Opis mora imati najmanje 10 karaktera'),
  address_id: z.string().min(1, 'Molimo odaberite adresu'),
  room: z.string().min(1, 'Molimo odaberite prostoriju'),
  category: z.string().min(1, 'Molimo odaberite kategoriju'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
}).refine((data) => {
  // If room is "Drugo", we need to validate customRoom separately in the component
  return true;
}, {
  message: "Validacija prostorije"
})

type IssueForm = z.infer<typeof issueSchema>

export default function ReportIssue() {
  const navigate = useNavigate()
  const { user, addresses } = useAuthStore()
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<string>('')
  const [customRoom, setCustomRoom] = useState<string>('')
  const [showCustomRoom, setShowCustomRoom] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<IssueForm>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      priority: 'medium',
      address_id: addresses.find(addr => addr.isDefault)?.id || ''
    }
  })

  const watchedDescription = watch('description')
  const selectedAddressId = watch('address_id')
  const selectedRoom = watch('room')
  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId)

  // Predefined rooms for each address
  const availableRooms = [
    'Dnevna soba',
    'Kuhinja',
    'Spavaća soba',
    'Kupatilo',
    'WC',
    'Hodnik',
    'Balkon',
    'Terasa',
    'Ostava',
    'Garaža',
    'Drugo'
  ]

  // Predefined categories for issues
  const availableCategories = [
    'Struja/Elektrika',
    'Voda/Vodovod',
    'Klima/Grijanje',
    'Lift/Elevator',
    'Vrata/Prozori',
    'Krov/Fasada',
    'Podovi/Pločice',
    'Sanitarije/Kupatilo',
    'Kuhinja/Aparati',
    'Sigurnost/Brave',
    'Ostalo'
  ]

  const analyzeIssueWithAI = useCallback(async (description: string) => {
    setIsAnalyzing(true)
    try {
      // Simulate AI analysis - in real app, this would call OpenAI API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock AI suggestions based on keywords
      let suggestion = ''
      let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
      
      const desc = description.toLowerCase()
      
      if (desc.includes('voda') || desc.includes('curi') || desc.includes('poplava')) {
        suggestion = 'Detektovan problem sa vodom - preporučujem hitnu intervenciju'
        priority = 'urgent'
      } else if (desc.includes('struja') || desc.includes('elektrika') || desc.includes('prekidač')) {
        suggestion = 'Električni problem - potrebna je provjera od strane električara'
        priority = 'high'
      } else if (desc.includes('grijanje') || desc.includes('radijator') || desc.includes('hladno')) {
        suggestion = 'Problem sa grijanjem - kontaktirajte tehničku službu'
        priority = 'high'
      } else if (desc.includes('vrata') || desc.includes('prozor') || desc.includes('kvaka')) {
        suggestion = 'Mehanički problem - potrebna je intervencija majstora'
        priority = 'medium'
      } else if (desc.includes('buka') || desc.includes('zvuk') || desc.includes('glasno')) {
        suggestion = 'Problem sa bukom - možda je potrebna izolacija'
        priority = 'low'
      } else {
        suggestion = 'Opći kvar - preporučujem detaljniji opis problema'
        priority = 'medium'
      }
      
      setAiSuggestion(suggestion)
      setValue('priority', priority)
      
    } catch (error) {
      console.error('Error analyzing issue:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [setValue])

  useEffect(() => {
    // AI analysis when description changes
    if (watchedDescription && watchedDescription.length > 20) {
      analyzeIssueWithAI(watchedDescription)
    }
  }, [watchedDescription, analyzeIssueWithAI])

  // Handle room selection change
  useEffect(() => {
    if (selectedRoom === 'Drugo') {
      setShowCustomRoom(true)
    } else {
      setShowCustomRoom(false)
      setCustomRoom('')
    }
  }, [selectedRoom])

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length + selectedImages.length > 5) {
      toast.error('Možete dodati maksimalno 5 slika')
      return
    }
    setSelectedImages(prev => [...prev, ...files])
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: IssueForm) => {
    setIsSubmitting(true)
    
    // Validate custom room if "Drugo" is selected
    if (data.room === 'Drugo' && !customRoom.trim()) {
      toast.error('Molimo unesite naziv prostorije')
      setIsSubmitting(false)
      return
    }
    
    try {
      const selectedAddress = addresses.find(addr => addr.id === data.address_id)
      
      // Determine the final room value
      const finalRoom = data.room === 'Drugo' ? customRoom.trim() : data.room
      
      // Create issue
      const { data: issue, error } = await supabase
        .from('issues')
        .insert({
          user_id: user?.id,
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          status: 'open',
          location_details: {
            address: selectedAddress?.address,
            city: selectedAddress?.city,
            apartment: selectedAddress?.apartment,
            floor: selectedAddress?.floor,
            entrance: selectedAddress?.entrance,
            room: finalRoom,
            notes: selectedAddress?.notes
          }
        })
        .select()
        .single()

      if (error) throw error

      // Upload images if any
      if (selectedImages.length > 0 && issue) {
        for (const image of selectedImages) {
          const fileName = `${issue.id}/${Date.now()}-${image.name}`
          
          const { error: uploadError } = await supabase.storage
            .from('issue-images')
            .upload(fileName, image)

          if (uploadError) {
            console.error('Error uploading image:', uploadError)
            toast.error(`Greška pri upload-u slike: ${uploadError.message}`)
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('issue-images')
              .getPublicUrl(fileName)

            const { error: insertError } = await supabase
              .from('issue_images')
              .insert({
                issue_id: issue.id,
                image_url: publicUrl,
                image_name: image.name
              })

            if (insertError) {
              console.error('Error saving image record:', insertError)
            }
          }
        }
      }

      toast.success('Kvar je uspješno prijavljen!')
      navigate('/issues')
      
    } catch (error) {
      console.error('Error creating issue:', error)
      toast.error('Greška pri prijavljivanju kvara')
    } finally {
      setIsSubmitting(false)
    }
  }



  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Prijavi kvar</h1>
            <p className="mt-2 text-gray-600">
              Opišite problem detaljno kako bismo mogli što brže reagovati.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Address selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresa
              </label>
              <div className="flex gap-2">
                <select
                  {...register('address_id')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-w-full"
                  style={{ maxWidth: '100%' }}
                >
                  <option value="">Odaberite adresu</option>
                  {addresses.map((address) => {
                    const displayText = `${address.name} - ${address.city}, ${address.address}`
                    const truncatedText = displayText.length > 50 
                      ? displayText.substring(0, 47) + '...' 
                      : displayText
                    return (
                      <option 
                        key={address.id} 
                        value={address.id}
                        title={displayText}
                        style={{ 
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {truncatedText}
                      </option>
                    )
                  })}
                </select>
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
                  title="Upravljaj adresama"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
              {errors.address_id && (
                <p className="mt-1 text-sm text-red-600">{errors.address_id.message}</p>
              )}
              {selectedAddress && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    <strong>{selectedAddress.name}</strong><br />
                    {selectedAddress.address}, {selectedAddress.city}
                    {selectedAddress.apartment && `, Stan: ${selectedAddress.apartment}`}
                    {selectedAddress.floor && `, Sprat: ${selectedAddress.floor}`}
                    {selectedAddress.entrance && `, Ulaz: ${selectedAddress.entrance}`}
                  </p>
                </div>
              )}
            </div>

            {/* Room selection */}
            {selectedAddress && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prostorija
                </label>
                <select
                  {...register('room')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Odaberite prostoriju</option>
                  {availableRooms.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                </select>
                {errors.room && (
                  <p className="mt-1 text-sm text-red-600">{errors.room.message}</p>
                )}
                
                {/* Custom room input */}
                {showCustomRoom && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unesite naziv prostorije
                    </label>
                    <input
                      type="text"
                      value={customRoom}
                      onChange={(e) => setCustomRoom(e.target.value)}
                      placeholder="npr. Radionica, Podrum, Tavanski prostor..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {selectedRoom === 'Drugo' && !customRoom && (
                      <p className="mt-1 text-sm text-red-600">Molimo unesite naziv prostorije</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Naslov problema
              </label>
              <input
                {...register('title')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Kratko opišite problem..."
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategorija
              </label>
              <select
                {...register('category')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Odaberite kategoriju</option>
                {availableCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Detaljni opis
              </label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Opišite problem što detaljnije..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
              
              {/* AI Analysis */}
              {isAnalyzing && (
                <div className="mt-2 flex items-center text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  AI analizira problem...
                </div>
              )}
              
              {aiSuggestion && !isAnalyzing && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-start">
                    <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">AI preporuka:</p>
                      <p className="text-sm text-blue-700">{aiSuggestion}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioritet
              </label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Nizak</option>
                <option value="medium">Srednji</option>
                <option value="high">Visok</option>
                <option value="urgent">Hitno</option>
              </select>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fotografije (opcionalno)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Camera className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="images" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Dodajte fotografije problema
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        PNG, JPG do 5MB (maksimalno 5 slika)
                      </span>
                    </label>
                    <input
                      id="images"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Selected images */}
              {selectedImages.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {selectedImages.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Preview ${index + 1}`}
                        className="h-24 w-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Otkaži
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Prijavljivanje...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Prijavi kvar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}