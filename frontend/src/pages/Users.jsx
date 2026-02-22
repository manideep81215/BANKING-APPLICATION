import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getPendingAccountRequests,
  approveAccountRequest,
  rejectAccountRequest,
} from '../api/bankingApi'
import Layout from '../components/Layout'
import { useToast } from '../components/Toast'
import { isAdmin, isManager } from '../utils/roles'

function UserModal({ mode, user, onClose, onDone }) {
  const toast = useToast()
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(
    isEdit
      ? { name: user.name, email: user.email, number: user.number, role: user.role, password: '' }
      : { name: '', email: '', password: '', number: '', role: 'USER' },
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isEdit) {
        await updateUser(user.id, {
          ...user,
          name: form.name,
          email: form.email,
          number: Number(form.number),
          role: form.role,
        })
        toast('User updated successfully.', 'success')
      } else {
        await createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          number: Number(form.number),
          role: form.role || 'USER',
        })
        toast('User created successfully.', 'success')
      }
      onDone()
    } catch (err) {
      setError(err?.response?.data || `Failed to ${isEdit ? 'update' : 'create'} user.`)
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
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        style={{ maxWidth: 500 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', margin: 0 }}>
            {isEdit ? 'Edit User' : 'Create New User'}
          </h5>
          <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        {error && (
          <div className="field-alert field-alert-error">
            <i className="fas fa-exclamation-circle" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12">
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="field-label">Full Name</label>
                <div className="input-icon-wrap">
                  <i className="fas fa-user icon" />
                  <input
                    type="text"
                    className="field-input"
                    placeholder="John Smith"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="field-label">Email</label>
                <div className="input-icon-wrap">
                  <i className="fas fa-envelope icon" />
                  <input
                    type="email"
                    className="field-input"
                    placeholder="user@example.com"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
              </div>
            </div>
            {!isEdit && (
              <div className="col-12">
                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label className="field-label">Password</label>
                  <div className="input-icon-wrap">
                    <i className="fas fa-lock icon" />
                    <input
                      type="password"
                      className="field-input"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="col-6">
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="field-label">Phone</label>
                <div className="input-icon-wrap">
                  <i className="fas fa-phone icon" />
                  <input
                    type="tel"
                    className="field-input"
                    placeholder="9876543210"
                    value={form.number}
                    onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label className="field-label">Role</label>
                <select
                  className="field-select"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="MANAGER">MANAGER</option>
                </select>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="button" className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-gold" style={{ flex: 2, justifyContent: 'center' }} disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  {isEdit ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <i className={`fas ${isEdit ? 'fa-pen' : 'fa-plus'}`} /> {isEdit ? 'Update User' : 'Create User'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function DeleteUserModal({ user, onClose, onDone }) {
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteUser(user.id)
      toast('User deleted.', 'success')
      onDone()
    } catch (err) {
      toast(err?.response?.data || 'Failed to delete user.', 'error')
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
        style={{ maxWidth: 460 }}
      >
        <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
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
              margin: '0 auto 18px',
              fontSize: '1.5rem',
              color: '#ef4444',
            }}
          >
            <i className="fas fa-trash-can" />
          </div>
          <h5 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.25rem', marginBottom: 10 }}>
            Delete User?
          </h5>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.65, marginBottom: 24 }}>
            This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>.
            This action cannot be undone.
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

export default function Users() {
  const [users, setUsers] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const toast = useToast()
  const currentUser = JSON.parse(localStorage.getItem('nx_user') || '{}')
  const canDeleteAdmin = isManager(currentUser?.role)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const [res, reqRes] = await Promise.all([getAllUsers(), getPendingAccountRequests()])
      setUsers(res.data || [])
      setPendingRequests(reqRes.data || [])
    } catch (err) {
      toast(err?.response?.data || 'Could not load users. Please login again.', 'error')
      setUsers([])
      setPendingRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const filtered = users.filter(
    (u) =>
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  )

  const roleColor = { ADMIN: '#c9a84c', MANAGER: '#3b82f6', USER: '#10b981' }
  const approveRequest = async (id) => {
    try {
      await approveAccountRequest(id)
      toast('Account request approved.', 'success')
      fetchUsers()
    } catch {
      toast('Failed to approve request.', 'error')
    }
  }

  const rejectRequest = async (id) => {
    try {
      await rejectAccountRequest(id)
      toast('Account request rejected.', 'info')
      fetchUsers()
    } catch {
      toast('Failed to reject request.', 'error')
    }
  }

  return (
    <Layout>
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
            <i className="fas fa-users me-2" />
            People
          </p>
          <h1 className="page-title">User Management</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>
            {users.length} registered account holders
          </p>
        </div>
        <button className="btn-gold" onClick={() => setModal({ type: 'create' })}>
          <i className="fas fa-user-plus" /> Add User
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12 }}
        className="glass-card"
        style={{ padding: 22, marginBottom: 24 }}
      >
        <h5 style={{ fontFamily: "'Playfair Display',serif", marginBottom: 14 }}>Pending Account Requests</h5>
        {pendingRequests.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>No pending requests.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {req.user?.name || 'User'} requested account #{req.accountNumber}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    User ID: {req.user?.id} | Status: {req.status}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-outline-gold"
                    style={{ padding: '8px 12px', fontSize: '0.78rem' }}
                    onClick={() => approveRequest(req.id)}
                  >
                    <i className="fas fa-check" /> Approve
                  </button>
                  <button
                    className="btn-danger"
                    style={{ padding: '8px 12px', fontSize: '0.78rem' }}
                    onClick={() => rejectRequest(req.id)}
                  >
                    <i className="fas fa-xmark" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card"
        style={{ padding: '18px 24px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center' }}
      >
        <div className="input-icon-wrap" style={{ flex: 1 }}>
          <i className="fas fa-magnifying-glass icon" />
          <input
            type="text"
            className="field-input"
            placeholder="Search users by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-ghost" onClick={fetchUsers}>
          <i className="fas fa-rotate-right" />
        </button>
      </motion.div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <span className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      ) : (
        <motion.div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          <AnimatePresence>
            {filtered.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.06 }}
                className="glass-card"
                style={{ padding: 24, position: 'relative', overflow: 'hidden' }}
                whileHover={{ y: -3, borderColor: 'rgba(201,168,76,0.35)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: `${roleColor[u.role] || '#7a8299'}18`,
                      border: `1px solid ${roleColor[u.role] || '#7a8299'}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: roleColor[u.role] || '#7a8299',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      fontFamily: "'Playfair Display',serif",
                      flexShrink: 0,
                    }}
                  >
                    {u.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        marginBottom: 3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.email}
                    </div>
                  </div>
                  <span
                    style={{
                      background: `${roleColor[u.role] || '#7a8299'}18`,
                      color: roleColor[u.role] || '#7a8299',
                      border: `1px solid ${roleColor[u.role] || '#7a8299'}30`,
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      letterSpacing: '0.07em',
                      flexShrink: 0,
                    }}
                  >
                    {u.role}
                  </span>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 9,
                    padding: '12px 14px',
                    marginBottom: 18,
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>User ID</span>
                  <span style={{ fontWeight: 600 }}>#{u.id}</span>
                </div>
                {u.number && (
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 9,
                      padding: '12px 14px',
                      marginBottom: 18,
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Phone</span>
                    <span style={{ fontWeight: 600 }}>{u.number}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn-ghost"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}
                    onClick={() => setModal({ type: 'edit', user: u })}
                  >
                    <i className="fas fa-pen" /> Edit
                  </button>
                  <button
                    className="btn-danger"
                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}
                    disabled={!canDeleteAdmin && isAdmin(u.role)}
                    onClick={() => setModal({ type: 'delete', user: u })}
                  >
                    <i className="fas fa-trash" /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <i
            className="fas fa-users-slash"
            style={{ fontSize: '2.5rem', display: 'block', marginBottom: 16, opacity: 0.4 }}
          />
          No users found
        </div>
      )}

      <AnimatePresence>
        {modal?.type === 'create' && (
          <UserModal
            mode="create"
            onClose={() => setModal(null)}
            onDone={() => {
              setModal(null)
              fetchUsers()
            }}
          />
        )}
        {modal?.type === 'edit' && (
          <UserModal
            mode="edit"
            user={modal.user}
            onClose={() => setModal(null)}
            onDone={() => {
              setModal(null)
              fetchUsers()
            }}
          />
        )}
        {modal?.type === 'delete' && (
          <DeleteUserModal
            user={modal.user}
            onClose={() => setModal(null)}
            onDone={() => {
              setModal(null)
              fetchUsers()
            }}
          />
        )}
      </AnimatePresence>
    </Layout>
  )
}
