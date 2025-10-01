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
