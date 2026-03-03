import React, { useState } from 'react'
import { api, TokenPair } from '../../lib/api'

export function Login({ onLogin }: { onLogin: (pair: TokenPair) => void }) {
  const [email, setEmail] = useState('admin@gastos.local')
  const [password, setPassword] = useState('admin123')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setErr(null)
    setLoading(true)
    try {
      const pair = await api.login(email, password)
      onLogin(pair)
    } catch (e:any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="panel" style={{ maxWidth: 520, margin: '40px auto' }}>
        <h2 style={{ marginTop: 0 }}>Entrar</h2>
        <p style={{ color:'var(--muted)', marginTop: 0 }}>
          Use o usuário seed: <code>admin@gastos.local</code> / <code>admin123</code>
        </p>

        <div className="grid" style={{ gridTemplateColumns:'1fr', gap: 10 }}>
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div className="panel" style={{ borderColor:'rgba(239,71,111,0.6)' }}>{err}</div>}
          <button className="btn" onClick={submit} disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        </div>
      </div>
    </div>
  )
}
