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
import AdminIssues from './pages/AdminIssues'
import Profile from './pages/Profile'
import Buildings from './pages/Buildings'
import BuildingDetail from './pages/BuildingDetail'
import BuildingForm from './pages/BuildingForm'
import Tenants from './pages/Tenants'
import Reports from './pages/Reports'
import ReportsIssues from './pages/ReportsIssues'
import ReportsTenants from './pages/ReportsTenants'
import ReportsBuildings from './pages/ReportsBuildings'
import ReportsPerformance from './pages/ReportsPerformance'

// Components
import LoadingSpinner from './components/LoadingSpinner'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const { user, loading, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (loading) {
    return <LoadingSpinner />
  }

  // Error boundary for auth issues
  if (!loading && user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Greška pri učitavanju
          </h2>
          <p className="text-gray-600 mb-4">
            Došlo je do greške pri inicijalizaciji aplikacije.
          </p>
          <div className="space-y-2">
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

  // Determine redirect path based on user role
  const getRedirectPath = () => {
    if (!user) return "/dashboard"
    
    const isCompany = user.app_metadata?.role === 'admin' || 
                     user.user_metadata?.role === 'company' || 
                     user.app_metadata?.role === 'company'
    
    return isCompany ? "/admin/dashboard" : "/dashboard"
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={user ? <Navigate to={getRedirectPath()} replace /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to={getRedirectPath()} replace /> : <Register />} 
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
          
          <Route path="/admin/issues" element={
            <ProtectedRoute adminOnly>
              <AdminIssues />
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
          
          {/* Tenant routes */}
          <Route path="/tenants" element={
            <ProtectedRoute adminOnly>
              <Tenants />
            </ProtectedRoute>
          } />
          
          {/* Reports routes */}
          <Route path="/reports" element={
            <ProtectedRoute adminOnly>
              <Reports />
            </ProtectedRoute>
          } />
          
          <Route path="/reports/issues" element={
            <ProtectedRoute adminOnly>
              <ReportsIssues />
            </ProtectedRoute>
          } />
          
          <Route path="/reports/tenants" element={
            <ProtectedRoute adminOnly>
              <ReportsTenants />
            </ProtectedRoute>
          } />
          
          <Route path="/reports/buildings" element={
            <ProtectedRoute adminOnly>
              <ReportsBuildings />
            </ProtectedRoute>
          } />
          
          <Route path="/reports/performance" element={
            <ProtectedRoute adminOnly>
              <ReportsPerformance />
            </ProtectedRoute>
          } />
          
          {/* Default redirect */}
          <Route path="/" element={
            user ? <Navigate to={getRedirectPath()} replace /> : <Navigate to="/login" replace />
          } />
        </Routes>
        
        <Toaster position="top-right" />
      </div>
    </Router>
  )
}

export default App
