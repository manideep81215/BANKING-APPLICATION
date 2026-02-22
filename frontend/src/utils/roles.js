export const normalizeRole = (role) => String(role || '').toUpperCase()

export const isManager = (role) => normalizeRole(role) === 'MANAGER'

export const isAdmin = (role) => normalizeRole(role) === 'ADMIN'

export const isPrivilegedRole = (role) => {
  const normalized = normalizeRole(role)
  return normalized === 'ADMIN' || normalized === 'MANAGER'
}
