import { useState } from 'react'
import { api } from '../../lib/api'

export function Login({ onLogin }: { onLogin: (pair: { access_token: string; refresh_token: string }) => void }) {
  const [email, setEmail] = useState('demo@mywallet.app')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAuth = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      if (!res || !res.access_token) throw new Error('Resposta inválida do servidor')
      onLogin(res)
    } catch (err: any) {
      const message: string = err?.message || String(err) || ''
      // Erros de rede não devem disparar o fallback de registro: a segunda
      // chamada falharia pela mesma razão e mascararia o motivo real.
      if (message.startsWith('Não foi possível conectar')) {
        setError(message)
        return
      }
      // se login falhar por credenciais, tenta registrar automaticamente (fluxo demo)
      try {
        const reg = await api.request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, full_name: 'Demo' }) })
        if (!reg || !reg.access_token) throw new Error('Registro falhou')
        onLogin(reg)
      } catch (err2: any) {
        setError(err2?.message || String(err2) || 'Erro ao autenticar')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='login-wrapper'>
      <div className='card login-card'>
        <div className='card-title'>
          <h2>Entrar</h2>
          <div className='muted'>Demo</div>
        </div>
        <div className='form'>
          <input placeholder='E-mail' value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder='Senha' type='password' value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div style={{ color: 'crimson', marginTop: 10 }}>{error}</div>}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button className='btn btn-primary' onClick={handleAuth} disabled={loading}>
            {loading ? 'Carregando...' : 'Entrar / Registrar'}
          </button>
          <button className='btn' onClick={() => { setEmail('demo@mywallet.app'); setPassword('123456') }} disabled={loading}>
            Preencher
          </button>
        </div>
      </div>
    </div>
  )
}
