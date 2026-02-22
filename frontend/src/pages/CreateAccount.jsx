import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { createAccount, requestAccount, getAllUsers } from '../api/bankingApi'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'
import { isPrivilegedRole } from '../utils/roles'

const ACCOUNT_TYPES = [
  {
    key: 'SAVINGS',
    label: 'Savings',
    icon: 'fa-piggy-bank',
    desc: 'Earn interest. Best for growing your wealth over time.',
  },
  {
    key: 'CHECKING',
    label: 'Checking',
    icon: 'fa-wallet',
    desc: 'Day-to-day transactions with unlimited withdrawals.',
  },
  {
    key: 'INVESTMENT',
    label: 'Investment',
    icon: 'fa-chart-line',
    desc: 'Grow your portfolio with managed investment products.',
  },
]

const STEPS = ['Account Type', 'Account Details', 'Review & Confirm']

const pageVariants = {
  enter: { opacity: 0, x: 30 },
  center: { opacity: 1, x: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -30, transition: { duration: 0.22 } },
}

export default function CreateAccount() {
  const currentUser = JSON.parse(localStorage.getItem('nx_user') || '{}')
  const isAdmin = isPrivilegedRole(currentUser?.role)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [selectedType, setSelectedType] = useState('')
  const [form, setForm] = useState({ userId: isAdmin ? '' : String(currentUser?.id || ''), balance: '', accountNumber: '' })
  const [users, setUsers] = useState([])
  const [usersLoaded, setUsersLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  const goStep = (next) => {
    setDirection(next > step ? 1 : -1)
    setStep(next)
  }

  const loadUsers = async () => {
    if (usersLoaded) return
    try {
      const res = await getAllUsers()
      setUsers(res.data || [])
    } catch {
      toast('Could not load users. Enter User ID manually.', 'info')
    }
    setUsersLoaded(true)
  }

  const handleNext = () => {
    if (step === 0 && !selectedType) {
      toast('Please select an account type', 'error')
      return
    }
    if (step === 1) {
      if (!form.userId) {
        setError('User ID is required.')
        return
      }
      if (!form.balance || isNaN(form.balance) || Number(form.balance) < 0) {
        setError('Enter a valid initial deposit amount.')
        return
      }
    }
    setError('')
    goStep(step + 1)
    if (step === 0 && isAdmin) loadUsers()
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    const requestUserId = isAdmin ? Number(form.userId) : Number(currentUser?.id)
    if (!requestUserId || Number.isNaN(requestUserId)) {
      setLoading(false)
      setError('Invalid user session. Please login again.')
      return
    }
    const accNum = form.accountNumber || Math.floor(1000000000 + Math.random() * 9000000000)
    const payload = {
      accountNumber: Number(accNum),
      balance: parseFloat(form.balance),
      status: isAdmin ? 'ACTIVE' : 'PENDING',
      user: { id: requestUserId },
    }
    try {
      const res = isAdmin ? await createAccount(payload) : await requestAccount(payload)
      setSuccess(res.data)
      toast(isAdmin ? 'Account created successfully!' : 'Account request sent for admin approval!', 'success')
    } catch (err) {
      const msg = err?.response?.data || 'Failed to create account.'
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

  if (success) {
    return (
      <Layout>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="glass-card"
            style={{ padding: 48, textAlign: 'center' }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
              style={{
                width: 80,
                height: 80,
                background: 'rgba(16,185,129,0.1)',
                border: '2px solid rgba(16,185,129,0.3)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 28px',
                fontSize: '2rem',
                color: '#10b981',
              }}
            >
              <i className="fas fa-check" />
            </motion.div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.8rem', marginBottom: 12 }}>
              {isAdmin ? 'Account Opened!' : 'Request Submitted!'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
              {isAdmin
                ? 'Your new banking account is now active and ready to use.'
                : 'Your account request was sent to admin for approval.'}
            </p>

            <div
              style={{
                background: 'rgba(201,168,76,0.06)',
                border: '1px solid rgba(201,168,76,0.2)',
                borderRadius: 12,
                padding: '20px 24px',
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                }}
              >
                Account Number
              </div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', color: 'var(--gold)', letterSpacing: '0.08em' }}>
                {String(success.accountNumber).replace(/(\d{4})(?=\d)/g, '$1 ')}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 32,
                textAlign: 'left',
              }}
            >
              {[
                ['Account ID', `#${success.id}`],
                ['Type', selectedType],
                ['Opening Balance', fmt(success.balance)],
                ['Status', success.status],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 9, padding: '12px 16px' }}>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      marginBottom: 4,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {k}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {isAdmin ? (
                <button
                  className="btn-outline-gold"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => navigate(`/accounts/${success.id}`)}
                >
                  <i className="fas fa-eye" /> View Account
                </button>
              ) : (
                <button
                  className="btn-outline-gold"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => navigate('/accounts')}
                >
                  <i className="fas fa-list" /> My Accounts
                </button>
              )}
              <button
                className="btn-gold"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => {
                  setSuccess(null)
                  setStep(0)
                  setForm({ userId: isAdmin ? '' : String(currentUser?.id || ''), balance: '', accountNumber: '' })
                  setSelectedType('')
                }}
              >
                <i className="fas fa-plus" /> New Account
              </button>
            </div>
          </motion.div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
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
            <i className="fas fa-circle-plus me-2" />
            {isAdmin ? 'New Account' : 'New Account Request'}
          </p>
          <h1 className="page-title">{isAdmin ? 'Open an Account' : 'Request a New Account'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            Complete the wizard below to set up your banking account
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}
        >
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <motion.div
                  animate={{
                    background: i < step ? '#10b981' : i === step ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
                    borderColor: i <= step ? (i < step ? '#10b981' : 'var(--gold)') : 'rgba(255,255,255,0.12)',
                    color: i <= step ? (i < step ? 'white' : 'var(--navy)') : 'var(--text-muted)',
                    boxShadow: i === step ? '0 0 0 4px rgba(201,168,76,0.15)' : 'none',
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '1px solid',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    zIndex: 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {i < step ? <i className="fas fa-check" /> : i + 1}
                </motion.div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: i === step ? 'var(--gold)' : i < step ? '#10b981' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, margin: '0 8px', marginBottom: 24 }}>
                  <motion.div
                    animate={{ scaleX: i < step ? 1 : 0 }}
                    style={{ height: '100%', background: '#10b981', transformOrigin: 'left', originX: 0 }}
                    transition={{ duration: 0.5 }}
                  />
                  {i >= step && <div style={{ height: '100%', background: 'rgba(255,255,255,0.08)', marginTop: -1 }} />}
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Card */}
        <div className="glass-card" style={{ padding: 36, overflow: 'hidden' }}>
          <AnimatePresence mode="wait" custom={direction}>
            {step === 0 && (
              <motion.div key="s0" variants={pageVariants} initial="enter" animate="center" exit="exit">
                <h5 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 6 }}>Choose Account Type</h5>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginBottom: 28 }}>
                  Select the type that suits your financial goals
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 16,
                    marginBottom: 32,
                  }}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <motion.div
                      key={t.key}
                      onClick={() => setSelectedType(t.key)}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        padding: '24px 18px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        textAlign: 'center',
                        border: `2px solid ${selectedType === t.key ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`,
                        background: selectedType === t.key ? 'rgba(201,168,76,0.07)' : 'rgba(255,255,255,0.03)',
                        position: 'relative',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                    >
                      {selectedType === t.key && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            width: 22,
                            height: 22,
                            background: 'var(--gold)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--navy)',
                            fontSize: '0.65rem',
                          }}
                        >
                          <i className="fas fa-check" />
                        </motion.div>
                      )}
                      <motion.div
                        animate={{
                          background: selectedType === t.key ? 'var(--gold)' : 'rgba(201,168,76,0.1)',
                          color: selectedType === t.key ? 'var(--navy)' : 'var(--gold)',
                        }}
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 14px',
                          fontSize: '1.3rem',
                          border: '1px solid rgba(201,168,76,0.2)',
                        }}
                      >
                        <i className={`fas ${t.icon}`} />
                      </motion.div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', marginBottom: 6 }}>
                        {t.label}
                      </div>
                      <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>{t.desc}</div>
                    </motion.div>
                  ))}
                </div>

                <div
                  style={{
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.18)',
                    borderRadius: 10,
                    padding: '14px 18px',
                    marginBottom: 28,
                    display: 'flex',
                    gap: 12,
                  }}
                >
                  <i className="fas fa-circle-info" style={{ color: 'var(--gold)', marginTop: 2 }} />
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.65 }}>
                    All GMbank accounts are FDIC-insured up to ₹5 lakh. No monthly maintenance fees for the first
                    year.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-gold" onClick={handleNext} style={{ opacity: selectedType ? 1 : 0.5 }}>
                    Continue <i className="fas fa-arrow-right ms-1" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" variants={pageVariants} initial="enter" animate="center" exit="exit">
                <h5 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 6 }}>Account Details</h5>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginBottom: 28 }}>
                  Link this account to a user and set the opening balance
                </p>

                {error && (
                  <div className="field-alert field-alert-error">
                    <i className="fas fa-exclamation-circle" /> {error}
                  </div>
                )}

                <div className="form-field">
                  <label className="field-label">Account Holder (User ID)</label>
                  {!isAdmin ? (
                    <input className="field-input" value={`${currentUser?.name || 'User'} (ID: ${currentUser?.id || '-'})`} disabled />
                  ) : users.length > 0 ? (
                    <select
                      className="field-select"
                      value={form.userId}
                      onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))}
                    >
                      <option value="">Select user...</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.email}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="input-icon-wrap">
                      <i className="fas fa-id-badge icon" />
                      <input
                        type="number"
                        className="field-input"
                        placeholder="Enter User ID (e.g. 1)"
                        value={form.userId}
                        onChange={(e) => setForm((p) => ({ ...p, userId: e.target.value }))}
                        required
                        min="1"
                      />
                    </div>
                  )}
                </div>

                <div className="form-field">
                  <label className="field-label">Initial Deposit (₹)</label>
                  <div className="input-icon-wrap">
                    <i className="fas fa-indian-rupee-sign icon" />
                    <input
                      type="number"
                      className="field-input"
                      placeholder="e.g. 5000"
                      value={form.balance}
                      onChange={(e) => setForm((p) => ({ ...p, balance: e.target.value }))}
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-label">
                    Account Number{' '}
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        textTransform: 'none',
                        letterSpacing: 'normal',
                        fontWeight: 400,
                      }}
                    >
                      (optional — auto-generated if blank)
                    </span>
                  </label>
                  <div className="input-icon-wrap">
                    <i className="fas fa-hashtag icon" />
                    <input
                      type="number"
                      className="field-input"
                      placeholder="Auto-generated"
                      value={form.accountNumber}
                      onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <button className="btn-ghost" onClick={() => goStep(0)}>
                    <i className="fas fa-arrow-left" /> Back
                  </button>
                  <button className="btn-gold" onClick={handleNext}>
                    Review <i className="fas fa-arrow-right ms-1" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" variants={pageVariants} initial="enter" animate="center" exit="exit">
                <h5 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 6 }}>Review & Confirm</h5>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem', marginBottom: 28 }}>
                  Please verify the details before opening your account
                </p>

                {error && (
                  <div className="field-alert field-alert-error">
                    <i className="fas fa-exclamation-circle" /> {error}
                  </div>
                )}

                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '4px 0',
                    marginBottom: 28,
                  }}
                >
                  {[
                    {
                      label: 'Account Type',
                      value: ACCOUNT_TYPES.find((t) => t.key === selectedType)?.label,
                      icon: ACCOUNT_TYPES.find((t) => t.key === selectedType)?.icon,
                    },
                    {
                      label: 'Account Holder (User ID)',
                      value: users.find((u) => String(u.id) === form.userId)?.name || `User ID: ${form.userId}`,
                    },
                    {
                      label: 'Opening Balance',
                      value: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(form.balance),
                    },
                    { label: 'Account Number', value: form.accountNumber || 'Auto-generated' },
                    { label: 'Initial Status', value: isAdmin ? 'ACTIVE' : 'PENDING' },
                  ].map(({ label, value, icon }) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px 20px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>{label}</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {icon && <i className={`fas ${icon}`} style={{ color: 'var(--gold)', fontSize: '0.8rem' }} />}
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 10,
                    padding: '14px 18px',
                    marginBottom: 28,
                    display: 'flex',
                    gap: 12,
                  }}
                >
                  <i className="fas fa-shield-halved" style={{ color: '#10b981', marginTop: 2 }} />
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
                    By confirming, you agree to GMbank's account terms. Account creation is immediate and your
                    funds are FDIC insured.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                  <button className="btn-ghost" onClick={() => goStep(1)}>
                    <i className="fas fa-arrow-left" /> Back
                  </button>
                  <button className="btn-gold" onClick={handleSubmit} disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner" /> Creating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check" /> {isAdmin ? 'Confirm & Open Account' : 'Submit Request'}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  )
}

