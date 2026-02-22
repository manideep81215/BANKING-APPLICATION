import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getAllAccounts, getAccountsByUserId, deleteAccount, deposit, withdraw, transferMoney } from '../api/bankingApi'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'
import { isPrivilegedRole } from '../utils/roles'

const STATUS_COLORS = { ACTIVE: '#10b981', INACTIVE: '#7a8299', BLOCKED: '#ef4444', CLOSED: '#6b7280' }

function TransactionModal({ account, mode, onClose, onDone }) {
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [needsPinConfirmation, setNeedsPinConfirmation] = useState(false)
  const [toAccountId, setToAccountId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  const titles = { deposit: 'Deposit Funds', withdraw: 'Withdraw Funds', transfer: 'Transfer Money' }
  const icons = {
    deposit: 'fa-arrow-down-to-line',
    withdraw: 'fa-arrow-up-from-line',
    transfer: 'fa-arrow-right-arrow-left',
  }
  const colors = { deposit: '#10b981', withdraw: '#ef4444', transfer: '#3b82f6' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('Enter a valid amount.')
      return
    }
    if (mode === 'transfer' && !toAccountId) {
      setError('Enter a destination account ID.')
      return
    }
    if (mode === 'withdraw' && (!pin || !/^\d{4}$/.test(pin))) {
      setError('Enter a valid 4-digit ATM PIN.')
      return
    }
    if (mode === 'withdraw' && needsPinConfirmation && (!confirmPin || !/^\d{4}$/.test(confirmPin))) {
      setError('Please confirm your 4-digit ATM PIN.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (mode === 'deposit') await deposit(account.id, parseFloat(amount))
      else if (mode === 'withdraw') await withdraw(account.id, parseFloat(amount), pin, needsPinConfirmation ? confirmPin : null)
      else await transferMoney(account.id, Number(toAccountId), parseFloat(amount))
      toast(`${titles[mode]} successful!`, 'success')
      onDone()
    } catch (err) {
      const msg = err?.response?.data || `${titles[mode]} failed.`
      if (mode === 'withdraw' && typeof msg === 'string' && msg.toLowerCase().includes('first-time withdrawal')) {
        setNeedsPinConfirmation(true)
        setError('Please re-enter the same PIN in Confirm PIN to set your ATM PIN.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="modal-box"
        initial={{ opacity: 0, scale: 0.88, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: `${colors[mode]}18`,
                border: `1px solid ${colors[mode]}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors[mode],
                fontSize: '1rem',
              }}
            >
              <i className={`fas ${icons[mode]}`} />
            </div>
            <div>
              <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.15rem', margin: 0 }}>
                {titles[mode]}
              </h5>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
                Account #{account.accountNumber}
              </p>
            </div>
          </div>
          <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        {error && (
          <div className="field-alert field-alert-error">
            <i className="fas fa-exclamation-circle" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-field">
            <label className="field-label">Amount (₹)</label>
            <div className="input-icon-wrap">
              <i className="fas fa-indian-rupee-sign icon" />
              <input
                type="number"
                className="field-input"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="1"
                step="0.01"
                autoFocus
              />
            </div>
          </div>

          {mode === 'transfer' && (
            <div className="form-field">
              <label className="field-label">Destination Account ID</label>
              <div className="input-icon-wrap">
                <i className="fas fa-hashtag icon" />
                <input
                  type="number"
                  className="field-input"
                  placeholder="Target account ID"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                  min="1"
                />
              </div>
            </div>
          )}

          {mode === 'withdraw' && (
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

          {mode === 'withdraw' && (
            <div
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                borderRadius: 9,
                padding: '12px 16px',
                marginBottom: 16,
                fontSize: '0.82rem',
                color: '#fca5a5',
                display: 'flex',
                gap: 10,
              }}
            >
              <i className="fas fa-triangle-exclamation" style={{ marginTop: 2 }} />
              Current balance: <strong>₹{parseFloat(account.balance || 0).toLocaleString('en-IN')}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-gold"
              style={{
                flex: 2,
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${colors[mode]}, ${colors[mode]}cc)`,
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" /> Processing...
                </>
              ) : (
                <>
                  {titles[mode]} <i className={`fas ${icons[mode]} ms-1`} />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function DeleteModal({ account, onClose, onDone }) {
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteAccount(account.id)
      toast('Account deleted successfully.', 'success')
      onDone()
    } catch {
      toast('Failed to delete account.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="modal-box"
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div
            style={{
              width: 60,
              height: 60,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '1.5rem',
              color: '#ef4444',
            }}
          >
            <i className="fas fa-trash-can" />
          </div>
          <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.3rem', marginBottom: 10 }}>
            Delete Account?
          </h5>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: 28 }}>
            This will permanently delete account{' '}
            <strong style={{ color: 'var(--text-primary)' }}>#{account.accountNumber}</strong>. This action cannot be
            undone.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-danger"
              style={{ flex: 1, justifyContent: 'center', padding: '12px 20px' }}
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" /> Deleting...
                </>
              ) : (
                <>
                  <i className="fas fa-trash-can" /> Delete
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ManageAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [modal, setModal] = useState(null) // { type, account }
  const navigate = useNavigate()
  const toast = useToast()
  const currentUser = JSON.parse(localStorage.getItem('nx_user') || '{}')
  const isAdmin = isPrivilegedRole(currentUser?.role)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = isAdmin ? await getAllAccounts() : await getAccountsByUserId(currentUser?.id)
      setAccounts(res.data || [])
    } catch {
      toast('Could not connect to backend. Showing demo data.', 'info')
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }, [isAdmin, currentUser?.id])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const filtered = accounts.filter((a) => {
    const matchSearch =
      !search ||
      String(a.accountNumber).includes(search) ||
      a.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      String(a.id).includes(search)
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)

  const closeModal = () => setModal(null)
  const doneModal = () => {
    setModal(null)
    fetchAccounts()
  }

  return (
    <Layout>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
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
            <i className="fas fa-credit-card me-2" />
            Management
          </p>
          <h1 className="page-title">{isAdmin ? 'All Accounts' : 'My Accounts'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            {accounts.length} {isAdmin ? 'total accounts in the system' : 'accounts linked to you'}
          </p>
        </div>
        {isAdmin ? (
          <button className="btn-gold" onClick={() => navigate('/create-account')}>
            <i className="fas fa-plus" /> New Account
          </button>
        ) : (
          <button className="btn-gold" onClick={() => navigate('/request-account')}>
            <i className="fas fa-plus" /> Request Account
          </button>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="glass-card"
        style={{ padding: '18px 24px', marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}
      >
        <div className="input-icon-wrap" style={{ flex: 1, minWidth: 200 }}>
          <i className="fas fa-magnifying-glass icon" />
          <input
            type="text"
            className="field-input"
            placeholder="Search by name, account number, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['ALL', 'ACTIVE', 'INACTIVE', 'BLOCKED', 'CLOSED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: statusFilter === s ? STATUS_COLORS[s] || 'var(--gold)' : 'transparent',
                color: statusFilter === s ? (s === 'ALL' ? 'var(--navy)' : 'white') : 'var(--text-muted)',
                borderColor: statusFilter === s ? STATUS_COLORS[s] || 'var(--gold)' : 'rgba(255,255,255,0.1)',
              }}
            >
              {s}
            </button>
          ))}
        </div>
        <button className="btn-ghost" style={{ padding: '9px 14px' }} onClick={fetchAccounts} title="Refresh">
          <i className="fas fa-rotate-right" />
        </button>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card"
        style={{ overflow: 'hidden' }}
      >
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}>
              <span className="spinner" style={{ width: 36, height: 36 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <i className="fas fa-inbox" style={{ fontSize: '2.5rem', marginBottom: 16, display: 'block', opacity: 0.5 }} />
              <p>No accounts found matching your filters</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Holder</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((acc, i) => (
                    <motion.tr
                      key={acc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td>
                        <div style={{ fontFamily: 'monospace', color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 600 }}>
                          {String(acc.accountNumber).replace(/(\d{4})(?=\d)/g, '$1 ')}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>ID: #{acc.id}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: 'rgba(201,168,76,0.1)',
                              border: '1px solid rgba(201,168,76,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--gold)',
                              fontSize: '0.75rem',
                              flexShrink: 0,
                            }}
                          >
                            {acc.user?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{acc.user?.name || '—'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{acc.user?.email || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: parseFloat(acc.balance) > 0 ? '#10b981' : 'var(--text-muted)' }}>
                          {fmt(acc.balance)}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${acc.status?.toLowerCase()}`}>
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              background: STATUS_COLORS[acc.status] || 'transparent',
                              display: 'inline-block',
                            }}
                          />
                          {acc.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            className="btn-ghost"
                            style={{ fontSize: '0.77rem', padding: '6px 12px' }}
                            onClick={() => navigate(`/accounts/${acc.id}`)}
                            title="Details"
                          >
                            <i className="fas fa-eye" />
                          </button>
                          {acc.status === 'ACTIVE' && (
                            <>
                              <button
                                onClick={() => setModal({ type: 'deposit', account: acc })}
                                style={{
                                  background: 'rgba(16,185,129,0.1)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16,185,129,0.25)',
                                  padding: '6px 12px',
                                  borderRadius: 7,
                                  cursor: 'pointer',
                                  fontSize: '0.77rem',
                                  transition: 'all 0.2s',
                                }}
                                title="Deposit"
                              >
                                <i className="fas fa-plus" />
                              </button>
                              <button
                                onClick={() => setModal({ type: 'withdraw', account: acc })}
                                style={{
                                  background: 'rgba(239,68,68,0.1)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239,68,68,0.25)',
                                  padding: '6px 12px',
                                  borderRadius: 7,
                                  cursor: 'pointer',
                                  fontSize: '0.77rem',
                                  transition: 'all 0.2s',
                                }}
                                title="Withdraw"
                              >
                                <i className="fas fa-minus" />
                              </button>
                              <button
                                onClick={() => setModal({ type: 'transfer', account: acc })}
                                style={{
                                  background: 'rgba(59,130,246,0.1)',
                                  color: '#3b82f6',
                                  border: '1px solid rgba(59,130,246,0.25)',
                                  padding: '6px 12px',
                                  borderRadius: 7,
                                  cursor: 'pointer',
                                  fontSize: '0.77rem',
                                  transition: 'all 0.2s',
                                }}
                                title="Transfer"
                              >
                                <i className="fas fa-arrow-right-arrow-left" />
                              </button>
                            </>
                          )}
                          {isAdmin && (
                            <button
                              className="btn-danger"
                              style={{ fontSize: '0.77rem', padding: '6px 12px' }}
                              onClick={() => setModal({ type: 'delete', account: acc })}
                              title="Delete"
                            >
                              <i className="fas fa-trash" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{filtered.length}</strong> of{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{accounts.length}</strong> accounts
            </span>
            <span>
              Total balance:{' '}
              <strong style={{ color: '#10b981' }}>
                {fmt(filtered.reduce((s, a) => s + parseFloat(a.balance || 0), 0))}
              </strong>
            </span>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'deposit' && (
          <TransactionModal account={modal.account} mode="deposit" onClose={closeModal} onDone={doneModal} />
        )}
        {modal?.type === 'withdraw' && (
          <TransactionModal account={modal.account} mode="withdraw" onClose={closeModal} onDone={doneModal} />
        )}
        {modal?.type === 'transfer' && (
          <TransactionModal account={modal.account} mode="transfer" onClose={closeModal} onDone={doneModal} />
        )}
        {modal?.type === 'delete' && <DeleteModal account={modal.account} onClose={closeModal} onDone={doneModal} />}
      </AnimatePresence>
    </Layout>
  )
}
