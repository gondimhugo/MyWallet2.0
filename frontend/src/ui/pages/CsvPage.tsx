import React, { useState } from 'react'
import { api } from '../../lib/api'

export function CsvPage() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const importFile = async () => {
    if (!file) return
    setErr(null); setLoading(true); setResult(null)
    try {
      const r = await api.importCsv(file)
      setResult(r)
    } catch(e:any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  const exportFile = async () => {
    setErr(null); setLoading(true)
    try {
      const blob = await api.exportCsv()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'transactions_export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch(e:any) {
      setErr(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns:'1fr', gap: 12 }}>
      <div className="panel">
        <h2 style={{ marginTop:0 }}>CSV</h2>
        <div style={{ color:'var(--muted)', fontSize: 13 }}>
          Importa/exporta com validação no backend e relatório de erros por linha.
        </div>
        {err && <div style={{ marginTop: 12, color:'var(--bad)' }}>{err}</div>}
      </div>

      <div className="panel">
        <h3 style={{ marginTop:0 }}>Importar</h3>
        <div className="row">
          <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="btn" onClick={importFile} disabled={!file || loading}>{loading?'Importando...':'Importar'}</button>
        </div>
        {result && (
          <div style={{ marginTop: 12 }}>
            <div className="row">
              <div className="kpi" style={{ minWidth: 220 }}>
                <div className="label">Inseridos</div>
                <div className="value">{result.inserted || 0}</div>
              </div>
              <div className="kpi" style={{ minWidth: 220 }}>
                <div className="label">Erros</div>
                <div className="value" style={{ color:'var(--bad)' }}>{(result.errors || []).length}</div>
              </div>
            </div>
            {(result.errors || []).length > 0 && (
              <div className="panel" style={{ marginTop: 12 }}>
                <h4 style={{ marginTop:0 }}>Erros</h4>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Linha</th><th>Erro</th></tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e:any, i:number) => (
                        <tr key={i}>
                          <td>{e.line}</td>
                          <td style={{ color:'var(--bad)' }}>{e.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <h3 style={{ marginTop:0 }}>Exportar</h3>
        <button className="btn secondary" onClick={exportFile} disabled={loading}>{loading?'Gerando...':'Baixar CSV'}</button>
      </div>
    </div>
  )
}
