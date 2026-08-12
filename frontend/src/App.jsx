import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'

// Lazy-loaded: recharts pulls in a large dependency tree that only the
// analytics page needs — code-splitting it keeps the initial bundle (every
// other page) small instead of shipping charting code to everyone.
const Analytics = lazy(() => import('./pages/Analytics'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <div
        className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 transition-colors">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageFallback />}>
                      <Analytics />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics/:urlId"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageFallback />}>
                      <Analytics />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </ThemeProvider>
  )
}
