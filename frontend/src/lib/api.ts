const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
let token: string | null = localStorage.getItem('access_token')

export const api = {
  setToken(t: string | null) { token = t },
  async request(path: string, init: RequestInit = {}) {
    const res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    })
    if (!res.ok) throw new Error(await res.text())
    const txt = await res.text(); return txt ? JSON.parse(txt) : null
  },
}
