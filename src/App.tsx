import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from './stores/authStore'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ReportIssue from './pages/ReportIssue'
import Issues from './pages/Issues'
import IssueDetail from './pages/IssueDetail'
import ThreeDView from './pages/ThreeDView'
import AdminDashboard from './pages/AdminDashboard'
import Profile from './pages/Profile'
import Buildings from './pages/Buildings'
import BuildingDetail from './pages/BuildingDetail'
import BuildingForm from './pages/BuildingForm'

// Components
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { user, loading, initialize } = useAuthStore()

  useEffect(() => {
    console.log('🚀 App: useEffect pozvan, pokretanje initialize...')
    initialize()
  }, []) // Uklanjamo initialize iz dependency array-a da izbegnemo beskonačnu petlju

  console.log('🔍 App: Render - loading:', loading, 'user:', user ? 'postoji' : 'ne postoji')

  // Privremeno zaobiđi loading da vidimo da li se aplikacija uopšte učitava
  if (false && loading) {
    console.log('⏳ App: Prikazujem LoadingSpinner...')
    return <LoadingSpinner />
  }

  // Dodaj fallback UI sa timeout-om
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">🏠 Kućni Majstor MVP</h1>
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 mb-4">Aplikacija se učitava...</p>
          <div className="text-left text-sm text-gray-500 bg-gray-100 p-3 rounded">
            <div className="mb-2">📊 <strong>Status:</strong></div>
            <div>• Loading: <span className="font-mono">{loading ? 'true' : 'false'}</span></div>
            <div>• User: <span className="font-mono">{user ? 'postoji' : 'ne postoji'}</span></div>
            <div>• Vreme: <span className="font-mono">{new Date().toLocaleTimeString()}</span></div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ Ako se učitavanje produžava, možda postoji problem sa mrežom ili Supabase konekcijom.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
            >
              Osvežite stranicu
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" replace /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/dashboard" replace /> : <Register />} 
          />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/report-issue" element={
            <ProtectedRoute>
              <ReportIssue />
            </ProtectedRoute>
          } />
          
          <Route path="/issues" element={
            <ProtectedRoute>
              <Issues />
            </ProtectedRoute>
          } />
          
          <Route path="/issues/:id" element={
            <ProtectedRoute>
              <IssueDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/3d-view" element={
            <ProtectedRoute>
              <ThreeDView />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Building routes */}
          <Route path="/buildings" element={
            <ProtectedRoute>
              <Buildings />
            </ProtectedRoute>
          } />
          
          <Route path="/buildings/new" element={
            <ProtectedRoute adminOnly>
              <BuildingForm />
            </ProtectedRoute>
          } />
          
          <Route path="/buildings/:id" element={
            <ProtectedRoute>
              <BuildingDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/buildings/:id/edit" element={
            <ProtectedRoute adminOnly>
              <BuildingForm />
            </ProtectedRoute>
          } />
          
          {/* Default redirect */}
          <Route path="/" element={
            user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          } />
        </Routes>
        
        <Toaster position="top-right" />
      </div>
    </Router>
  )
}

export default App
