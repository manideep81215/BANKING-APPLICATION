import { useState, useCallback, createContext, useContext } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ToastContext = createContext(null)

const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              className={`toast toast-${t.type}`}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <i className={`fas ${icons[t.type]}`} />
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
