import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'

type TxType = 'INCOME' | 'EXPENSE'
type TxStatus = 'OPEN' | 'PAID'

function todayIso() {
  const d = new Date()
  return d.toISOString().slice(0,10)
}

export function Transactions() {
  const [rows, setRows] = useState<any[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [date, setDate] = useState(todayIso())
  const [amount, setAmount] = useState('10.00')
  const [type, setType] = useState<TxType>('EXPENSE')
  const [status, setStatus] = useState<TxStatus>('OPEN')
  const [description, setDescription] = useState('')

  const load = async () => {
    setErr(null); setLoading(true)
    try {
      const data = await api.listTransactions()
      setRows(data)
    } catch(e:any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    setErr(null)
    try {
      const payload = {
        date,
        amount: Number(amount.replace(',','.')),
        type,
        status,
        description,
        category_id: null,
        account_id: null,
      }
      await api.createTransaction(payload)
      setDescription('')
      await load()
    } catch(e:any) {
      setErr(String(e?.message || e))
    }
  }

  const markPaid = async (id: string) => {
    await api.patchTransaction(id, { status: 'PAID' })
    await load()
  }

  const del = async (id: string) => {
    if (!confirm('Excluir esta transação?')) return
    await api.deleteTransaction(id)
    await load()
  }

  return (
    <div className="grid" style={{ gridTemplateColumns:'1fr', gap: 12 }}>
      <div className="panel">
        <div className="row" style={{ justifyContent:'space-between' }}>
          <div>
            <h2 style={{ margin:0 }}>Transações</h2>
            <div style={{ color:'var(--muted)', fontSize: 13 }}>
              Tabela com scroll horizontal apenas aqui. No mobile, os campos se reorganizam.
            </div>
          </div>
          <button className="btn secondary" onClick={load} disabled={loading}>{loading?'Atualizando...':'Atualizar'}</button>
        </div>
        {err && <div style={{ marginTop: 12, color:'var(--bad)' }}>{err}</div>}
      </div>

      <div className="panel">
        <h3 style={{ marginTop:0 }}>Novo lançamento</h3>
        <div className="row">
          <div className="field">
            <label>Data</label>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Valor (R$)</label>
            <input value={amount} onChange={(e)=>setAmount(e.target.value)} />
          </div>
          <div className="field">
            <label>Tipo</label>
            <select value={type} onChange={(e)=>setType(e.target.value as TxType)}>
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e)=>setStatus(e.target.value as TxStatus)}>
              <option value="OPEN">Em aberto</option>
              <option value="PAID">Pago</option>
            </select>
          </div>
          <div className="field" style={{ minWidth: 260, flex: 1 }}>
            <label>Descrição</label>
            <input value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Ex: Mercado, Aluguel..." />
          </div>
          <button className="btn" onClick={create}>Adicionar</button>
        </div>
      </div>

      <div className="panel">
        <h3 style={{ marginTop:0 }}>Lista</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Valor</th>
                <th>Descrição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r:any) => (
                <tr key={r.id}>
                  <td>{r.date}</td>
                  <td>{r.type === 'INCOME' ? 'Receita' : 'Despesa'}</td>
                  <td>
                    {r.status === 'PAID' ? <span className="pill ok">Pago</span> : <span className="pill warn">Em aberto</span>}
                  </td>
                  <td style={{ color: r.type === 'INCOME' ? 'var(--ok)' : 'var(--bad)', fontWeight: 800 }}>
                    R$ {Number(r.amount).toFixed(2)}
                  </td>
                  <td style={{ color:'var(--muted)' }}>{r.description}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      {r.status !== 'PAID' && <button className="btn secondary" onClick={() => markPaid(r.id)}>Marcar pago</button>}
                      <button className="btn danger" onClick={() => del(r.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ color:'var(--muted)' }}>Sem transações ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
