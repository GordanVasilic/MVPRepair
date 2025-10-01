import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Calendar, User, AlertCircle } from 'lucide-react'
import Layout from '../components/Layout'

export default function IssueDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Mock data - ovo će biti zamijenjeno sa pravim API pozivom
  const issue = {
    id: id,
    title: 'Curenje vode iz slavine',
    description: 'Slavina u kuhinji curi već nekoliko dana. Potrebna je hitna popravka.',
    status: 'pending',
    priority: 'high',
    category: 'Vodoinstalacije',
    location: 'Kuhinja',
    createdAt: '2024-01-15',
    reportedBy: 'Marko Petrović',
    images: []
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
                  {issue.createdAt}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {issue.reportedBy}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {issue.location}
                </span>
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

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Kategorija</h3>
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              {issue.category}
            </span>
          </div>

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