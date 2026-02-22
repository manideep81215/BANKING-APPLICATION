import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { isPrivilegedRole } from '../utils/roles'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem('nx_user') || '{"name":"User"}')
  const isAdmin = isPrivilegedRole(user?.role)
  const navItems = [
    { path: '/dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
    { path: '/accounts', icon: 'fa-credit-card', label: isAdmin ? 'Accounts' : 'My Accounts' },
    { path: '/statements', icon: 'fa-file-invoice', label: 'Statements' },
    ...(isAdmin
      ? [{ path: '/create-account', icon: 'fa-circle-plus', label: 'New Account' }]
      : [{ path: '/request-account', icon: 'fa-circle-plus', label: 'Request Account' }]),
    ...(isAdmin ? [{ path: '/users', icon: 'fa-users', label: 'Users' }] : []),
  ]

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const handleBrandClick = (e) => {
    e.preventDefault()
    navigate('/dashboard')
    window.location.reload()
  }

  const Sidebar = ({ mobile = false }) => (
    <div
      className={mobile ? '' : ''}
      style={{
        width: mobile ? '100%' : 240,
        background: 'rgba(10,14,26,0.97)',
        borderRight: mobile ? 'none' : '1px solid rgba(201,168,76,0.15)',
        padding: '24px 14px',
        minHeight: mobile ? 'auto' : 'calc(100vh - 64px)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Section label */}
      <div
        style={{
          fontSize: '0.66rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(122,130,153,0.45)',
          padding: '0 14px 10px',
        }}
      >
        Navigation
      </div>

      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          onClick={() => mobile && setSidebarOpen(false)}
        >
          <i className={`fas ${item.icon}`} style={{ width: 18, textAlign: 'center' }} />
          {item.label}
        </Link>
      ))}

      <div style={{ marginTop: 'auto' }}>
        <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--gold-dim)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold)',
                fontSize: '0.85rem',
              }}
            >
              <i className="fas fa-user" />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.name || 'User'}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {user.role || 'Account Holder'}
              </div>
            </div>
          </div>
          <button className="btn-ghost" onClick={handleLogout} style={{ width: '100%', justifyContent: 'center' }}>
            <i className="fas fa-right-from-bracket" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="bg-mesh" />
      <div className="bg-grid" />

      {/* Navbar */}
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'rgba(10,14,26,0.92)',
          borderBottom: '1px solid rgba(201,168,76,0.15)',
          backdropFilter: 'blur(20px)',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mobile hamburger */}
          <button
            className="btn-ghost d-lg-none"
            style={{ padding: '8px 10px' }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <i className={`fas fa-${sidebarOpen ? 'times' : 'bars'}`} />
          </button>

          <a
            href="/dashboard"
            onClick={handleBrandClick}
            className="brand-text"
            style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
          >
            <img src="/gmbank-logo.svg" alt="GMbank" style={{ width: 36, height: 36, borderRadius: 9 }} />
            GMbank
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-shield-halved" style={{ color: 'var(--gold)' }} />
            Secured
          </div>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Welcome,{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {user.name?.split(' ')[0] || 'User'}
            </span>
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
        {/* Desktop Sidebar */}
        <div className="d-none d-lg-flex" style={{ flexDirection: 'column' }}>
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.6)',
                  zIndex: 200,
                  backdropFilter: 'blur(6px)',
                }}
                onClick={() => setSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 260, zIndex: 201 }}
              >
                <Sidebar mobile />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main style={{ flex: 1, padding: '40px 32px', minHeight: 'calc(100vh - 64px)', overflowX: 'hidden' }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
