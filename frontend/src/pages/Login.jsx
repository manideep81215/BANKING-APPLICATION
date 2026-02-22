import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { loginUser, registerUser } from '../api/bankingApi'
import { useToast } from '../components/Toast'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

function Login() {
  const navigate = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState('login')
  const [loginPortal, setLoginPortal] = useState('USER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    number: '',
    role: 'USER',
  })

  const onChange = (key, value) => setForm((p) => ({ ...p, [key]: value }))

  const submitLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await loginUser({
        email: form.email,
        password: form.password,
      })

      const resolvedRole = String(data?.role || 'USER').toUpperCase()
      if (loginPortal === 'USER' && resolvedRole !== 'USER') {
        setError('This account is not a user account.')
        setLoading(false)
        return
      }
      if (loginPortal === 'ADMIN' && resolvedRole !== 'ADMIN') {
        setError('This account is not an admin account.')
        setLoading(false)
        return
      }
      if (loginPortal === 'MANAGER' && resolvedRole !== 'MANAGER') {
        setError('This account is not a manager account.')
        setLoading(false)
        return
      }

      localStorage.setItem(
        'nx_user',
        JSON.stringify({
          id: data?.userId,
          name: data?.name || form.email?.split('@')[0] || 'User',
          email: data?.email || form.email,
          role: resolvedRole,
        }),
      )
      if (data?.token) localStorage.setItem('nx_token', data.token)

      toast(data?.message || 'Login successful', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(
        err?.response?.data ||
          (err?.request
            ? `Backend not reachable at ${API_BASE_URL}. Check VITE_API_BASE_URL and backend status.`
            : 'Login failed. Please check your credentials.'),
      )
    } finally {
      setLoading(false)
    }
  }

  const submitRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        number: form.number ? Number(form.number) : null,
        role: form.role || 'USER',
      })
      toast(data?.message || 'Registration successful. Please login.', 'success')
      setTab('login')
      setForm((p) => ({ ...p, password: '' }))
    } catch (err) {
      setError(
        err?.response?.data ||
          (err?.request
            ? `Backend not reachable at ${API_BASE_URL}. Check VITE_API_BASE_URL and backend status.`
            : 'Registration failed.'),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div className="bg-mesh" />
      <div className="bg-grid" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ width: '100%', maxWidth: 560, padding: 32, position: 'relative', zIndex: 1 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <img src="/gmbank-logo.svg" alt="GMbank" style={{ width: 36, height: 36, borderRadius: 9 }} />
            <div className="brand-text" style={{ fontSize: '1.8rem' }}>GMbank</div>
          </div>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Private Banking Access</p>
        </div>

        <div className="tab-bar" style={{ marginBottom: 20 }}>
          <button className={`tab-btn ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>
            Login
          </button>
          <button className={`tab-btn ${tab === 'register' ? 'active' : ''}`} onClick={() => setTab('register')}>
            Register
          </button>
        </div>

        {error && (
          <div className="field-alert field-alert-error">
            <i className="fas fa-exclamation-circle" /> {error}
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={submitLogin}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
              <button
                type="button"
                onClick={() => setLoginPortal('USER')}
                className={loginPortal === 'USER' ? 'btn-gold' : 'btn-outline-gold'}
                style={{ justifyContent: 'center' }}
              >
                <i className="fas fa-user" /> User
              </button>
              <button
                type="button"
                onClick={() => setLoginPortal('ADMIN')}
                className={loginPortal === 'ADMIN' ? 'btn-gold' : 'btn-outline-gold'}
                style={{ justifyContent: 'center' }}
              >
                <i className="fas fa-user-shield" /> Admin
              </button>
              <button
                type="button"
                onClick={() => setLoginPortal('MANAGER')}
                className={loginPortal === 'MANAGER' ? 'btn-gold' : 'btn-outline-gold'}
                style={{ justifyContent: 'center' }}
              >
                <i className="fas fa-user-tie" /> Manager
              </button>
            </div>
            <div className="form-field">
              <label className="field-label">Email</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => onChange('email', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => onChange('password', e.target.value)}
                required
              />
            </div>
            <button className="btn-gold" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" /> Signing in...
                </>
              ) : (
                <>
                  <i className="fas fa-right-to-bracket" /> Login
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={submitRegister}>
            <div className="form-field">
              <label className="field-label">Name</label>
              <input
                className="field-input"
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => onChange('name', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label className="field-label">Email</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => onChange('email', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label className="field-label">Password</label>
              <input
                className="field-input"
                type="password"
                placeholder="Create password"
                value={form.password}
                onChange={(e) => onChange('password', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label className="field-label">Phone Number</label>
              <input
                className="field-input"
                type="tel"
                placeholder="9876543210"
                value={form.number}
                onChange={(e) => onChange('number', e.target.value)}
              />
            </div>
            <button className="btn-gold" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" /> Creating account...
                </>
              ) : (
                <>
                  <i className="fas fa-user-plus" /> Register
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}

export default Login
