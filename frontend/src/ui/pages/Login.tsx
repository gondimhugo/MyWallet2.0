import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import {
  parseApiError,
  passwordStrength,
  validateEmail,
  validatePassword,
} from '../../lib/validation'

type Mode = 'login' | 'register'

type TokenPair = { access_token: string; refresh_token: string }

export function Login({ onLogin }: { onLogin: (pair: TokenPair) => void }) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean; fullName?: boolean }>({})

  const emailError = touched.email ? validateEmail(email) : null
  const passwordError = touched.password ? validatePassword(password) : null
  const nameError =
    mode === 'register' && touched.fullName && !fullName.trim()
      ? 'Informe seu nome'
      : null

  const strength = useMemo(() => passwordStrength(password), [password])
  const showStrength = mode === 'register' && password.length > 0

  const submitDisabled =
    loading ||
    !!validateEmail(email) ||
    !!validatePassword(password) ||
    (mode === 'register' && !fullName.trim())

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true, fullName: true })
    if (
      validateEmail(email) ||
      validatePassword(password) ||
      (mode === 'register' && !fullName.trim())
    ) {
      return
    }

    setError(null)
    setLoading(true)
    try {
      const path = mode === 'login' ? '/auth/login' : '/auth/register'
      const body =
        mode === 'login'
          ? { email: email.trim(), password }
          : { email: email.trim(), password, full_name: fullName.trim() }
      const res = await api.request(path, { method: 'POST', body: JSON.stringify(body) })
      if (!res || !res.access_token) throw new Error('Resposta inválida do servidor')
      onLogin(res)
    } catch (err) {
      setError(parseApiError(err, 'Não foi possível autenticar. Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setTouched({})
  }

  return (
    <div className='login-wrapper'>
      <form className='card login-card auth-card' onSubmit={submit} noValidate>
        <div className='auth-header'>
          <h2>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>
          <p className='muted'>
            {mode === 'login'
              ? 'Acesse seu MyWallet'
              : 'Cadastre-se para começar a organizar suas finanças'}
          </p>
        </div>

        <div className='auth-tabs' role='tablist'>
          <button
            type='button'
            role='tab'
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Entrar
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={mode === 'register'}
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Criar conta
          </button>
        </div>

        <div className='auth-form'>
          {mode === 'register' && (
            <label className='field'>
              <span>Nome</span>
              <input
                type='text'
                autoComplete='name'
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                placeholder='Seu nome'
                aria-invalid={!!nameError}
              />
              {nameError && <span className='field-error'>{nameError}</span>}
            </label>
          )}

          <label className='field'>
            <span>E-mail</span>
            <input
              type='email'
              autoComplete='email'
              inputMode='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder='voce@exemplo.com'
              aria-invalid={!!emailError}
            />
            {emailError && <span className='field-error'>{emailError}</span>}
          </label>

          <label className='field'>
            <span>Senha</span>
            <div className='password-input'>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
            {showStrength && (
              <div className={`password-strength s-${strength.score}`}>
                <div className='bar'><span style={{ width: `${(strength.score / 4) * 100}%` }} /></div>
                <span className='label'>{strength.label}</span>
              </div>
            )}
          </label>
        </div>

        {error && <div className='auth-alert error'>{error}</div>}

        <button
          type='submit'
          className='btn btn-primary auth-submit'
          disabled={submitDisabled}
        >
          {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <div className='auth-footer'>
          {mode === 'login' ? (
            <>
              <Link to='/forgot-password' className='link'>
                Esqueci minha senha
              </Link>
              <button type='button' className='link link-button' onClick={() => switchMode('register')}>
                Criar uma conta
              </button>
            </>
          ) : (
            <button type='button' className='link link-button' onClick={() => switchMode('login')}>
              Já tenho conta — entrar
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
