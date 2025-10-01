import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, User, AlertCircle, Loader2 } from 'lucide-react'
import Layout from '../components/Layout'
import { supabase, type Issue } from '../lib/supabase'
import { toast } from 'sonner'

export default function IssueDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [issue, setIssue] = useState<Issue | null>(null)
  const [loading, setLoading] = useState(true)

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

    fetchIssue()
  }, [id, navigate])

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
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
        <div className="max-w-4xl mx-auto p-6 text-center">
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
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/issues')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Nazad na listu
          </button>
        </div>

        {/* Issue Details Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {issue.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(issue.created_at).toLocaleDateString('sr-RS')}
                </span>
                {issue.apartment && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Stan {issue.apartment.apartment_number} - {issue.apartment.floor}. sprat
                  </span>
                )}
                {issue.location_details?.room && (
                  <span>
                    {String(issue.location_details.room)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(issue.status)}`}>
                {issue.status === 'pending' ? 'Na čekanju' : 
                 issue.status === 'in_progress' ? 'U toku' : 'Završeno'}
              </span>
              <div className="flex items-center gap-1">
                <AlertCircle className={`w-4 h-4 ${getPriorityColor(issue.priority)}`} />
                <span className={`text-sm font-medium ${getPriorityColor(issue.priority)}`}>
                  {issue.priority === 'high' ? 'Visok prioritet' :
                   issue.priority === 'medium' ? 'Srednji prioritet' : 'Nizak prioritet'}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Opis problema</h3>
            <p className="text-gray-700 leading-relaxed">
              {issue.description}
            </p>
          </div>

          {issue.category && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Kategorija</h3>
              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {issue.category}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Preuzmi zadatak
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Označi kao riješeno
            </button>
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              Dodaj komentar
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}