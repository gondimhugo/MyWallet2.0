import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import {
  parseApiError,
  passwordStrength,
  validateEmail,
  validatePassword,
} from '../../lib/validation'

type Me = {
  id: string
  email: string
  full_name: string
  created_at: string | null
  last_login_at: string | null
}

type FlashKind = 'success' | 'error' | 'info'
type Flash = { kind: FlashKind; message: string } | null

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function Profile({ onLogout }: { onLogout: () => void }) {
  const [me, setMe] = useState<Me | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' })
  const [profileFlash, setProfileFlash] = useState<Flash>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwFlash, setPwFlash] = useState<Flash>(null)
  const [savingPw, setSavingPw] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteFlash, setDeleteFlash] = useState<Flash>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data: Me = await api.request('/users/me')
        if (cancelled) return
        setMe(data)
        setProfileForm({ full_name: data.full_name || '', email: data.email || '' })
      } catch (err) {
        if (!cancelled) setLoadError(parseApiError(err, 'Não foi possível carregar o perfil.'))
      } finally {
        if (!cancelled) setLoadingMe(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const profileChanged =
    !!me &&
    (profileForm.full_name.trim() !== (me.full_name || '') ||
      profileForm.email.trim().toLowerCase() !== me.email.toLowerCase())

  const profileEmailError =
    profileForm.email && validateEmail(profileForm.email)
  const profileNameError = !profileForm.full_name.trim() ? 'Informe seu nome' : null

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileFlash(null)
    if (profileEmailError || profileNameError || !profileChanged) return
    setSavingProfile(true)
    try {
      const updated: Me = await api.request('/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: profileForm.full_name.trim(),
          email: profileForm.email.trim().toLowerCase(),
        }),
      })
      setMe(updated)
      setProfileForm({ full_name: updated.full_name, email: updated.email })
      setProfileFlash({ kind: 'success', message: 'Perfil atualizado.' })
    } catch (err) {
      setProfileFlash({ kind: 'error', message: parseApiError(err) })
    } finally {
      setSavingProfile(false)
    }
  }

  const pwStrength = useMemo(() => passwordStrength(pwForm.next), [pwForm.next])
  const pwNextError = pwForm.next ? validatePassword(pwForm.next) : null
  const pwConfirmError =
    pwForm.confirm && pwForm.next !== pwForm.confirm ? 'As senhas não coincidem' : null

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwFlash(null)
    if (!pwForm.current || pwNextError || pwConfirmError || !pwForm.confirm) {
      setPwFlash({ kind: 'error', message: 'Preencha todos os campos corretamente.' })
      return
    }
    if (pwForm.current === pwForm.next) {
      setPwFlash({ kind: 'error', message: 'A nova senha deve ser diferente da atual.' })
      return
    }
    setSavingPw(true)
    try {
      await api.request('/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: pwForm.current,
          new_password: pwForm.next,
        }),
      })
      setPwFlash({ kind: 'success', message: 'Senha atualizada.' })
      setPwForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setPwFlash({ kind: 'error', message: parseApiError(err) })
    } finally {
      setSavingPw(false)
    }
  }

  const submitDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteFlash(null)
    if (!deletePassword) {
      setDeleteFlash({ kind: 'error', message: 'Informe sua senha para confirmar.' })
      return
    }
    setDeleting(true)
    try {
      await api.request('/users/me', {
        method: 'DELETE',
        body: JSON.stringify({ password: deletePassword }),
      })
      onLogout()
    } catch (err) {
      setDeleteFlash({ kind: 'error', message: parseApiError(err) })
    } finally {
      setDeleting(false)
    }
  }

  if (loadingMe) {
    return (
      <div>
        <h2>Perfil</h2>
        <div className='card'>Carregando...</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div>
        <h2>Perfil</h2>
        <div className='card auth-alert error'>{loadError}</div>
      </div>
    )
  }

  return (
    <div>
      <h2>Perfil</h2>

      <section className='card'>
        <div className='card-title'>
          <h3 style={{ margin: 0 }}>Informações da conta</h3>
        </div>
        <div className='profile-meta'>
          <div>
            <span className='muted'>Conta criada em</span>
            <strong>{formatDate(me?.created_at ?? null)}</strong>
          </div>
          <div>
            <span className='muted'>Último acesso</span>
            <strong>{formatDate(me?.last_login_at ?? null)}</strong>
          </div>
        </div>
      </section>

      <form className='card' onSubmit={submitProfile} noValidate>
        <div className='card-title'>
          <h3 style={{ margin: 0 }}>Dados pessoais</h3>
        </div>
        <div className='auth-form'>
          <label className='field'>
            <span>Nome</span>
            <input
              value={profileForm.full_name}
              onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder='Seu nome'
              aria-invalid={!!profileNameError}
            />
            {profileNameError && <span className='field-error'>{profileNameError}</span>}
          </label>
          <label className='field'>
            <span>E-mail</span>
            <input
              type='email'
              autoComplete='email'
              value={profileForm.email}
              onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
              placeholder='voce@exemplo.com'
              aria-invalid={!!profileEmailError}
            />
            {profileEmailError && <span className='field-error'>{profileEmailError}</span>}
          </label>
        </div>
        {profileFlash && <div className={`auth-alert ${profileFlash.kind}`}>{profileFlash.message}</div>}
        <div className='form-actions'>
          <button
            type='submit'
            className='btn btn-primary'
            disabled={savingProfile || !profileChanged || !!profileEmailError || !!profileNameError}
          >
            {savingProfile ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      <form className='card' onSubmit={submitPassword} noValidate>
        <div className='card-title'>
          <h3 style={{ margin: 0 }}>Alterar senha</h3>
          <button
            type='button'
            className='link link-button'
            onClick={() => setShowPw((v) => !v)}
          >
            {showPw ? 'Ocultar senhas' : 'Mostrar senhas'}
          </button>
        </div>
        <div className='auth-form'>
          <label className='field'>
            <span>Senha atual</span>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete='current-password'
              value={pwForm.current}
              onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
            />
          </label>
          <label className='field'>
            <span>Nova senha</span>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete='new-password'
              value={pwForm.next}
              onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
              aria-invalid={!!pwNextError}
            />
            {pwNextError && <span className='field-error'>{pwNextError}</span>}
            {pwForm.next && (
              <div className={`password-strength s-${pwStrength.score}`}>
                <div className='bar'><span style={{ width: `${(pwStrength.score / 4) * 100}%` }} /></div>
                <span className='label'>{pwStrength.label}</span>
              </div>
            )}
          </label>
          <label className='field'>
            <span>Confirmar nova senha</span>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete='new-password'
              value={pwForm.confirm}
              onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
              aria-invalid={!!pwConfirmError}
            />
            {pwConfirmError && <span className='field-error'>{pwConfirmError}</span>}
          </label>
        </div>
        {pwFlash && <div className={`auth-alert ${pwFlash.kind}`}>{pwFlash.message}</div>}
        <div className='form-actions'>
          <button type='submit' className='btn btn-primary' disabled={savingPw}>
            {savingPw ? 'Salvando...' : 'Atualizar senha'}
          </button>
        </div>
      </form>

      <section className='card danger-zone'>
        <div className='card-title'>
          <h3 style={{ margin: 0 }}>Zona de perigo</h3>
        </div>
        <p className='muted'>
          Excluir sua conta remove permanentemente todos os seus dados (contas, lançamentos, faturas).
          Essa ação não pode ser desfeita.
        </p>
        {!deleteOpen ? (
          <div className='form-actions'>
            <button
              type='button'
              className='btn btn-danger'
              onClick={() => setDeleteOpen(true)}
            >
              Excluir minha conta
            </button>
          </div>
        ) : (
          <form onSubmit={submitDelete} noValidate>
            <label className='field'>
              <span>Confirme com sua senha</span>
              <input
                type='password'
                autoComplete='current-password'
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
              />
            </label>
            {deleteFlash && <div className={`auth-alert ${deleteFlash.kind}`}>{deleteFlash.message}</div>}
            <div className='form-actions'>
              <button type='submit' className='btn btn-danger' disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
              <button
                type='button'
                className='btn'
                onClick={() => {
                  setDeleteOpen(false)
                  setDeletePassword('')
                  setDeleteFlash(null)
                }}
                disabled={deleting}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
