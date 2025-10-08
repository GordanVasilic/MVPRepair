import { useState, useEffect, useCallback, useRef } from 'react'
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
  Settings,
  CheckCircle,
  XCircle
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

interface AIAnalysis {
  category: string
  priority: string
  confidence: number
  reasoning: string
  estimatedCost?: string
  estimatedTime?: string
  solution?: string
  room?: string
}

// Dodajemo interface za keširan opis slike
interface CachedImageAnalysis {
  imageHashes: string[]
  description: string
  timestamp: number
}

// Interface for tenant information
interface TenantInfo {
  id: string
  building_id: string
  apartment_number: string
  floor_number: number
  building_name: string
  building_address: string
}

export default function ReportIssue() {
  const navigate = useNavigate()
  const { user, addresses } = useAuthStore()
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  
  // Debug: Log aiAnalysis state changes
  useEffect(() => {
    console.log('🧠 aiAnalysis state changed:', aiAnalysis)
  }, [aiAnalysis])
  const [customRoom, setCustomRoom] = useState<string>('')
  const [showCustomRoom, setShowCustomRoom] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{[key: number]: number}>({})
  const [uploadingImages, setUploadingImages] = useState<boolean>(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Dodajemo state za keširanje analize slike
  const [cachedImageAnalysis, setCachedImageAnalysis] = useState<CachedImageAnalysis | null>(null)
  const [imageBase64Cache, setImageBase64Cache] = useState<string[]>([])

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

  const watchedTitle = watch('title')
  const watchedDescription = watch('description')
  const selectedAddressId = watch('address_id')
  const selectedRoom = watch('room')
  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId)

  // Fetch tenant information for the current user
  const fetchTenantInfo = useCallback(async () => {
    if (!user) return

    try {
      // Check if user is a tenant by looking for their tenant record
      const { data: tenantData, error } = await supabase
        .from('apartment_tenants_with_details')
        .select(`
          id,
          apartment_id,
          building_id,
          apartment_number,
          floor,
          building_name,
          building_address
        `)
        .eq('tenant_id', user.id)
        .eq('status', 'active')
        .single()

      if (error) {
        console.log('User is not a tenant or error fetching tenant info:', error)
        return
      }

      if (tenantData && tenantData.building) {
        const tenant: TenantInfo = {
          id: tenantData.id,
          building_id: tenantData.building_id,
          apartment_number: tenantData.apartment_number,
          floor_number: tenantData.floor_number,
          building_name: tenantData.building.name,
          building_address: tenantData.building.address
        }
        
        setTenantInfo(tenant)
        console.log('🏠 Tenant info loaded:', tenant)
      }
    } catch (error) {
      console.error('Error fetching tenant info:', error)
    }
  }, [user])

  // Fetch tenant info on component mount
  useEffect(() => {
    fetchTenantInfo()
  }, [fetchTenantInfo])

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

  // Function to resize image if it's too large
  const resizeImage = (file: File, maxWidth: number = 800, maxHeight: number = 600, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width *= ratio
          height *= ratio
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(resizedFile)
          } else {
            resolve(file) // Fallback to original if resize fails
          }
        }, file.type, quality)
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  // Function to convert image to base64
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove the data:image/jpeg;base64, prefix to get just the base64 string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Funkcija za kreiranje hash-a slike (stabilniji hash na osnovu sadržaja)
  const createImageHash = (file: File): string => {
    // Koristimo samo ime i veličinu jer se lastModified mijenja
    return `${file.name}_${file.size}`
  }

  // Funkcija za provjeru da li su slike promijenjene
  const areImagesChanged = (currentImages: File[]): boolean => {
    if (!cachedImageAnalysis) {
      console.log('🔍 areImagesChanged: Nema keša - vraćam true')
      return true
    }
    
    const currentHashes = currentImages.map(createImageHash).sort() // Sortiramo za konzistentnost
    const cachedHashes = [...cachedImageAnalysis.imageHashes].sort() // Sortiramo keš hash-ove
    
    console.log('🔍 areImagesChanged: Current hashes:', currentHashes)
    console.log('🔍 areImagesChanged: Cached hashes:', cachedHashes)
    
    if (currentHashes.length !== cachedHashes.length) {
      console.log('🔍 areImagesChanged: Različit broj slika - vraćam true')
      return true
    }
    
    const changed = !currentHashes.every((hash, index) => hash === cachedHashes[index])
    console.log('🔍 areImagesChanged: Slike promijenjene?', changed)
    return changed
  }

  // Optimizovana AI analiza koja koristi keširan opis slike
  const analyzeIssueWithAI = useCallback(async (title: string, description: string, forceImageAnalysis: boolean = false, imagesToAnalyze?: File[]) => {
    console.log('🚀 analyzeIssueWithAI POZVANA - title:', title, 'description:', description, 'forceImageAnalysis:', forceImageAnalysis)
    
    // Koristimo proslijeđene slike ili trenutne selectedImages
    const imagesToUse = imagesToAnalyze || selectedImages
    console.log('🚀 isAnalyzing:', isAnalyzing, 'imagesToUse.length:', imagesToUse.length)
    
    if (isAnalyzing) {
      console.log('⏸️ Analiza već u toku - preskačem')
      return
    }
    
    if (!title && !description && imagesToUse.length === 0) {
      console.log('❌ Nema title, description ni slika - izlazim')
      return
    }
    
    const combinedText = [title, description].filter(Boolean).join(' ')
    console.log('📝 Combined text:', combinedText, 'length:', combinedText.trim().length)
    
    if (combinedText.trim().length < 5 && imagesToUse.length === 0) {
      console.log('❌ Tekst prekratak i nema slika - izlazim')
      return
    }

    console.log('✅ Sve provjere prošle - pokrećem analizu')
    setIsAnalyzing(true)
    try {
      console.log(`🔍 Analyzing with ${imagesToUse.length} images and text: "${combinedText.substring(0, 50)}..."`)
      console.log(`🔍 Force image analysis: ${forceImageAnalysis}`)
      
      let imageDescription = ''
      let base64Images: string[] = []
      
      // Provjeri da li trebamo analizirati slike
      if (imagesToUse.length > 0) {
        const imagesChanged = areImagesChanged(imagesToUse)
        
        console.log('🔍 Provjera keša: imagesChanged =', imagesChanged, 'forceImageAnalysis =', forceImageAnalysis, 'cachedImageAnalysis =', !!cachedImageAnalysis)
        
        if (imagesChanged || forceImageAnalysis || !cachedImageAnalysis) {
          console.log('📸 Analiziram slike jer su promijenjene ili nema keša')
          // Konvertuj slike u base64
          base64Images = await Promise.all(
            imagesToUse.map(async (image) => {
              try {
                const resizedImage = await resizeImage(image)
                return await convertImageToBase64(resizedImage)
              } catch (error) {
                console.error('Error converting image to base64:', error)
                return null
              }
            })
          ).then(results => results.filter(Boolean) as string[])
          
          // Sačuvaj base64 u cache
          setImageBase64Cache(base64Images)
        } else {
          console.log('💾 Koristim keširan opis slike:', cachedImageAnalysis.description.substring(0, 50) + '...')
          imageDescription = cachedImageAnalysis.description
          base64Images = imageBase64Cache
        }
      }

      const payload = {
        text: combinedText,
        images: base64Images,
        cachedImageDescription: imageDescription // Dodajemo keširan opis
      }

      const response = await fetch('/api/ai/analyze-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('AI analysis result:', result)
      
      // Backend returns { success: true, data: AIAnalysis, imageDescription?: string }
      if (result.success && result.data) {
        const analysis: AIAnalysis = result.data
        console.log('Setting AI analysis state:', analysis)
        setAiAnalysis(analysis)
        
        // Ako je vraćen novi opis slike, sačuvaj ga u keš
        if (result.imageDescription && imagesToUse.length > 0) {
          const imageHashes = imagesToUse.map(createImageHash).sort() // Sortiramo hash-ove
          console.log('💾 Čuvam u keš - Image hashes:', imageHashes)
          console.log('💾 Čuvam u keš - Description:', result.imageDescription.substring(0, 50) + '...')
          setCachedImageAnalysis({
            imageHashes,
            description: result.imageDescription,
            timestamp: Date.now()
          })
          console.log('✅ Sačuvan novi opis slike u keš')
        }
        
        // Auto-fill the form with AI suggestions
        setValue('category', analysis.category)
        setValue('priority', analysis.priority as 'low' | 'medium' | 'high' | 'urgent')
        
        // Auto-select room if AI suggested one
        if (analysis.room) {
          setValue('room', analysis.room)
        }
        
        console.log('✅ AI analysis state should be set now')
      } else {
        console.log('⚠️ No valid analysis data received:', result)
      }
    } catch (error) {
      console.error('❌ AI analysis failed:', error)
      toast.error('Greška pri AI analizi')
      // Fallback to basic keyword analysis
      const basicAnalysis = basicKeywordAnalysis(combinedText)
      if (basicAnalysis) {
        setAiAnalysis(basicAnalysis)
        setValue('category', basicAnalysis.category)
        setValue('priority', basicAnalysis.priority as 'low' | 'medium' | 'high' | 'urgent')
        if (basicAnalysis.room) {
          setValue('room', basicAnalysis.room)
        }
      }
    } finally {
      setIsAnalyzing(false)
      console.log('🏁 AI analysis finished - isAnalyzing set to false')
    }
  }, [setValue, selectedImages, cachedImageAnalysis, imageBase64Cache])

  // Uklanjamo legacy funkciju jer sada koristimo optimizovanu analyzeIssueWithAI direktno

  // Basic keyword analysis fallback
  const basicKeywordAnalysis = (text: string): AIAnalysis => {
    const lowerText = text.toLowerCase()
    
    if (lowerText.includes('voda') || lowerText.includes('curi') || lowerText.includes('poplava')) {
      return {
        category: 'Voda/Vodovod',
        priority: 'urgent',
        confidence: 0.8,
        reasoning: 'Detektovan problem sa vodom na osnovu ključnih riječi',
        room: lowerText.includes('kuhinja') ? 'Kuhinja' : lowerText.includes('kupaonica') || lowerText.includes('kupatilo') || lowerText.includes('wc') ? 'Kupatilo' : 'Ostalo'
      }
    }
    
    if (lowerText.includes('struja') || lowerText.includes('elektrika') || lowerText.includes('prekidač')) {
      return {
        category: 'Struja/Elektrika',
        priority: 'high',
        confidence: 0.8,
        reasoning: 'Detektovan električni problem na osnovu ključnih riječi',
        room: 'Ostalo'
      }
    }
    
    if (lowerText.includes('grijanje') || lowerText.includes('radijator') || lowerText.includes('klima')) {
      return {
        category: 'Klima/Grijanje',
        priority: 'high',
        confidence: 0.7,
        reasoning: 'Detektovan problem sa grijanjem/klimom na osnovu ključnih riječi',
        room: 'Ostalo'
      }
    }
    
    return {
      category: 'Ostalo',
      priority: 'medium',
      confidence: 0.3,
      reasoning: 'Nije moguće precizno klasifikovati problem',
      room: 'Ostalo'
    }
  }

  // Optimizovan debounced AI analysis za promjene teksta
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Trigger analysis if we have meaningful text OR images
    const hasText = (watchedTitle && watchedTitle.length > 3) || (watchedDescription && watchedDescription.length > 10)
    const hasImages = selectedImages && selectedImages.length > 0
    
    if (hasText || hasImages) {
      debounceTimerRef.current = setTimeout(() => {
        console.log('🔄 Triggering AI analysis - Text changed')
        // Ne forsiramo analizu slike jer se tekst mijenja
        analyzeIssueWithAI(watchedTitle || '', watchedDescription || '', false)
      }, 1500) // Povećano na 1.5 sekunde za bolje debouncing
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [watchedTitle, watchedDescription]) // Uklanjamo analyzeIssueWithAI iz dependency array-a

  // Handle room selection change
  useEffect(() => {
    if (selectedRoom === 'Drugo') {
      setShowCustomRoom(true)
    } else {
      setShowCustomRoom(false)
      setCustomRoom('')
    }
  }, [selectedRoom])

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🖼️ handleImageSelect POZVANA')
    const files = Array.from(event.target.files || [])
    console.log('🖼️ Broj novih fajlova:', files.length)
    console.log('🖼️ Trenutni selectedImages.length:', selectedImages.length)
    
    if (files.length + selectedImages.length > 5) {
      toast.error('Možete dodati maksimalno 5 slika')
      return
    }
    
    const newImages = [...selectedImages, ...files]
    console.log('🖼️ Novi array slika - length:', newImages.length)
    console.log('🖼️ Pozivam setSelectedImages sa:', newImages.map(f => f.name))
    
    setSelectedImages(newImages)
    console.log('🖼️ setSelectedImages pozvana - čekam state update')
    
    // Process and analyze images immediately when they change
    if (files.length > 0) {
      // Clear any existing debounce timer since we want immediate analysis for new images
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      
      // Forsiramo analizu slike jer su dodane nove slike
      console.log('📷 Nove slike dodane - forsiram analizu')
      console.log('📷 Proslijeđujem slike direktno u analyzeIssueWithAI:', newImages.map(f => f.name))
      
      // Proslijeđujemo slike direktno u funkciju umjesto čekanja state update-a
      analyzeIssueWithAI(watchedTitle || '', watchedDescription || '', true, newImages)
    }
  }

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  // Function to sanitize filename for URL-safe storage
  const sanitizeFileName = (fileName: string): string => {
    // Get file extension
    const lastDotIndex = fileName.lastIndexOf('.')
    const name = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName
    const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : ''
    
    // Replace special characters with their ASCII equivalents
    const sanitizedName = name
      .replace(/[ćč]/g, 'c')
      .replace(/[đ]/g, 'd')
      .replace(/[š]/g, 's')
      .replace(/[ž]/g, 'z')
      .replace(/[ĆČ]/g, 'C')
      .replace(/[Đ]/g, 'D')
      .replace(/[Š]/g, 'S')
      .replace(/[Ž]/g, 'Z')
      // Replace spaces and other special characters with underscores
      .replace(/[\s\-\(\)\[\]{}]/g, '_')
      // Remove any remaining non-alphanumeric characters except underscores
      .replace(/[^a-zA-Z0-9_]/g, '')
      // Remove multiple consecutive underscores
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '')
    
    return sanitizedName + extension
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
      
      // Determine apartment_id with fallback logic
      let apartmentId = null
      
      console.log('🔍 Starting apartment_id search...')
      console.log('📋 tenantInfo:', tenantInfo)
      console.log('📋 selectedAddress:', selectedAddress)
      
      // First try to use tenantInfo if available (for registered tenants)
      if (tenantInfo?.id) {
        console.log('🏠 Searching apartment via tenantInfo...')
        console.log('🔍 Search params:', {
          building_id: tenantInfo.building_id,
          apartment_number: tenantInfo.apartment_number
        })
        
        // For registered tenants, we already have apartment_id from apartment_tenants_with_details
        if (tenantInfo.apartment_id) {
          apartmentId = tenantInfo.apartment_id
          console.log('✅ Found apartment_id from tenantInfo:', apartmentId)
        }
      }
      
      // Fallback: try to find apartment_id from selected address
      if (!apartmentId && selectedAddress) {
        console.log('🏠 Searching apartment via selectedAddress...')
        console.log('🔍 Search params:', {
          building_id: selectedAddress.buildingId,
          apartment_number: selectedAddress.apartment
        })
        
        // If address has buildingId (inherited address), try to find apartment
        if (selectedAddress.buildingId && selectedAddress.apartment) {
          try {
            const { data: apartment, error: apartmentError } = await supabase
              .from('apartments')
              .select('id, apartment_number')
              .eq('building_id', selectedAddress.buildingId)
              .eq('apartment_number', selectedAddress.apartment)
              .single()
            
            console.log('📊 Selected address apartment query result:', { apartment, error: apartmentError })
            
            if (!apartmentError && apartment) {
              apartmentId = apartment.id
              console.log('✅ Found apartment_id from selected address:', apartmentId)
            } else {
              console.error('❌ Selected address apartment query failed:', apartmentError)
              
              // Try case-insensitive search as fallback
              console.log('🔄 Trying case-insensitive search for selected address...')
              const { data: apartmentsCaseInsensitive, error: caseError } = await supabase
                .from('apartments')
                .select('id, apartment_number')
                .eq('building_id', selectedAddress.buildingId)
                .ilike('apartment_number', selectedAddress.apartment)
                .single()
              
              console.log('📊 Selected address case-insensitive result:', { apartmentsCaseInsensitive, error: caseError })
              
              if (!caseError && apartmentsCaseInsensitive) {
                apartmentId = apartmentsCaseInsensitive.id
                console.log('✅ Found apartment_id via case-insensitive search (selected address):', apartmentId)
              }
            }
          } catch (error) {
            console.error('⚠️ Exception in selectedAddress apartment search:', error)
          }
        }
      }
      
      // Final check and debug info
      console.log('🎯 Final apartment_id result:', apartmentId)
      
      if (!apartmentId) {
        console.error('❌ CRITICAL: No apartment_id found! Issue will be created without apartment reference.')
        console.log('🔍 Debug info for troubleshooting:')
        console.log('- tenantInfo:', tenantInfo)
        console.log('- selectedAddress:', selectedAddress)
        
        // Let's also check what apartments exist for this building
        const buildingId = tenantInfo?.building_id || selectedAddress?.buildingId
        if (buildingId) {
          try {
            const { data: allApartments, error: debugError } = await supabase
              .from('apartments')
              .select('id, apartment_number, building_id')
              .eq('building_id', buildingId)
            
            console.log('🏢 All apartments in building:', allApartments)
            console.log('🔍 Looking for apartment_number:', tenantInfo?.apartment_number || selectedAddress?.apartment)
          } catch (debugError) {
            console.error('Debug query failed:', debugError)
          }
        }
      }
      
      // Determine building_id for location_details
      const buildingId = tenantInfo?.building_id || selectedAddress?.buildingId
      
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
          apartment_id: apartmentId, // Use the determined apartment_id - building and company will be linked through this
          location_details: {
            address: selectedAddress?.address,
            city: selectedAddress?.city,
            apartment: selectedAddress?.apartment,
            floor: tenantInfo?.floor_number || selectedAddress?.floor,
            entrance: selectedAddress?.entrance,
            room: finalRoom,
            notes: selectedAddress?.notes,
            building_id: buildingId, // Keep in location_details for backward compatibility
            tenant_id: tenantInfo?.id
          }
        })
        .select()
        .single()

      if (error) throw error

      // Upload images if any
      if (selectedImages.length > 0 && issue) {
        setUploadingImages(true)
        
        for (let i = 0; i < selectedImages.length; i++) {
          const image = selectedImages[i]
          const sanitizedFileName = sanitizeFileName(image.name)
          const fileName = `${issue.id}/${Date.now()}-${sanitizedFileName}`
          
          // Simulate progress for better UX
          setUploadProgress(prev => ({ ...prev, [i]: 0 }))
          
          // Simulate upload progress
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const currentProgress = prev[i] || 0
              if (currentProgress < 90) {
                return { ...prev, [i]: currentProgress + 10 }
              }
              return prev
            })
          }, 100)
          
          try {
            const { error: uploadError } = await supabase.storage
              .from('issue-images')
              .upload(fileName, image)

            clearInterval(progressInterval)
            setUploadProgress(prev => ({ ...prev, [i]: 100 }))

            if (uploadError) {
              console.error('Error uploading image:', uploadError)
              toast.error(`Greška pri upload-u slike ${i + 1}: ${uploadError.message}`)
              continue // Continue with next image instead of stopping
            }

            const { data: { publicUrl } } = supabase.storage
              .from('issue-images')
              .getPublicUrl(fileName)

            console.log('💾 Saving image record to database:', {
              issue_id: issue.id,
              image_url: publicUrl,
              image_name: sanitizedFileName
            })

            const { error: insertError } = await supabase
              .from('issue_images')
              .insert({
                issue_id: issue.id,
                image_url: publicUrl,
                image_name: sanitizedFileName
              })

            if (insertError) {
              console.error('❌ Error saving image record:', insertError)
              toast.error(`Greška pri čuvanju slike ${i + 1} u bazu`)
            } else {
              console.log('✅ Successfully saved image record to database')
            }
          } catch (error) {
            clearInterval(progressInterval)
            console.error('Unexpected error uploading image:', error)
            toast.error(`Neočekivana greška pri upload-u slike ${i + 1}`)
          }
        }
        
        setUploadingImages(false)
        setUploadProgress({})
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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return 'Nizak'
      case 'medium': return 'Srednji'
      case 'high': return 'Visok'
      case 'urgent': return 'Hitno'
      default: return priority
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'urgent': return 'text-red-600'
      default: return 'text-gray-600'
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
            {/* 1. Address selection */}
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
                  {addresses.map((address, index) => {
                    const displayText = `${address.name} - ${address.city}, ${address.address}`
                    const truncatedText = displayText.length > 50 
                      ? displayText.substring(0, 47) + '...' 
                      : displayText
                    return (
                      <option 
                        key={`${address.id}-${index}`} 
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

            {/* 2. Image upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fotografije problema (opcionalno)
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
                        disabled={uploadingImages}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      
                      {/* Upload progress */}
                      {uploadingImages && uploadProgress[index] !== undefined && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                          <div className="text-center text-white">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                            <div className="text-xs">{uploadProgress[index]}%</div>
                            <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                              <div 
                                className="bg-blue-600 h-1 rounded-full transition-all duration-300" 
                                style={{ width: `${uploadProgress[index]}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* AI Analysis loading indicator */}
                      {isAnalyzing && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-75 rounded-lg flex items-center justify-center">
                          <div className="text-center text-white">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-1" />
                            <div className="text-xs font-medium">Analiziram...</div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}            </div>

            {/* 3. Title */}
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

            {/* 4. Description */}
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
            </div>

            {/* 5. AI Analysis Section */}
            {(isAnalyzing || aiAnalysis) && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">Majstorova procjena</h3>
                    
                    {isAnalyzing ? (
                      <div className="flex items-center text-sm text-blue-700">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {selectedImages.length > 0 && (!watchedTitle && !watchedDescription) ? 
                          'Analiziram sliku...' : 
                          selectedImages.length > 0 ? 
                            'Analiziram sliku i tekst...' : 
                            'Analiziram problem...'
                        }
                      </div>
                    ) : aiAnalysis ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-700">Kategorija:</span>
                          <span className="text-sm font-medium text-blue-900">{aiAnalysis.category}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-700">Prioritet:</span>
                          <span className={`text-sm font-medium ${getPriorityColor(aiAnalysis.priority)}`}>
                            {getPriorityLabel(aiAnalysis.priority)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-700">Sigurnost:</span>
                          <span className="text-sm font-medium text-blue-900">
                            {Math.round(aiAnalysis.confidence * 100)}%
                          </span>
                        </div>
                        <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs text-blue-800">
                          <strong>Objašnjenje:</strong> {aiAnalysis.reasoning}
                        </div>
                        
                        {/* Cost and Time Estimates */}
                        {(aiAnalysis.estimatedCost || aiAnalysis.estimatedTime || aiAnalysis.solution) && (
                          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
                            {aiAnalysis.solution && (
                              <div className="mb-2">
                                <strong className="text-green-800">Rješenje:</strong> 
                                <span className="text-green-700 ml-1">{aiAnalysis.solution}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              {aiAnalysis.estimatedCost && (
                                <div>
                                  <strong className="text-green-800">Trošak:</strong> 
                                  <span className="text-green-700 ml-1">{aiAnalysis.estimatedCost}</span>
                                </div>
                              )}
                              {aiAnalysis.estimatedTime && (
                                <div>
                                  <strong className="text-green-800">Vrijeme:</strong> 
                                  <span className="text-green-700 ml-1">{aiAnalysis.estimatedTime}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-2 flex items-center text-xs text-blue-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Polja su automatski popunjena. Možete ih promijeniti ako je potrebno.
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* 6. Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategorija
                {aiAnalysis && (
                  <span className="ml-2 text-xs text-blue-600 font-normal">
                    (AI prijedlog: {aiAnalysis.category})
                  </span>
                )}
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

            {/* 7. Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prioritet
                {aiAnalysis && (
                  <span className={`ml-2 text-xs font-normal ${getPriorityColor(aiAnalysis.priority)}`}>
                    (AI prijedlog: {getPriorityLabel(aiAnalysis.priority)})
                  </span>
                )}
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

            {/* 8. Room selection */}
            {selectedAddress && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prostorija
                  {aiAnalysis && aiAnalysis.room && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      (AI prijedlog: {aiAnalysis.room})
                    </span>
                  )}
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