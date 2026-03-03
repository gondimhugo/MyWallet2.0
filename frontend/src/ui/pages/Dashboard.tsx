import React, { useMemo, useState } from 'react'
import { api } from '../../lib/api'

function iso(d: Date) { return d.toISOString().slice(0,10) }

export function Dashboard() {
  const now = new Date()
  const first = useMemo(() => new Date(now.getFullYear(), now.getMonth(), 1), [])
  const last = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0), [])

  const [from, setFrom] = useState(iso(first))
  const [to, setTo] = useState(iso(last))
  const [data, setData] = useState<any | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setErr(null)
    setLoading(true)
    try {
      const s = await api.getSummary(from, to)
      setData(s)
    } catch(e:any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
      <div className="panel">
        <div className="row" style={{ justifyContent:'space-between' }}>
          <div>
            <h2 style={{ margin:0 }}>Dashboard</h2>
            <div style={{ color:'var(--muted)', fontSize: 13 }}>Consolidado por período (calculado no backend).</div>
          </div>
          <div className="row">
            <div className="field">
              <label>De</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="field">
              <label>Até</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <button className="btn" onClick={load} disabled={loading}>{loading?'Carregando...':'Atualizar'}</button>
          </div>
        </div>
        {err && <div style={{ marginTop: 12, color:'var(--bad)' }}>{err}</div>}
      </div>

      {data && (
        <div className="grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="kpi">
            <div className="label">Receitas</div>
            <div className="value" style={{ color:'var(--ok)' }}>R$ {data.income_total.toFixed(2)}</div>
          </div>
          <div className="kpi">
            <div className="label">Despesas</div>
            <div className="value" style={{ color:'var(--bad)' }}>R$ {data.expense_total.toFixed(2)}</div>
          </div>
          <div className="kpi">
            <div className="label">Saldo líquido</div>
            <div className="value">R$ {data.net_total.toFixed(2)}</div>
          </div>
        </div>
      )}

      {data && (
        <div className="panel">
          <h3 style={{ marginTop:0 }}>Despesas por categoria (simplificado)</h3>
          <div style={{ color:'var(--muted)', fontSize: 13 }}>
            O backend retorna por `category_id`. Você pode enriquecer mostrando o nome via /catalog/categories.
          </div>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Total de despesas</th>
                </tr>
              </thead>
              <tbody>
                {data.by_category.map((x:any, i:number) => (
                  <tr key={i}>
                    <td style={{ color:'var(--muted)' }}>{x.category_id || 'Sem categoria'}</td>
                    <td>R$ {Number(x.expense_total || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {data.by_category.length === 0 && (
                  <tr><td colSpan={2} style={{ color:'var(--muted)' }}>Sem dados no período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
