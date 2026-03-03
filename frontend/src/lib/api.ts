const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
let token: string | null = localStorage.getItem('access_token')

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return null

  const res = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    token = null
    return null
  }

  const data = await res.json()
  token = data.access_token
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('refresh_token', data.refresh_token)
  return token
}

async function doRequest(path: string, init: RequestInit = {}) {
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })
}

export const api = {
  setToken(t: string | null) {
    token = t
  },
  async request(path: string, init: RequestInit = {}) {
    let res = await doRequest(path, init)

    if (res.status === 401 && path !== '/auth/refresh') {
      const newToken = await refreshAccessToken()
      if (newToken) {
        res = await doRequest(path, init)
      }
    }

    if (!res.ok) throw new Error(await res.text())
    const txt = await res.text()
    return txt ? JSON.parse(txt) : null
  },
}
