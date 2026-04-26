import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'
import { parseApiError, validateEmail } from '../../lib/validation'

export function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [devToken, setDevToken] = useState<string | null>(null)

  const emailError = touched ? validateEmail(email) : null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (validateEmail(email)) return
    setError(null)
    setInfo(null)
    setDevToken(null)
    setLoading(true)
    try {
      const res = await api.request('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      })
      setInfo(res?.message || 'Pedido enviado.')
      if (res?.reset_token) setDevToken(res.reset_token)
    } catch (err) {
      setError(parseApiError(err, 'Não foi possível processar o pedido.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='login-wrapper'>
      <form className='card login-card auth-card' onSubmit={submit} noValidate>
        <div className='auth-header'>
          <h2>Recuperar senha</h2>
          <p className='muted'>
            Informe o e-mail da sua conta. Enviaremos um link para redefinir sua senha.
          </p>
        </div>

        <div className='auth-form'>
          <label className='field'>
            <span>E-mail</span>
            <input
              type='email'
              autoComplete='email'
              inputMode='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder='voce@exemplo.com'
              aria-invalid={!!emailError}
            />
            {emailError && <span className='field-error'>{emailError}</span>}
          </label>
        </div>

        {error && <div className='auth-alert error'>{error}</div>}
        {info && <div className='auth-alert success'>{info}</div>}

        {devToken && (
          <div className='auth-alert info'>
            <strong>Modo demo:</strong> use o token abaixo na próxima etapa.
            <code className='reset-token'>{devToken}</code>
            <button
              type='button'
              className='btn btn-primary'
              onClick={() => navigate(`/reset-password?token=${encodeURIComponent(devToken)}`)}
            >
              Continuar
            </button>
          </div>
        )}

        <button type='submit' className='btn btn-primary auth-submit' disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar link de recuperação'}
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
