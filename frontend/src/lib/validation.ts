export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): string | null {
  const trimmed = email.trim()
  if (!trimmed) return 'Informe seu e-mail'
  if (!EMAIL_REGEX.test(trimmed)) return 'E-mail inválido'
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Informe a senha'
  if (password.length < 6) return 'A senha deve ter ao menos 6 caracteres'
  if (password.length > 128) return 'Senha muito longa'
  if (password.trim() !== password) return 'A senha não pode começar ou terminar com espaços'
  return null
}

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4
  label: string
}

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '' }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']
  return { score: Math.min(score, 4) as PasswordStrength['score'], label: labels[Math.min(score, 4)] }
}

export function parseApiError(err: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  if (!raw) return fallback
  // FastAPI returns JSON with {"detail": "..."} or {"detail": [...]}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const detail = (parsed as { detail?: unknown }).detail
      if (typeof detail === 'string') return detail
      if (Array.isArray(detail) && detail.length) {
        const first = detail[0]
        if (first && typeof first === 'object' && 'msg' in first) {
          return String((first as { msg: unknown }).msg)
        }
      }
    }
  } catch {
    /* not JSON, fall through */
  }
  return raw
}
