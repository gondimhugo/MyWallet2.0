export type TokenPair = { access_token: string; refresh_token: string; token_type: string }

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

class ApiClient {
  private token: string | null = null
  setToken(t: string | null) { this.token = t }

  private headers(extra?: Record<string,string>) {
    const h: Record<string,string> = { 'Content-Type': 'application/json', ...(extra||{}) }
    if (this.token) h['Authorization'] = `Bearer ${this.token}`
    return h
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const r = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password }),
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }

  async listTransactions(): Promise<any[]> {
    const r = await fetch(`${API_URL}/transactions`, { headers: this.headers() })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }

  async createTransaction(payload: any): Promise<any> {
    const r = await fetch(`${API_URL}/transactions`, {
      method:'POST',
      headers: this.headers(),
      body: JSON.stringify(payload)
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }

  async patchTransaction(id: string, payload: any): Promise<any> {
    const r = await fetch(`${API_URL}/transactions/${id}`, {
      method:'PATCH',
      headers: this.headers(),
      body: JSON.stringify(payload)
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }

  async deleteTransaction(id: string): Promise<void> {
    const r = await fetch(`${API_URL}/transactions/${id}`, {
      method:'DELETE',
      headers: this.headers(),
    })
    if (!r.ok) throw new Error(await r.text())
  }

  async getSummary(from_date: string, to_date: string): Promise<any> {
    const url = new URL(`${API_URL}/transactions/summary`)
    url.searchParams.set('from_date', from_date)
    url.searchParams.set('to_date', to_date)
    const r = await fetch(url.toString(), { headers: this.headers() })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }

  async importCsv(file: File): Promise<any> {
    const fd = new FormData()
    fd.append('file', file)
    const r = await fetch(`${API_URL}/import/csv`, {
      method:'POST',
      headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : undefined,
      body: fd
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }

  async exportCsv(): Promise<Blob> {
    const r = await fetch(`${API_URL}/export/csv`, {
      headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : undefined
    })
    if (!r.ok) throw new Error(await r.text())
    return r.blob()
  }
}

export const api = new ApiClient()
