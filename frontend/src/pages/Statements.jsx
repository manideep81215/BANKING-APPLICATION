import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Layout from '../components/Layout'
import { getStatementTransactions } from '../api/bankingApi'
import { useToast } from '../components/Toast'
import { isPrivilegedRole } from '../utils/roles'

const TYPE_STYLES = {
  CREDIT: { label: 'Deposit', color: '#10b981', sign: '+' },
  DEBIT: { label: 'Withdraw', color: '#ef4444', sign: '-' },
  TRANSFER: { label: 'Transfer', color: '#3b82f6', sign: '' },
}

export default function Statements() {
  const currentUser = JSON.parse(localStorage.getItem('nx_user') || '{}')
  const isAdmin = isPrivilegedRole(currentUser?.role)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const toast = useToast()

  useEffect(() => {
    ;(async () => {
      try {
        const res = await getStatementTransactions()
        setTransactions(res.data || [])
      } catch {
        toast('Could not load statements.', 'error')
        setTransactions([])
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = transactions.filter((tx) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      String(tx.id || '').includes(q) ||
      String(tx.referenceNumber || '').toLowerCase().includes(q) ||
      String(tx.fromAccountNumber || '').includes(q) ||
      String(tx.toAccountNumber || '').includes(q) ||
      String(tx.type || '').toLowerCase().includes(q)
    )
  })

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0)

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
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
          <i className="fas fa-file-invoice me-2" />
          Statements
        </p>
        <h1 className="page-title">{isAdmin ? 'All Transactions' : 'My Transactions'}</h1>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: '18px 24px', marginBottom: 18 }}>
        <div className="input-icon-wrap" style={{ maxWidth: 420 }}>
          <i className="fas fa-magnifying-glass icon" />
          <input
            type="text"
            className="field-input"
            placeholder="Search by ref/account/type/id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
              <span className="spinner" style={{ width: 36, height: 36 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '54px 0', color: 'var(--text-muted)' }}>
              <i className="fas fa-receipt" style={{ fontSize: '2rem', marginBottom: 10, display: 'block', opacity: 0.45 }} />
              No transactions found
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date & Time</th>
                  <th>Type</th>
                  <th>From Account</th>
                  <th>To Account</th>
                  <th>Amount</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => {
                  const style = TYPE_STYLES[tx.type] || { label: tx.type || '-', color: '#7a8299', sign: '' }
                  return (
                    <tr key={tx.id}>
                      <td>#{tx.id}</td>
                      <td>{tx.timestamp ? new Date(tx.timestamp).toLocaleString('en-IN') : '-'}</td>
                      <td>
                        <span style={{ color: style.color, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                          {style.label}
                        </span>
                      </td>
                      <td>{tx.fromAccountNumber ? String(tx.fromAccountNumber).replace(/(\d{4})(?=\d)/g, '$1 ') : '-'}</td>
                      <td>{tx.toAccountNumber ? String(tx.toAccountNumber).replace(/(\d{4})(?=\d)/g, '$1 ') : '-'}</td>
                      <td style={{ color: style.color, fontWeight: 700 }}>
                        {style.sign}
                        {fmt(tx.amount)}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{tx.referenceNumber || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </Layout>
  )
}
