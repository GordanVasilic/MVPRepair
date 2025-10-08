import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, User, AlertCircle, Loader2, X, Image as ImageIcon, Building, Home, Clock, Tag, FileText, MessageCircle, CheckCircle, Trash2 } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase, type Issue } from '../lib/supabase'
import { toast } from 'sonner'
import { useAuthStore } from '../stores/authStore'

interface IssueImage {
  id: string
  issue_id: string
  image_url: string
  image_name: string
  uploaded_at: string
}

interface IssueComment {
  id: string
  issue_id: string
  user_id: string
  comment: string
  created_at: string
  user_profiles?: {
    name: string
    email: string
  }
}

export default function IssueDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState<IssueImage[]>([])
  const [imagesLoading, setImagesLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [comments, setComments] = useState<IssueComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [resolvingIssue, setResolvingIssue] = useState(false)
  const [deletingIssue, setDeletingIssue] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!id) {
      navigate('/issues')
      return
    }

    const fetchIssue = async () => {
      try {
        const { data, error } = await supabase
          .from('issues')
          .select(`
            *,
            apartment:apartments (
              apartment_number,
              floor,
              building:buildings (
                name,
                address
              )
            )
          `)
          .eq('id', id)
          .single()

        if (error) {
          console.error('Error fetching issue:', error)
          toast.error('Greška pri učitavanju kvara')
          navigate('/issues')
          return
        }

        setIssue(data)
      } catch (error) {
        console.error('Error:', error)
        toast.error('Greška pri učitavanju kvara')
        navigate('/issues')
      } finally {
        setLoading(false)
      }
    }

    const fetchImages = async () => {
      console.log('🔍 Fetching images for issue ID:', id)
      try {
        const { data, error } = await supabase
          .from('issue_images')
          .select('*')
          .eq('issue_id', id)
          .order('uploaded_at', { ascending: true })

        console.log('📸 Images query result:', { data, error })
        
        if (error) {
          console.error('❌ Error fetching images:', error)
          toast.error('Greška pri učitavanju slika')
        } else {
          console.log('✅ Successfully fetched images:', data?.length || 0, 'images')
          setImages(data || [])
          
          // Debug: Log each image URL
          if (data && data.length > 0) {
            data.forEach((img, index) => {
              console.log(`🖼️ Image ${index + 1}:`, {
                id: img.id,
                name: img.image_name,
                url: img.image_url
              })
            })
          }
        }
      } catch (error) {
        console.error('💥 Unexpected error fetching images:', error)
        toast.error('Neočekivana greška pri učitavanju slika')
      } finally {
        setImagesLoading(false)
      }
    }

    const fetchComments = async () => {
      try {
        const { data, error } = await supabase
          .from('issue_comments')
          .select(`
            *,
            user_profiles (
              name,
              email
            )
          `)
          .eq('issue_id', id)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching comments:', error)
          toast.error('Greška pri učitavanju komentara')
        } else {
          setComments(data || [])
        }
      } catch (error) {
        console.error('Error fetching comments:', error)
        toast.error('Neočekivana greška pri učitavanju komentara')
      } finally {
        setCommentsLoading(false)
      }
    }

    fetchIssue()
    fetchImages()
    fetchComments()
  }, [id, navigate])

  const handleResolveIssue = async () => {
    if (!issue || !user) return

    setResolvingIssue(true)
    try {
      const { error } = await supabase
        .from('issues')
        .update({
          status: 'closed',
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', issue.id)

      if (error) {
        console.error('Error resolving issue:', error)
        toast.error('Greška pri označavanju kao riješeno')
        return
      }

      // Ažuriraj lokalno stanje
      setIssue(prev => prev ? {
        ...prev,
        status: 'closed',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } : null)

      toast.success('Kvar je uspješno označen kao riješen')
    } catch (error) {
      console.error('Error resolving issue:', error)
      toast.error('Neočekivana greška pri označavanju kao riješeno')
    } finally {
      setResolvingIssue(false)
    }
  }

  const handleDeleteIssue = async () => {
    if (!issue || !user) return

    setDeletingIssue(true)
    try {
      // Prvo obriši sve slike povezane sa kvarom
      const { error: imagesError } = await supabase
        .from('issue_images')
        .delete()
        .eq('issue_id', issue.id)

      if (imagesError) {
        console.error('Error deleting issue images:', imagesError)
        // Nastavi sa brisanjem kvara čak i ako slike nisu obrisane
      }

      // Obriši sve komentare povezane sa kvarom
      const { error: commentsError } = await supabase
        .from('issue_comments')
        .delete()
        .eq('issue_id', issue.id)

      if (commentsError) {
        console.error('Error deleting issue comments:', commentsError)
        // Nastavi sa brisanjem kvara čak i ako komentari nisu obrisani
      }

      // Obriši kvar
      const { error } = await supabase
        .from('issues')
        .delete()
        .eq('id', issue.id)
        .eq('user_id', user.id) // Dodatna sigurnost - samo vlasnik može obrisati

      if (error) {
        console.error('Error deleting issue:', error)
        toast.error('Greška pri brisanju kvara')
        return
      }

      toast.success('Kvar je uspješno obrisan')
      navigate('/issues')
    } catch (error) {
      console.error('Error deleting issue:', error)
      toast.error('Neočekivana greška pri brisanju kvara')
    } finally {
      setDeletingIssue(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !issue || !user) return

    setSubmittingComment(true)
    try {
      const { data, error } = await supabase
        .from('issue_comments')
        .insert({
          issue_id: issue.id,
          user_id: user.id,
          comment: newComment.trim()
        })
        .select(`
          *,
          user_profiles (
            name,
            email
          )
        `)
        .single()

      if (error) {
        console.error('Error adding comment:', error)
        toast.error('Greška pri dodavanju komentara')
        return
      }

      // Dodaj novi komentar u listu
      setComments(prev => [...prev, data])
      setNewComment('')
      setShowCommentModal(false)
      toast.success('Komentar je uspješno dodan')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Neočekivana greška pri dodavanju komentara')
    } finally {
      setSubmittingComment(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Učitavanje...</span>
          </div>
        </div>
      </Layout>
    )
  }

  if (!issue) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Kvar nije pronađen</h2>
          <p className="text-gray-600 mb-4">Traženi kvar ne postoji ili je uklonjen.</p>
          <button
            onClick={() => navigate('/issues')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Nazad na listu kvarova
          </button>
        </div>
      </Layout>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'assigned_to_master': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'closed': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Otvoren'
      case 'assigned_to_master': return 'Dodijeljen majstoru'
      case 'in_progress': return 'U toku'
      case 'closed': return 'Zatvoren'
      default: return status
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Hitno'
      case 'high': return 'Visok prioritet'
      case 'medium': return 'Srednji prioritet'
      case 'low': return 'Nizak prioritet'
      default: return priority
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('sr-RS', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/issues')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Nazad na listu
          </button>
          <div className="text-sm text-gray-500">
            Izvještaj #KV-{issue?.id?.slice(-6).toUpperCase()}
          </div>
        </div>

        {loading ? (
          <div className="max-w-6xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
            <div className="flex items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Učitavanje...</span>
            </div>
          </div>
        ) : !issue ? (
          <div className="max-w-6xl mx-auto p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Kvar nije pronađen</h2>
            <p className="text-gray-600 mb-4">Traženi kvar ne postoji ili je uklonjen.</p>
            <button
              onClick={() => navigate('/issues')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Nazad na listu kvarova
            </button>
          </div>
        ) : (
          <>
            {/* Report Header */}
            <div className="bg-white rounded-lg shadow-sm border mb-6">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Izvještaj o kvaru</h1>
                    <p className="text-blue-100">Detaljan pregled prijavljenog kvara</p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(issue.status)}`}>
                      {getStatusText(issue.status)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Basic Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {/* Issue Title */}
                  <div className="lg:col-span-2">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Naslov kvara</label>
                        <p className="text-lg font-semibold text-gray-900">{issue.title}</p>
                      </div>
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Prioritet</label>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityColor(issue.priority)}`}>
                          {getPriorityText(issue.priority)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Date Created */}
                  <div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Datum prijave</label>
                        <p className="text-gray-900">{formatDate(issue.created_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  {issue.category && (
                    <div>
                      <div className="flex items-start gap-3">
                        <Tag className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Kategorija</label>
                          <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {issue.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <h3 className="text-lg font-semibold text-gray-900">Potvrdi brisanje</h3>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Da li ste sigurni da želite da obrišete ovaj kvar? Ova akcija se ne može poništiti.
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Otkaži
                    </button>
                    <button
                      onClick={handleDeleteIssue}
                      disabled={deletingIssue}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {deletingIssue ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      {deletingIssue ? 'Brišem...' : 'Obriši kvar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

                  {/* Last Updated */}
                  <div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Poslednja izmjena</label>
                        <p className="text-gray-900">{formatDate(issue.updated_at || issue.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                <div className="border-t pt-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Lokacija kvara
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Address */}
                    {issue.location_details?.address && (
                      <div>
                        <div className="flex items-start gap-3">
                          <Building className="w-5 h-5 text-gray-400 mt-1" />
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Adresa</label>
                            <p className="text-gray-900">{String(issue.location_details.address)}</p>
                            {issue.location_details.city && (
                              <p className="text-gray-600 text-sm">{String(issue.location_details.city)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Apartment Details */}
                    {(issue.location_details?.apartment || issue.location_details?.floor || issue.location_details?.entrance) && (
                      <div>
                        <div className="flex items-start gap-3">
                          <Home className="w-5 h-5 text-gray-400 mt-1" />
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Detalji stana</label>
                            <div className="space-y-1">
                              {issue.location_details.apartment && (
                                <p className="text-gray-900">Stan: {String(issue.location_details.apartment)}</p>
                              )}
                              {issue.location_details.floor && (
                                <p className="text-gray-900">Sprat: {String(issue.location_details.floor)}</p>
                              )}
                              {issue.location_details.entrance && (
                                <p className="text-gray-900">Ulaz: {String(issue.location_details.entrance)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Room */}
                    {issue.location_details?.room && (
                      <div>
                        <div className="flex items-start gap-3">
                          <Home className="w-5 h-5 text-gray-400 mt-1" />
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Prostorija</label>
                            <p className="text-gray-900">{String(issue.location_details.room)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Notes */}
                  {issue.location_details?.notes && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Dodatne napomene o lokaciji</label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{String(issue.location_details.notes)}</p>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="border-t pt-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Opis problema</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{issue.description}</p>
                  </div>
                </div>

                {/* Images Section */}
                <div className="border-t pt-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Fotografije ({images.length})
                  </h3>
                  
                  {imagesLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 py-8">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Učitavanje slika...</span>
                    </div>
                  ) : images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {images.map((image, index) => (
                        <div 
                          key={image.id} 
                          className="relative cursor-pointer group"
                          onClick={() => setSelectedImage(image.image_url)}
                        >
                          <img
                            src={image.image_url}
                            alt={`Slika ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-gray-200 group-hover:opacity-80 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Nema priloženih fotografija</p>
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Komentari ({comments.length})
                  </h3>
                  
                  {commentsLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 py-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Učitavanje komentara...</span>
                    </div>
                  ) : comments.length > 0 ? (
                    <div className="space-y-4 mb-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {comment.user_profiles?.name || comment.user_profiles?.email || 'Nepoznat korisnik'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 mb-4">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>Nema komentara</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Akcije</h3>
              <div className="flex flex-wrap gap-3">
                {issue.status !== 'closed' && (
                  <button 
                    onClick={handleResolveIssue}
                    disabled={resolvingIssue}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {resolvingIssue ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {resolvingIssue ? 'Označavam...' : 'Označi kao riješeno'}
                  </button>
                )}
                <button 
                  onClick={() => setShowCommentModal(true)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Dodaj komentar
                </button>
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Štampaj izvještaj
                </button>
                {/* Dugme za brisanje kvara - vidljivo samo vlasniku */}
                {user && issue.user_id === user.id && (
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Obriši kvar
                  </button>
                )}
              </div>
            </div>

            {/* Comment Modal */}
            {showCommentModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Dodaj komentar</h3>
                    <button
                      onClick={() => setShowCommentModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Unesite komentar..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                  />
                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      onClick={() => setShowCommentModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Otkaži
                    </button>
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || submittingComment}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submittingComment ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                      {submittingComment ? 'Dodajem...' : 'Dodaj komentar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Image Modal */}
            {selectedImage && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
                onClick={() => setSelectedImage(null)}
              >
                <div className="relative max-w-4xl max-h-full">
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                  >
                    <X className="w-8 h-8" />
                  </button>
                  <img
                    src={selectedImage}
                    alt="Uvećana slika"
                    className="max-w-full max-h-full object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}