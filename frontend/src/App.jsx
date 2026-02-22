import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CreateAccount from './pages/CreateAccount'
import ManageAccounts from './pages/ManageAccounts'
import AccountDetails from './pages/AccountDetails'
import Users from './pages/Users'
import Statements from './pages/Statements'
import { isPrivilegedRole } from './utils/roles'
import './index.css'

function ProtectedRoute({ children }) {
  const user = localStorage.getItem('nx_user')
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const user = JSON.parse(localStorage.getItem('nx_user') || '{}')
  return isPrivilegedRole(user?.role) ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-account"
          element={
            <AdminRoute>
              <ProtectedRoute>
                <CreateAccount />
              </ProtectedRoute>
            </AdminRoute>
          }
        />
        <Route
          path="/request-account"
          element={
            <ProtectedRoute>
              <CreateAccount />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <ManageAccounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts/:id"
          element={
            <ProtectedRoute>
              <AccountDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/statements"
          element={
            <ProtectedRoute>
              <Statements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <AdminRoute>
              <ProtectedRoute>
                <Users />
              </ProtectedRoute>
            </AdminRoute>
          }
        />
      </Routes>
    </ToastProvider>
  )
}
