import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { api } from '../lib/api'
import { Layout } from './components/Layout'
import { Accounts } from './pages/Accounts'
import { Dashboard } from './pages/Dashboard'
import { ForgotPassword } from './pages/ForgotPassword'
import { Invoices } from './pages/Invoices'
import { Login } from './pages/Login'
import { Planning } from './pages/Planning'
import { Profile } from './pages/Profile'
import { ResetPassword } from './pages/ResetPassword'
import { Salary } from './pages/Salary'
import { Settings } from './pages/Settings'
import { Transactions } from './pages/Transactions'

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'))
  useEffect(() => api.setToken(token), [token])

  const handleLogin = (p: { access_token: string; refresh_token: string }) => {
    localStorage.setItem('access_token', p.access_token)
    localStorage.setItem('refresh_token', p.refresh_token)
    setToken(p.access_token)
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setToken(null)
  }

  if (!token) {
    return (
      <Routes>
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/reset-password' element={<ResetPassword />} />
        <Route path='*' element={<Login onLogin={handleLogin} />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout onLogout={handleLogout} />}>
        <Route path='/' element={<Dashboard />} />
        <Route path='/transactions' element={<Transactions />} />
        <Route path='/accounts' element={<Accounts />} />
        <Route path='/invoices' element={<Invoices />} />
        <Route path='/planning' element={<Planning />} />
        <Route path='/salary' element={<Salary />} />
        <Route path='/profile' element={<Profile onLogout={handleLogout} />} />
        <Route path='/settings' element={<Settings />} />
      </Route>
      <Route path='*' element={<Navigate to='/' />} />
    </Routes>
  )
}
