import { useState } from 'react'
import { Users, AlertTriangle, CheckCircle, Clock, BarChart3, Settings } from 'lucide-react'
import Layout from '../components/Layout'

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'issues' | 'reports'>('overview')

  // Mock data
  const stats = {
    totalUsers: 45,
    activeIssues: 12,
    resolvedIssues: 38,
    pendingIssues: 8
  }

  const recentIssues = [
    { id: 1, title: 'Curenje vode u kuhinji', user: 'Marko Petrović', priority: 'high', status: 'pending' },
    { id: 2, title: 'Prekidač ne radi', user: 'Ana Jovanović', priority: 'medium', status: 'in_progress' },
    { id: 3, title: 'Vrata se ne zatvaraju', user: 'Petar Nikolić', priority: 'low', status: 'pending' }
  ]

  const users = [
    { id: 1, name: 'Marko Petrović', email: 'marko@example.com', role: 'resident', issues: 3 },
    { id: 2, name: 'Ana Jovanović', email: 'ana@example.com', role: 'resident', issues: 1 },
    { id: 3, name: 'Petar Nikolić', email: 'petar@example.com', role: 'maintenance', issues: 0 }
  ]

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Upravljanje korisnicima i kvarovima</p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Pregled', icon: BarChart3 },
              { id: 'users', label: 'Korisnici', icon: Users },
              { id: 'issues', label: 'Kvarovi', icon: AlertTriangle },
              { id: 'reports', label: 'Izvještaji', icon: CheckCircle }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ukupno korisnika</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Aktivni kvarovi</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeIssues}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Riješeni kvarovi</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.resolvedIssues}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Na čekanju</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingIssues}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Issues */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Najnoviji kvarovi</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentIssues.map((issue) => (
                    <div key={issue.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{issue.title}</h4>
                        <p className="text-sm text-gray-600">Prijavio: {issue.user}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(issue.priority)}`}>
                          {issue.priority === 'high' ? 'Visok' : issue.priority === 'medium' ? 'Srednji' : 'Nizak'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(issue.status)}`}>
                          {issue.status === 'pending' ? 'Na čekanju' : issue.status === 'in_progress' ? 'U toku' : 'Završeno'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Upravljanje korisnicima</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Korisnik
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Uloga
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kvarovi
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Akcije
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'maintenance' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'admin' ? 'Admin' : user.role === 'maintenance' ? 'Održavanje' : 'Stanar'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.issues}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">Uredi</button>
                          <button className="text-red-600 hover:text-red-900">Ukloni</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Upravljanje kvarovima</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentIssues.map((issue) => (
                  <div key={issue.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{issue.title}</h4>
                        <p className="text-sm text-gray-600">Prijavio: {issue.user}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(issue.priority)}`}>
                          {issue.priority === 'high' ? 'Visok' : issue.priority === 'medium' ? 'Srednji' : 'Nizak'}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(issue.status)}`}>
                          {issue.status === 'pending' ? 'Na čekanju' : issue.status === 'in_progress' ? 'U toku' : 'Završeno'}
                        </span>
                        <button className="ml-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                          Dodijeli
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">Izvještaji</h3>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Izvještaji će biti dostupni uskoro</h3>
                <p className="text-gray-600">Ovdje će biti prikazani detaljni izvještaji o performansama i statistikama.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}