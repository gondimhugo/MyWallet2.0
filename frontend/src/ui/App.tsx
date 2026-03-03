import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api } from '../lib/api'
import { Layout } from './components/Layout'
import { Accounts } from './pages/Accounts'
import { Dashboard } from './pages/Dashboard'
import { Invoices } from './pages/Invoices'
import { Login } from './pages/Login'
import { Planning } from './pages/Planning'
import { Salary } from './pages/Salary'
import { Settings } from './pages/Settings'
import { Transactions } from './pages/Transactions'

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'))
  useEffect(() => api.setToken(token), [token])
  if (!token) return <Login onLogin={(p) => { localStorage.setItem('access_token', p.access_token); localStorage.setItem('refresh_token', p.refresh_token); setToken(p.access_token) }} />
  return <Routes><Route element={<Layout onLogout={() => { localStorage.clear(); setToken(null) }} />}><Route path='/' element={<Dashboard />} /><Route path='/transactions' element={<Transactions />} /><Route path='/accounts' element={<Accounts />} /><Route path='/invoices' element={<Invoices />} /><Route path='/planning' element={<Planning />} /><Route path='/salary' element={<Salary />} /><Route path='/settings' element={<Settings />} /></Route><Route path='*' element={<Navigate to='/' />} /></Routes>
}
