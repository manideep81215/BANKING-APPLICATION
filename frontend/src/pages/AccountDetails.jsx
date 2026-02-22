import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getAccountById,
  updateAccount,
  deposit,
  withdraw,
  transferMoney,
  getTransactionsByAccountId,
  changeAccountPin,
} from '../api/bankingApi'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'
import { isPrivilegedRole } from '../utils/roles'

const STATUS_COLORS = { ACTIVE: '#10b981', INACTIVE: '#7a8299', BLOCKED: '#ef4444', CLOSED: '#6b7280' }
const STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED', 'CLOSED']

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  }),
}

function ActionCard({ icon, label, color, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        background: `${color}10`,
        border: `1px solid ${color}25`,
        borderRadius: 12,
        padding: '20px 14px',
        cursor: 'pointer',
        textAlign: 'center',
        width: '100%',
        color,
      }}
    >
      <i className={`fas ${icon}`} style={{ fontSize: '1.4rem', display: 'block', marginBottom: 10 }} />
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
    </motion.button>
  )
}

export default function AccountDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const currentUser = JSON.parse(localStorage.getItem('nx_user') || '{}')
  const isAdmin = isPrivilegedRole(currentUser?.role)

  const [account, setAccount] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Transaction panel
  const [txMode, setTxMode] = useState(null)
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [needsPinConfirmation, setNeedsPinConfirmation] = useState(false)
  const [toId, setToId] = useState('')
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState('')

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editLoading, setEditLoading] = useState(false)

  // Change PIN modal
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [currentPinInput, setCurrentPinInput] = useState('')
  const [newPinInput, setNewPinInput] = useState('')
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('')
  const [pinChangeError, setPinChangeError] = useState('')
  const [pinChangeLoading, setPinChangeLoading] = useState(false)

  const fetchAccount = async () => {
    setLoading(true)
    try {
      const [accountRes, txRes] = await Promise.all([getAccountById(id), getTransactionsByAccountId(id)])
      setAccount(accountRes.data)
      setTransactions(txRes.data || [])
      setEditForm({ status: accountRes.data.status, balance: accountRes.data.balance })
    } catch {
      toast('Could not load account. Showing demo data.', 'info')
      const demo = {
        id: Number(id),
        accountNumber: 4521893764,
        balance: 125430.0,
        status: 'ACTIVE',
        user: { id: 1, name: 'John Smith', email: 'john@example.com', number: 9876543210, role: 'USER' },
        createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
      }
      setAccount(demo)
      setTransactions([])
      setEditForm({ status: demo.status, balance: demo.balance })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccount()
  }, [id])

  useEffect(() => {
    if (!isAdmin && activeTab === 'edit') {
      setActiveTab('overview')
    }
  }, [isAdmin, activeTab])

  const handleTransaction = async (e) => {
    e.preventDefault()
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setTxError('Enter a valid positive amount.')
      return
    }
    if (txMode === 'transfer' && !toId) {
      setTxError('Enter a destination account ID.')
      return
    }
    if (txMode === 'withdraw' && (!pin || !/^\d{4}$/.test(pin))) {
      setTxError('Enter your 4-digit ATM PIN.')
      return
    }
    if (txMode === 'withdraw' && needsPinConfirmation && (!confirmPin || !/^\d{4}$/.test(confirmPin))) {
      setTxError('Please confirm your 4-digit ATM PIN.')
      return
    }
    setTxLoading(true)
    setTxError('')
    try {
      if (txMode === 'deposit') await deposit(account.id, parseFloat(amount))
      else if (txMode === 'withdraw') await withdraw(account.id, parseFloat(amount), pin, needsPinConfirmation ? confirmPin : null)
      else await transferMoney(account.id, Number(toId), parseFloat(amount))
      toast(
        `${txMode.charAt(0).toUpperCase() + txMode.slice(1)} of ₹${parseFloat(amount).toLocaleString('en-IN')} completed!`,
        'success',
      )
      setTxMode(null)
      setAmount('')
      setPin('')
      setConfirmPin('')
      setNeedsPinConfirmation(false)
      setToId('')
      fetchAccount()
    } catch (err) {
      const msg = err?.response?.data || 'Transaction failed.'
      if (txMode === 'withdraw' && typeof msg === 'string' && msg.toLowerCase().includes('first-time withdrawal')) {
        setNeedsPinConfirmation(true)
        setTxError('Please re-enter the same PIN in Confirm PIN to set your ATM PIN.')
      } else {
        setTxError(msg)
      }
    } finally {
      setTxLoading(false)
    }
  }

  const handleUpdate = async () => {
    setEditLoading(true)
    try {
      await updateAccount(account.id, { ...account, status: editForm.status, user: account.user })
      toast('Account updated successfully.', 'success')
      setEditing(false)
      fetchAccount()
    } catch {
      toast('Failed to update account.', 'error')
    } finally {
      setEditLoading(false)
    }
  }

  const resetPinModal = () => {
    setPinModalOpen(false)
    setCurrentPinInput('')
    setNewPinInput('')
    setConfirmNewPinInput('')
    setPinChangeError('')
    setPinChangeLoading(false)
  }

  const handleChangePin = async (e) => {
    e.preventDefault()
    if (!/^\d{4}$/.test(currentPinInput)) {
      setPinChangeError('Enter a valid current 4-digit PIN.')
      return
    }
    if (!/^\d{4}$/.test(newPinInput)) {
      setPinChangeError('Enter a valid new 4-digit PIN.')
      return
    }
    if (!/^\d{4}$/.test(confirmNewPinInput)) {
      setPinChangeError('Confirm your new 4-digit PIN.')
      return
    }
    if (newPinInput !== confirmNewPinInput) {
      setPinChangeError('New PIN and confirm PIN do not match.')
      return
    }

    setPinChangeLoading(true)
    setPinChangeError('')
    try {
      const res = await changeAccountPin(account.id, currentPinInput, newPinInput, confirmNewPinInput)
      toast(res?.data || 'ATM PIN updated successfully.', 'success')
      resetPinModal()
    } catch (err) {
      setPinChangeError(err?.response?.data || 'Unable to change ATM PIN.')
    } finally {
      setPinChangeLoading(false)
    }
  }

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)

  const resolveTransactionMeta = (tx) => {
    const currentAccountId = Number(account?.id)
    const fromId = tx?.fromAccountId != null ? Number(tx.fromAccountId) : null
    const toId = tx?.toAccountId != null ? Number(tx.toAccountId) : null

    if (tx?.type === 'CREDIT') {
      return { label: 'Deposit', tone: '#10b981', sign: '+' }
    }
    if (tx?.type === 'DEBIT') {
      return { label: 'Withdrawal', tone: '#ef4444', sign: '-' }
    }
    if (tx?.type === 'TRANSFER') {
      if (fromId === currentAccountId) {
        return { label: 'Transfer Out', tone: '#ef4444', sign: '-' }
      }
      if (toId === currentAccountId) {
        return { label: 'Transfer In', tone: '#10b981', sign: '+' }
      }
      return { label: 'Transfer', tone: '#3b82f6', sign: '' }
    }
    return { label: tx?.type || 'Transaction', tone: '#7a8299', sign: '' }
  }

  const TRANSACTION_CONFIG = {
    deposit: { label: 'Deposit Funds', icon: 'fa-circle-plus', color: '#10b981', btnClass: '' },
    withdraw: { label: 'Withdraw Funds', icon: 'fa-circle-minus', color: '#ef4444', btnClass: '' },
    transfer: {
      label: 'Transfer Money',
      icon: 'fa-arrow-right-arrow-left',
      color: '#3b82f6',
      btnClass: '',
    },
  }

  if (loading)
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <span className="spinner" style={{ width: 44, height: 44 }} />
        </div>
      </Layout>
    )

  return (
    <Layout>
      {/* Breadcrumb + back */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}
      >
        <button className="btn-ghost" onClick={() => navigate('/accounts')} style={{ fontSize: '0.82rem' }}>
          <i className="fas fa-arrow-left" /> Accounts
        </button>
        <i className="fas fa-chevron-right" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'monospace' }}>
          #{String(account?.accountNumber).replace(/(\d{4})(?=\d)/g, '$1 ')}
        </span>
      </motion.div>

      <div className="row g-4">
        {/* Left — Account Card + Actions */}
        <div className="col-12 col-lg-4">
          {/* Hero balance card */}
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            style={{
              background: 'linear-gradient(145deg, #111827, #0f172a)',
              border: '1px solid rgba(201,168,76,0.25)',
              borderRadius: 20,
              padding: 32,
              marginBottom: 20,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'rgba(201,168,76,0.04)',
                border: '1px solid rgba(201,168,76,0.08)',
              }}
            />
            <div style={{ position: 'absolute', top: 10, right: 20 }}>
              <span className={`badge badge-${account?.status?.toLowerCase()}`}>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: STATUS_COLORS[account?.status],
                    display: 'inline-block',
                  }}
                />
                {account?.status}
              </span>
            </div>

            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 12,
              }}
            >
              Account Balance
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '2.4rem',
                fontWeight: 700,
                color: '#10b981',
                marginBottom: 6,
              }}
            >
              {fmt(account?.balance || 0)}
            </motion.div>

            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '1rem',
                color: 'var(--gold)',
                letterSpacing: '0.05em',
                marginBottom: 24,
              }}
            >
              {String(account?.accountNumber).replace(/(\d{4})(?=\d)/g, '$1 ')}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 18 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(201,168,76,0.1)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gold)',
                  fontSize: '0.85rem',
                }}
              >
                {account?.user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{account?.user?.name || '—'}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{account?.user?.email}</div>
              </div>
            </div>
          </motion.div>

          {/* Quick actions */}
          {account?.status === 'ACTIVE' && (
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
              <h6 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 16 }}>Transactions</h6>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <ActionCard icon="fa-circle-plus" label="Deposit" color="#10b981" onClick={() => setTxMode('deposit')} />
                <ActionCard icon="fa-circle-minus" label="Withdraw" color="#ef4444" onClick={() => setTxMode('withdraw')} />
                <ActionCard icon="fa-arrow-right-arrow-left" label="Transfer" color="#3b82f6" onClick={() => setTxMode('transfer')} />
              </div>
            </motion.div>
          )}

          {/* Account meta */}
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="glass-card" style={{ padding: 24 }}>
            <h6 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 16 }}>Account Info</h6>
            {[
              ['Account ID', `#${account?.id}`],
              [
                'Created',
                account?.createdAt
                  ? new Date(account.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—',
              ],
              ['Phone', account?.user?.number || '—'],
              ['Role', account?.user?.role || '—'],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '0.86rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            {!isAdmin && (
              <button
                className="btn-ghost"
                style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
                onClick={() => setPinModalOpen(true)}
              >
                <i className="fas fa-key" /> Change ATM PIN
              </button>
            )}
          </motion.div>
        </div>

        {/* Right — Detail tabs */}
        <div className="col-12 col-lg-8">
          {/* Tabs */}
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible">
            <div className="tab-bar" style={{ marginBottom: 24, maxWidth: 400 }}>
              {[['overview', 'Overview'], ...(isAdmin ? [['edit', 'Edit Account']] : [])].map(([key, label]) => (
                <button key={key} className={`tab-btn ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
                  {label}
                </button>
              ))}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                {/* Stats row */}
                <div className="row g-3 mb-4">
                  {[
                    { label: 'Account ID', value: `#${account?.id}`, icon: 'fa-hashtag', color: 'var(--gold)' },
                    { label: 'Current Balance', value: fmt(account?.balance || 0), icon: 'fa-wallet', color: '#10b981' },
                    {
                      label: 'Account Status',
                      value: account?.status,
                      icon: 'fa-circle-check',
                      color: STATUS_COLORS[account?.status],
                    },
                  ].map((s, i) => (
                    <div key={s.label} className="col-12 col-sm-4">
                      <motion.div custom={4 + i} variants={fadeUp} initial="hidden" animate="visible" className="glass-card stat-card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.12em',
                              color: 'var(--text-muted)',
                              fontWeight: 700,
                            }}
                          >
                            {s.label}
                          </span>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: `${s.color}18`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: s.color,
                            }}
                          >
                            <i className={`fas ${s.icon}`} style={{ fontSize: '0.8rem' }} />
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: s.color }}>{s.value}</div>
                      </motion.div>
                    </div>
                  ))}
                </div>

                {/* User details */}
                <motion.div custom={7} variants={fadeUp} initial="hidden" animate="visible" className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
                  <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', marginBottom: 22 }}>
                    <i className="fas fa-user me-2" style={{ color: 'var(--gold)' }} />
                    Account Holder Profile
                  </h5>
                  <div className="row g-4">
                    {[
                      ['Full Name', account?.user?.name, 'fa-user'],
                      ['Email Address', account?.user?.email, 'fa-envelope'],
                      ['Phone Number', account?.user?.number, 'fa-phone'],
                      ['User ID', `#${account?.user?.id}`, 'fa-id-card'],
                      ['Role', account?.user?.role, 'fa-shield-halved'],
                      ['Account Type', 'Personal Banking', 'fa-landmark'],
                    ].map(([label, value, icon]) => (
                      <div className="col-12 col-sm-6" key={label}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: 8,
                              background: 'rgba(201,168,76,0.08)',
                              border: '1px solid rgba(201,168,76,0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--gold)',
                              fontSize: '0.8rem',
                              flexShrink: 0,
                            }}
                          >
                            <i className={`fas ${icon}`} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: '0.7rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: 'var(--text-muted)',
                                fontWeight: 700,
                                marginBottom: 3,
                              }}
                            >
                              {label}
                            </div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{value || '—'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div custom={8} variants={fadeUp} initial="hidden" animate="visible" className="glass-card" style={{ padding: 28 }}>
                  <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', marginBottom: 6 }}>
                    <i className="fas fa-chart-area me-2" style={{ color: 'var(--gold)' }} />
                    Transaction History
                  </h5>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
                    Every deposit, withdrawal, and transfer for this account
                  </p>

                  {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
                      <i className="fas fa-clock-rotate-left" style={{ fontSize: '2rem', marginBottom: 12, display: 'block', opacity: 0.35 }} />
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>No transactions yet for this account.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {transactions.map((tx) => {
                        const meta = resolveTransactionMeta(tx)
                        const counterparty =
                          Number(tx?.fromAccountId) === Number(account?.id)
                            ? tx?.toAccountNumber
                            : tx?.fromAccountNumber

                        return (
                          <div
                            key={tx.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 14px',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: 10,
                              background: 'rgba(255,255,255,0.02)',
                              gap: 12,
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                  style={{
                                    fontSize: '0.73rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: meta.tone,
                                  }}
                                >
                                  {meta.label}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{tx.id}</span>
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
                                {tx?.timestamp ? new Date(tx.timestamp).toLocaleString('en-IN') : '-'}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 3 }}>
                                {tx?.type === 'TRANSFER'
                                  ? `Counterparty: ${counterparty ? String(counterparty).replace(/(\d{4})(?=\d)/g, '$1 ') : '-'}`
                                  : `Ref: ${tx?.referenceNumber || '-'}`}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, color: meta.tone, fontSize: '0.95rem' }}>
                                {meta.sign}
                                {fmt(tx.amount || 0)}
                              </div>
                              {tx?.referenceNumber && (
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                                  {tx.referenceNumber.slice(0, 12)}...
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {activeTab === 'edit' && (
              <motion.div key="edit" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <div className="glass-card" style={{ padding: 32 }}>
                  <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.1rem', marginBottom: 6 }}>
                    Edit Account
                  </h5>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginBottom: 28 }}>
                    Update account status and configuration
                  </p>

                  <div className="form-field">
                    <label className="field-label">Account Status</label>
                    <select
                      className="field-select"
                      value={editForm.status || ''}
                      onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: STATUS_COLORS[editForm.status] || 'transparent',
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {editForm.status === 'ACTIVE' && 'Account will be fully operational'}
                        {editForm.status === 'INACTIVE' && 'Account will be suspended but not deleted'}
                        {editForm.status === 'BLOCKED' && 'Account will be blocked from all transactions'}
                        {editForm.status === 'CLOSED' && 'Account will be permanently closed'}
                      </span>
                    </div>
                  </div>

                  {editForm.status === 'BLOCKED' || editForm.status === 'CLOSED' ? (
                    <div className="field-alert field-alert-error" style={{ marginBottom: 24 }}>
                      <i className="fas fa-triangle-exclamation" />
                      <span>
                        Changing to <strong>{editForm.status}</strong> will restrict account access. Proceed with
                        caution.
                      </span>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      className="btn-ghost"
                      onClick={() => {
                        setEditing(false)
                        setEditForm({ status: account.status })
                      }}
                    >
                      Cancel
                    </button>
                    <button className="btn-gold" onClick={handleUpdate} disabled={editLoading}>
                      {editLoading ? (
                        <>
                          <span className="spinner" /> Saving...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-check" /> Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Transaction Modal */}
      <AnimatePresence>
        {txMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            onClick={() => {
              setTxMode(null)
              setAmount('')
              setPin('')
              setConfirmPin('')
              setNeedsPinConfirmation(false)
              setToId('')
              setTxError('')
            }}
          >
            <motion.div
              className="modal-box"
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              style={{ maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      background: `${TRANSACTION_CONFIG[txMode].color}18`,
                      border: `1px solid ${TRANSACTION_CONFIG[txMode].color}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: TRANSACTION_CONFIG[txMode].color,
                      fontSize: '1.1rem',
                    }}
                  >
                    <i className={`fas ${TRANSACTION_CONFIG[txMode].icon}`} />
                  </div>
                  <div>
                    <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', margin: 0 }}>
                      {TRANSACTION_CONFIG[txMode].label}
                    </h5>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: 0 }}>
                      Account #{account?.accountNumber}
                    </p>
                  </div>
                </div>
                <button
                  className="btn-ghost"
                  style={{ padding: '8px 10px' }}
                  onClick={() => {
                    setTxMode(null)
                    setAmount('')
                    setPin('')
                    setConfirmPin('')
                    setNeedsPinConfirmation(false)
                    setToId('')
                    setTxError('')
                  }}
                >
                  <i className="fas fa-times" />
                </button>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: '14px 18px',
                  marginBottom: 24,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Current Balance</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>{fmt(account?.balance || 0)}</span>
              </div>

              {txError && (
                <div className="field-alert field-alert-error">
                  <i className="fas fa-exclamation-circle" /> {txError}
                </div>
              )}

              <form onSubmit={handleTransaction} autoComplete="off">
                <div className="form-field">
                  <label className="field-label">Amount (INR)</label>
                  <div className="input-icon-wrap">
                    <i className="fas fa-indian-rupee-sign icon" />
                    <input
                      type="number"
                      className="field-input"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      min="1"
                      step="0.01"
                      autoFocus
                      style={{ fontSize: '1.25rem', height: 54 }}
                    />
                  </div>
                </div>

                {txMode === 'transfer' && (
                  <div className="form-field">
                    <label className="field-label">Destination Account ID</label>
                    <div className="input-icon-wrap">
                      <i className="fas fa-hashtag icon" />
                      <input
                        type="number"
                        className="field-input"
                        placeholder="Target account ID"
                        value={toId}
                        onChange={(e) => setToId(e.target.value)}
                        required
                        min="1"
                      />
                    </div>
                  </div>
                )}

                {txMode === 'withdraw' && (
                  <>
                    <div className="form-field">
                      <label className="field-label">ATM PIN</label>
                      <div className="input-icon-wrap">
                        <i className="fas fa-key icon" />
                        <input
                          type="password"
                          className="field-input"
                          placeholder="4-digit PIN"
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          required
                          inputMode="numeric"
                          maxLength={4}
                          autoComplete="new-password"
                          name="atm_pin"
                        />
                      </div>
                    </div>
                    {needsPinConfirmation && (
                      <div className="form-field">
                        <label className="field-label">Confirm PIN (one-time setup)</label>
                        <div className="input-icon-wrap">
                          <i className="fas fa-shield-halved icon" />
                          <input
                            type="password"
                            className="field-input"
                            placeholder="Re-enter PIN"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            inputMode="numeric"
                            maxLength={4}
                            required
                            autoComplete="new-password"
                            name="atm_pin_confirm"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      marginBottom: 10,
                    }}
                  >
                    Quick Select
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[1000, 5000, 10000, 25000, 50000].map((v) => (
                      <button
                        key={v}
                        type="button"
                        className="btn-ghost"
                        style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                        onClick={() => setAmount(String(v))}
                      >
                        INR {v.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-gold"
                  style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '0.9rem' }}
                  disabled={txLoading}
                >
                  {txLoading ? (
                    <>
                      <span className="spinner" /> Processing...
                    </>
                  ) : (
                    <>
                      <i className={`fas ${TRANSACTION_CONFIG[txMode].icon}`} /> Confirm {TRANSACTION_CONFIG[txMode].label}
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pinModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            onClick={resetPinModal}
          >
            <motion.div
              className="modal-box"
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              style={{ maxWidth: 500, width: '100%' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.15rem', margin: 0 }}>Change ATM PIN</h5>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
                    Verify your current PIN, then set a new one.
                  </p>
                </div>
                <button className="btn-ghost" style={{ padding: '8px 10px' }} onClick={resetPinModal}>
                  <i className="fas fa-times" />
                </button>
              </div>

              {pinChangeError && (
                <div className="field-alert field-alert-error">
                  <i className="fas fa-exclamation-circle" /> {pinChangeError}
                </div>
              )}

              <form onSubmit={handleChangePin} autoComplete="off">
                <div className="form-field">
                  <label className="field-label">Current PIN</label>
                  <div className="input-icon-wrap">
                    <i className="fas fa-key icon" />
                    <input
                      type="password"
                      className="field-input"
                      placeholder="Current 4-digit PIN"
                      value={currentPinInput}
                      onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      required
                      inputMode="numeric"
                      maxLength={4}
                      autoComplete="off"
                      name="current_pin"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-label">New PIN</label>
                  <div className="input-icon-wrap">
                    <i className="fas fa-lock icon" />
                    <input
                      type="password"
                      className="field-input"
                      placeholder="New 4-digit PIN"
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      required
                      inputMode="numeric"
                      maxLength={4}
                      autoComplete="new-password"
                      name="new_pin"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-label">Confirm New PIN</label>
                  <div className="input-icon-wrap">
                    <i className="fas fa-shield-halved icon" />
                    <input
                      type="password"
                      className="field-input"
                      placeholder="Re-enter new PIN"
                      value={confirmNewPinInput}
                      onChange={(e) => setConfirmNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      required
                      inputMode="numeric"
                      maxLength={4}
                      autoComplete="new-password"
                      name="confirm_new_pin"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-gold"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                  disabled={pinChangeLoading}
                >
                  {pinChangeLoading ? (
                    <>
                      <span className="spinner" /> Updating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check" /> Update PIN
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  )
}

