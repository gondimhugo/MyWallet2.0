import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { parseApiError, passwordStrength, validatePassword } from '../../lib/validation'

export function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [touched, setTouched] = useState<{ token?: boolean; password?: boolean; confirm?: boolean }>({})

  useEffect(() => {
    const fromQuery = params.get('token')
    if (fromQuery) setToken(fromQuery)
  }, [params])

  const tokenError = touched.token && !token.trim() ? 'Informe o token recebido' : null
  const passwordError = touched.password ? validatePassword(password) : null
  const confirmError =
    touched.confirm && password !== confirm ? 'As senhas não coincidem' : null

  const strength = useMemo(() => passwordStrength(password), [password])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ token: true, password: true, confirm: true })
    if (!token.trim() || validatePassword(password) || password !== confirm) return
    setError(null)
    setLoading(true)
    try {
      await api.request('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim(), password }),
      })
      setDone(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setError(parseApiError(err, 'Não foi possível redefinir a senha.'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className='login-wrapper'>
        <div className='card login-card auth-card'>
          <div className='auth-header'>
            <h2>Senha redefinida</h2>
            <p className='muted'>Você será redirecionado para o login...</p>
          </div>
          <Link to='/' className='btn btn-primary auth-submit'>
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className='login-wrapper'>
      <form className='card login-card auth-card' onSubmit={submit} noValidate>
        <div className='auth-header'>
          <h2>Nova senha</h2>
          <p className='muted'>
            Cole o token recebido por e-mail e escolha uma nova senha.
          </p>
        </div>

        <div className='auth-form'>
          <label className='field'>
            <span>Token</span>
            <input
              type='text'
              autoComplete='one-time-code'
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, token: true }))}
              placeholder='Cole o token aqui'
              aria-invalid={!!tokenError}
            />
            {tokenError && <span className='field-error'>{tokenError}</span>}
          </label>

          <label className='field'>
            <span>Nova senha</span>
            <div className='password-input'>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete='new-password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder='••••••••'
                aria-invalid={!!passwordError}
              />
              <button
                type='button'
                className='password-toggle'
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {passwordError && <span className='field-error'>{passwordError}</span>}
            {password && (
              <div className={`password-strength s-${strength.score}`}>
                <div className='bar'><span style={{ width: `${(strength.score / 4) * 100}%` }} /></div>
                <span className='label'>{strength.label}</span>
              </div>
            )}
          </label>

          <label className='field'>
            <span>Confirmar senha</span>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete='new-password'
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
              placeholder='••••••••'
              aria-invalid={!!confirmError}
            />
            {confirmError && <span className='field-error'>{confirmError}</span>}
          </label>
        </div>

        {error && <div className='auth-alert error'>{error}</div>}

        <button type='submit' className='btn btn-primary auth-submit' disabled={loading}>
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </button>

        <div className='auth-footer'>
          <Link to='/' className='link'>
            Voltar ao login
          </Link>
        </div>
      </form>
    </div>
  )
}
