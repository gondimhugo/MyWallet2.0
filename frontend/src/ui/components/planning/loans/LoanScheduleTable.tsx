import {
  LOAN_DIRECTION_LABELS,
  LOAN_INTEREST_MODE_LABELS,
  type LoanScheduleResponse,
  formatCurrency,
  formatDateBR,
} from '../../../types/planning'

interface Props {
  data: LoanScheduleResponse | undefined
  isLoading: boolean
  errorMessage?: string
  onClose: () => void
}

export function LoanScheduleTable({ data, isLoading, errorMessage, onClose }: Props) {
  return (
    <div className='card'>
      <div className='card-title'>
        <div>
          <strong>📅 Cronograma de juros</strong>
          {data && (
            <div className='muted' style={{ fontSize: '0.85rem', marginTop: 4 }}>
              {LOAN_DIRECTION_LABELS[data.loan.direction]} ·{' '}
              {LOAN_INTEREST_MODE_LABELS[data.loan.interest_mode]} ·{' '}
              {data.loan.counterparty || 'sem contraparte'}
            </div>
          )}
        </div>
        <button
          type='button'
          onClick={onClose}
          style={{
            padding: '6px 12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: 'rgba(15,23,42,0.06)',
            color: '#334155',
          }}
        >
          Fechar
        </button>
      </div>

      {isLoading && (
        <div className='muted centered' style={{ padding: 24 }}>
          Calculando cronograma…
        </div>
      )}

      {errorMessage && (
        <div className='auth-alert error' role='alert'>
          {errorMessage}
        </div>
      )}

      {data && !isLoading && (
        <>
          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              padding: 12,
              background: 'rgba(79,70,229,0.04)',
              borderRadius: 10,
              marginBottom: 12,
            }}
          >
            <span>
              <span className='muted' style={{ marginRight: 4 }}>Principal:</span>
              <strong>{formatCurrency(data.loan.principal)}</strong>
            </span>
            <span>
              <span className='muted' style={{ marginRight: 4 }}>Juros totais:</span>
              <strong style={{ color: '#f59e0b' }}>{formatCurrency(data.loan.interest_amount)}</strong>
            </span>
            <span>
              <span className='muted' style={{ marginRight: 4 }}>Total devido:</span>
              <strong style={{ color: '#4f46e5' }}>{formatCurrency(data.loan.expected_return)}</strong>
            </span>
            <span>
              <span className='muted' style={{ marginRight: 4 }}>Período:</span>
              <strong>{data.loan.months} {data.loan.months === 1 ? 'mês' : 'meses'}</strong>
            </span>
          </div>

          <div className='table-wrap'>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Mês</th>
                  <th style={{ textAlign: 'left' }}>Data</th>
                  <th style={{ textAlign: 'right' }}>Juros do período</th>
                  <th style={{ textAlign: 'right' }}>Juros acumulados</th>
                  <th style={{ textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td>{formatDateBR(row.date)}</td>
                    <td style={{ textAlign: 'right', color: row.interest_period ? '#f59e0b' : '#94a3b8' }}>
                      {row.interest_period ? formatCurrency(row.interest_period) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(row.interest_accrued)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
