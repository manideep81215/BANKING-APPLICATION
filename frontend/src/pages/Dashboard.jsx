import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getAllAccounts, getAllUsers, getAccountsByUserId } from '../api/bankingApi'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'
import { isPrivilegedRole } from '../utils/roles'

const stagger = { visible: { transition: { staggerChildren: 0.08 } } }
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

function StatCard({ icon, label, value, sub, color = 'var(--gold)', delay = 0 }) {
  return (
    <motion.div variants={fadeUp} className="glass-card stat-card" style={{ padding: 26 }} whileHover={{ y: -4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div
          style={{
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            background: `${color}18`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            fontSize: '0.95rem',
          }}
        >
          <i className={`fas ${icon}`} />
        </div>
      </div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, marginBottom: 4 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </motion.div>
  )
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const toast = useToast()
  const currentUser = JSON.parse(localStorage.getItem('nx_user') || '{}')
  const isAdmin = isPrivilegedRole(currentUser?.role)

  useEffect(() => {
    ;(async () => {
      try {
        if (isAdmin) {
          const [accRes, usrRes] = await Promise.all([getAllAccounts(), getAllUsers()])
          setAccounts(accRes.data || [])
          setUsers((usrRes.data || []).filter((u) => !['ADMIN', 'MANAGER'].includes(String(u?.role || '').toUpperCase())))
        } else {
          const accRes = await getAccountsByUserId(currentUser?.id)
          setAccounts(accRes.data || [])
          setUsers(currentUser?.id ? [currentUser] : [])
        }
      } catch {
        toast('Could not connect to backend. Showing demo data.', 'info')
        setAccounts([])
        setUsers(currentUser?.id ? [currentUser] : [])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const totalBalance = accounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0)
  const activeAccounts = accounts.filter((a) => a.status === 'ACTIVE').length

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n)
  const statusColor = { ACTIVE: '#10b981', INACTIVE: '#7a8299', BLOCKED: '#ef4444', CLOSED: '#6b7280' }

  const quickActions = [
    ...(isAdmin
      ? [{ icon: 'fa-circle-plus', label: 'New Account', action: () => navigate('/create-account'), color: 'var(--gold)' }]
      : [{ icon: 'fa-circle-plus', label: 'Request Account', action: () => navigate('/request-account'), color: 'var(--gold)' }]),
    { icon: 'fa-arrow-right-arrow-left', label: 'Transfer', action: () => navigate('/accounts'), color: '#3b82f6' },
    ...(isAdmin
      ? [{ icon: 'fa-users', label: 'Manage Users', action: () => navigate('/users'), color: '#8b5cf6' }]
      : []),
    { icon: 'fa-file-invoice', label: 'Statements', action: () => navigate('/statements'), color: '#10b981' },
  ]

  return (
    <Layout>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
        <p
          style={{
            color: 'var(--gold)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.13em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          <i className="fas fa-gauge-high me-2" />
          Overview
        </p>
        <h1 className="page-title">Financial Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </motion.div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <span className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}
          >
            <StatCard
              icon="fa-wallet"
              label={isAdmin ? 'Total Portfolio' : 'My Portfolio'}
              value={fmt(totalBalance)}
              sub={`Across ${accounts.length} ${isAdmin ? 'accounts' : 'my accounts'}`}
            />
            <StatCard icon="fa-check-circle" label="Active Accounts" value={activeAccounts} sub="Currently operational" color="#10b981" />
            {isAdmin && (
              <StatCard icon="fa-users" label="Total Users" value={users.length} sub="Registered account holders" color="#3b82f6" />
            )}
            <StatCard
              icon="fa-ban"
              label="Restricted"
              value={accounts.filter((a) => a.status === 'BLOCKED' || a.status === 'INACTIVE').length}
              sub="Requires attention"
              color="#ef4444"
            />
          </motion.div>

          <div className="row g-4">
            {/* Recent Accounts */}
            <div className="col-12 col-xl-8">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.3 }}
                className="glass-card"
                style={{ padding: 28 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.15rem', margin: 0 }}>Recent Accounts</h5>
                  <button className="btn-ghost" onClick={() => navigate('/accounts')} style={{ fontSize: '0.8rem' }}>
                    View All <i className="fas fa-arrow-right ms-1" />
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Account Number</th>
                        <th>Holder</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.slice(0, 5).map((acc, i) => (
                        <motion.tr
                          key={acc.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.35 + i * 0.06 }}
                        >
                          <td style={{ fontFamily: 'monospace', color: 'var(--gold)', fontSize: '0.85rem' }}>
                            {String(acc.accountNumber).replace(/(\d{4})(?=\d)/g, '$1 ')}
                          </td>
                          <td style={{ fontWeight: 500 }}>{acc.user?.name || '—'}</td>
                          <td style={{ color: '#10b981', fontWeight: 600 }}>{fmt(acc.balance)}</td>
                          <td>
                            <span className={`badge badge-${acc.status?.toLowerCase()}`}>
                              <span
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: '50%',
                                  background: statusColor[acc.status] || '#7a8299',
                                  display: 'inline-block',
                                }}
                              />
                              {acc.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn-ghost"
                              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                              onClick={() => navigate(`/accounts/${acc.id}`)}
                            >
                              Details
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {accounts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                      <i className="fas fa-inbox" style={{ fontSize: '2rem', marginBottom: 12, display: 'block' }} />
                      No accounts found
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Quick Actions */}
            <div className="col-12 col-xl-4">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.35 }}
                className="glass-card"
                style={{ padding: 28, marginBottom: 20 }}
              >
                <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.15rem', marginBottom: 20 }}>Quick Actions</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {quickActions.map((a) => (
                    <motion.button
                      key={a.label}
                      onClick={a.action}
                      whileHover={{ scale: 1.04, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        background: `${a.color}10`,
                        border: `1px solid ${a.color}25`,
                        borderRadius: 12,
                        padding: '18px 14px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        color: a.color,
                        transition: 'all 0.2s',
                      }}
                    >
                      <i className={`fas ${a.icon}`} style={{ fontSize: '1.3rem', display: 'block', marginBottom: 8 }} />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>{a.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Portfolio Breakdown */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.4 }}
                className="glass-card"
                style={{ padding: 28 }}
              >
                <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.15rem', marginBottom: 20 }}>Account Status</h5>
                {['ACTIVE', 'INACTIVE', 'BLOCKED', 'CLOSED'].map((status) => {
                  const count = accounts.filter((a) => a.status === status).length
                  const pct = accounts.length ? Math.round((count / accounts.length) * 100) : 0
                  return (
                    <div key={status} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }}>{status}</span>
                        <span style={{ fontWeight: 600 }}>
                          {count} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span>
                        </span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          style={{ height: '100%', background: statusColor[status], borderRadius: 3 }}
                        />
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
