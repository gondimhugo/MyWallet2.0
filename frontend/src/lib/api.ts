const NETWORK_ERROR_MESSAGE =
  'Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente em instantes.'

function resolveBase(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (fromEnv) return fromEnv.replace(/\/+$/, '')

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocal =
      host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')
    if (!isLocal) {
      // Production fallback so a deployed build (Vercel/etc.) without
      // VITE_API_URL configured does not try to fetch http://localhost:8000.
      return 'https://mywallet-backend.onrender.com/api'
    }
  }

  return 'http://localhost:8000/api'
}

const base = resolveBase()
let token: string | null = localStorage.getItem('access_token')

// Render free-tier instances sleep after inactivity and can take ~30s to wake
// up. Use a generous timeout so the first request after a cold start does not
// surface as a bare "Failed to fetch".
const REQUEST_TIMEOUT_MS = 35_000

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(NETWORK_ERROR_MESSAGE)
    }
    // Browsers throw a TypeError ("Failed to fetch") for DNS, CORS preflight,
    // mixed-content and connection-refused failures. Translate it into a
    // human-readable message so the UI does not show the raw browser error.
    if (err instanceof TypeError) {
      throw new Error(NETWORK_ERROR_MESSAGE)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) return null

  const res = await safeFetch(`${base}/auth/refresh`, {
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
  return safeFetch(`${base}${path}`, {
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
