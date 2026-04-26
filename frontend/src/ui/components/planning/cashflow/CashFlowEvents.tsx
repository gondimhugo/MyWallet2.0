import { useMemo, useState } from 'react'
import {
  formatCurrency,
  formatDateBR,
  type PlanningEvent,
} from '../../../types/planning'

type EventFilter = 'all' | 'in' | 'out' | 'forecast'

interface Props {
  events: PlanningEvent[]
}

const FILTER_LABELS: Record<EventFilter, string> = {
  all: 'Todos',
  in: 'Entradas',
  out: 'Saídas',
  forecast: 'Previstos',
}

const PAGE_SIZE = 25

export function CashFlowEvents({ events }: Props) {
  const [filter, setFilter] = useState<EventFilter>('all')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filter === 'in') return e.in > 0
      if (filter === 'out') return e.out > 0
      if (filter === 'forecast') return e.forecast
      return true
    })
  }, [events, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const slice = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const handleFilter = (next: EventFilter) => {
    setFilter(next)
    setPage(0)
  }

  return (
    <div className='card'>
      <div className='card-title'>
        <strong>📋 Eventos da simulação</strong>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(FILTER_LABELS) as EventFilter[]).map((key) => (
            <button
              key={key}
              type='button'
              onClick={() => handleFilter(key)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                fontSize: '0.8rem',
                fontWeight: 600,
                background: filter === key ? 'var(--primary)' : 'rgba(15,23,42,0.05)',
                color: filter === key ? '#fff' : '#334155',
                border: 0,
                cursor: 'pointer',
              }}
            >
              {FILTER_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className='muted centered' style={{ padding: 24 }}>
          Nenhum evento neste filtro.
        </div>
      ) : (
        <>
          <div className='table-wrap'>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Data</th>
                  <th style={{ textAlign: 'left' }}>Descrição</th>
                  <th style={{ textAlign: 'right' }}>Entrada</th>
                  <th style={{ textAlign: 'right' }}>Saída</th>
                  <th style={{ textAlign: 'center' }}>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((ev, idx) => (
                  <tr key={`${ev.date}-${idx}`}>
                    <td>{formatDateBR(ev.date)}</td>
                    <td>{ev.label}</td>
                    <td style={{ textAlign: 'right', color: ev.in ? '#10b981' : '#94a3b8' }}>
                      {ev.in ? formatCurrency(ev.in) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', color: ev.out ? '#ef4444' : '#94a3b8' }}>
                      {ev.out ? formatCurrency(ev.out) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: ev.forecast ? 'rgba(79,70,229,0.1)' : 'rgba(15,118,110,0.1)',
                          color: ev.forecast ? '#4338ca' : '#0f766e',
                        }}
                      >
                        {ev.forecast ? 'Previsto' : 'Realizado'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 12,
              }}
            >
              <span className='muted' style={{ fontSize: '0.85rem' }}>
                {filtered.length} {filtered.length === 1 ? 'evento' : 'eventos'} · Página{' '}
                {safePage + 1} de {totalPages}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type='button'
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(15,23,42,0.06)',
                    color: '#334155',
                    fontWeight: 600,
                  }}
                >
                  Anterior
                </button>
                <button
                  type='button'
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(15,23,42,0.06)',
                    color: '#334155',
                    fontWeight: 600,
                  }}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
