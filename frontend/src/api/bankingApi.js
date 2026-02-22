// src/api/bankingApi.js
// All API calls to Spring Boot backend at http://localhost:8080

import axios from 'axios'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '')

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// Attach token if stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nx_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const user = JSON.parse(localStorage.getItem('nx_user') || '{}')
  if (user?.id) config.headers['X-User-Id'] = String(user.id)
  return config
})

/* ─── USERS ─────────────────────────────────────── */
export const loginUser = (data) => api.post('/auth/login', data)
export const registerUser = (data) => api.post('/auth/register', data)

export const createUser = (data) => api.post('/users', data)
export const getAllUsers = () => api.get('/users')
export const getUserById = (id) => api.get(`/users/${id}`)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)

/* ─── ACCOUNTS ───────────────────────────────────── */
export const createAccount = (data) => api.post('/accounts', data)
export const requestAccount = (data) => api.post('/accounts/request', data)
export const getAllAccounts = () => api.get('/accounts')
export const getAccountsByUserId = (userId) => api.get(`/accounts/user/${userId}`)
export const getPendingAccountRequests = () => api.get('/accounts/requests')
export const approveAccountRequest = (id) => api.post(`/accounts/${id}/approve`)
export const rejectAccountRequest = (id) => api.post(`/accounts/${id}/reject`)
export const getAccountById = (id) => api.get(`/accounts/${id}`)
export const updateAccount = (id, data) => api.put(`/accounts/${id}`, data)
export const deleteAccount = (id) => api.delete(`/accounts/${id}`)
export const getBalance = (id) => api.get(`/accounts/${id}/balance`)
export const deposit = (id, amount) => api.post(`/accounts/${id}/deposit`, { amount })
export const withdraw = (id, amount, pin, confirmPin) => api.post(`/accounts/${id}/withdraw`, { amount, pin, confirmPin })
export const changeAccountPin = (id, currentPin, newPin, confirmNewPin) =>
  api.post(`/accounts/${id}/pin/change`, { currentPin, newPin, confirmNewPin })
export const transferMoney = (fromAccountId, toAccountId, amount) =>
  api.post('/accounts/transfer', { fromAccountId, toAccountId, amount })
export const getTransactionsByAccountId = (accountId) => api.get(`/transactions/account/${accountId}`)
export const getStatementTransactions = () => api.get('/transactions/statement')

export default api
