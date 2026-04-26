import { useMemo, useState } from 'react'
import {
  LOAN_DIRECTION_LABELS,
  LOAN_STATUS_COLORS,
  LOAN_STATUS_LABELS,
  type Loan,
  formatCurrency,
  formatDateBR,
} from '../../../types/planning'

interface Props {
  loans: Loan[]
  onEdit: (loan: Loan) => void
  onDelete: (loan: Loan) => void
  onRepay: (loan: Loan, amount: number) => void
  onShowSchedule: (loan: Loan) => void
  isMutating: boolean
}

type FilterDirection = 'all' | 'taken' | 'granted'

const FILTER_LABELS: Record<FilterDirection, string> = {
  all: 'Todos',
  taken: 'Tomados',
  granted: 'Concedidos',
}

function StatusPill({ status }: { status: Loan['status'] }) {
  return (
    <span
      style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 999,
        color: '#fff',
        background: LOAN_STATUS_COLORS[status],
      }}
    >
      {LOAN_STATUS_LABELS[status]}
    </span>
  )
}

interface RepayBoxProps {
  loan: Loan
  onSubmit: (amount: number) => void
  isMutating: boolean
}

function RepayBox({ loan, onSubmit, isMutating }: RepayBoxProps) {
  const [amount, setAmount] = useState<number>(0)
  const remaining = Math.max(0, loan.outstanding)
  const canPay = amount > 0 && amount <= remaining + 0.005 && !isMutating
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        type='number'
        step='0.01'
        min={0}
        max={remaining}
        value={amount || ''}
        placeholder='Valor pago'
        onChange={(e) => setAmount(Number(e.target.value))}
        style={{ width: 120, padding: '6px 8px', fontSize: '0.85rem' }}
      />
      <button
        type='button'
        onClick={() => {
          if (canPay) {
            onSubmit(amount)
            setAmount(0)
          }
        }}
        disabled={!canPay}
        style={{
          padding: '6px 10px',
          background: '#10b981',
          color: '#fff',
          fontSize: '0.8rem',
          fontWeight: 600,
          opacity: canPay ? 1 : 0.5,
        }}
      >
        Registrar pagamento
      </button>
    </div>
  )
}

export function LoanList({ loans, onEdit, onDelete, onRepay, onShowSchedule, isMutating }: Props) {
  const [filter, setFilter] = useState<FilterDirection>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return loans
    return loans.filter((l) => l.direction === filter)
  }, [loans, filter])

  const totals = useMemo(() => {
    let taken = 0
    let granted = 0
    let interest = 0
    for (const l of loans) {
      if (l.status === 'paid') continue
      if (l.direction === 'taken') taken += l.outstanding
      else granted += l.outstanding
      interest += l.interest_amount
    }
    return { taken, granted, interest }
  }, [loans])

  return (
    <>
      <div className='grid' style={{ marginTop: 4 }}>
        <div
          className='card kpi'
          style={{ borderLeft: '4px solid #ef4444' }}
        >
          <div className='muted' style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            A pagar (tomados)
          </div>
          <div className='value' style={{ color: '#ef4444' }}>
            {formatCurrency(totals.taken)}
          </div>
        </div>
        <div
          className='card kpi'
          style={{ borderLeft: '4px solid #10b981' }}
        >
          <div className='muted' style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            A receber (concedidos)
          </div>
          <div className='value' style={{ color: '#10b981' }}>
            {formatCurrency(totals.granted)}
          </div>
        </div>
        <div
          className='card kpi'
          style={{ borderLeft: '4px solid #f59e0b' }}
        >
          <div className='muted' style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Juros acumulados
          </div>
          <div className='value' style={{ color: '#f59e0b' }}>
            {formatCurrency(totals.interest)}
          </div>
        </div>
      </div>

      <div className='card'>
        <div className='card-title'>
          <strong>🤝 Empréstimos cadastrados</strong>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(Object.keys(FILTER_LABELS) as FilterDirection[]).map((key) => (
              <button
                key={key}
                type='button'
                onClick={() => setFilter(key)}
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
          <div className='muted centered' style={{ padding: 32 }}>
            Nenhum empréstimo neste filtro.
          </div>
        ) : (
          <div className='table-wrap'>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Tipo</th>
                  <th style={{ textAlign: 'left' }}>Contraparte</th>
                  <th style={{ textAlign: 'right' }}>Principal</th>
                  <th style={{ textAlign: 'right' }}>Total devido</th>
                  <th style={{ textAlign: 'right' }}>Pago</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                  <th style={{ textAlign: 'left' }}>Retorno</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((loan) => (
                  <tr key={loan.id}>
                    <td>{LOAN_DIRECTION_LABELS[loan.direction]}</td>
                    <td>{loan.counterparty || <span className='muted'>—</span>}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(loan.principal)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(loan.expected_return)}
                    </td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>
                      {formatCurrency(loan.repaid_amount)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: loan.outstanding > 0 ? '#ef4444' : '#10b981',
                        fontWeight: 600,
                      }}
                    >
                      {formatCurrency(loan.outstanding)}
                    </td>
                    <td>{formatDateBR(loan.due_date)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusPill status={loan.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        {loan.status !== 'paid' && (
                          <RepayBox
                            loan={loan}
                            onSubmit={(amount) => onRepay(loan, amount)}
                            isMutating={isMutating}
                          />
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type='button'
                            onClick={() => onShowSchedule(loan)}
                            disabled={isMutating}
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: 'rgba(79,70,229,0.1)',
                              color: '#4338ca',
                            }}
                          >
                            Cronograma
                          </button>
                          <button
                            type='button'
                            onClick={() => onEdit(loan)}
                            disabled={isMutating}
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: 'rgba(15,23,42,0.06)',
                              color: '#334155',
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type='button'
                            onClick={() => onDelete(loan)}
                            disabled={isMutating}
                            style={{
                              padding: '6px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: 'rgba(239,68,68,0.1)',
                              color: '#b91c1c',
                            }}
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
