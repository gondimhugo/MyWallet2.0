import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Transactions } from './pages/Transactions'
import { CsvPage } from './pages/CsvPage'

type PageKey = 'dashboard' | 'transactions' | 'csv'

export default function App() {
  const [page, setPage] = useState<PageKey>('dashboard')
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('access_token'))

  useEffect(() => {
    api.setToken(token)
  }, [token])

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setToken(null)
  }

  if (!token) {
    return <Login onLogin={(pair) => {
      localStorage.setItem('access_token', pair.access_token)
      localStorage.setItem('refresh_token', pair.refresh_token)
      setToken(pair.access_token)
    }} />
  }

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Gastos</strong>
            <span className="badge">v3.0</span>
          </div>
          <div className="nav">
            <button className={page==='dashboard'?'active':''} onClick={() => setPage('dashboard')}>Dashboard</button>
            <button className={page==='transactions'?'active':''} onClick={() => setPage('transactions')}>Transações</button>
            <button className={page==='csv'?'active':''} onClick={() => setPage('csv')}>CSV</button>
            <button className="btn secondary" onClick={logout}>Sair</button>
          </div>
        </div>
      </div>

      <div className="container">
        {page === 'dashboard' && <Dashboard />}
        {page === 'transactions' && <Transactions />}
        {page === 'csv' && <CsvPage />}
      </div>
    </div>
  )
}
