import { formatCurrency, type BudgetProgress } from '../../../types/planning'

interface Props {
  budget: BudgetProgress
  onEdit: (b: BudgetProgress) => void
  onDelete: (id: string) => void
  deleting: boolean
}

function progressColor(pct: number): string {
  if (pct >= 100) return '#ef4444'
  if (pct >= 80) return '#f59e0b'
  return '#10b981'
}

export function BudgetCard({ budget, onEdit, onDelete, deleting }: Props) {
  const color = progressColor(budget.pct)
  const overBudget = budget.spent > budget.amount_limit

  return (
    <div
      className='card'
      style={{
        borderLeft: `4px solid ${color}`,
        padding: '14px 16px',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
            {budget.category}
          </div>
          <div className='muted' style={{ fontSize: '0.82rem', marginTop: 2 }}>
            Limite: {formatCurrency(budget.amount_limit)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            type='button'
            className='btn'
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            onClick={() => onEdit(budget)}
          >
            ✏️ Editar
          </button>
          <button
            type='button'
            className='btn danger'
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            onClick={() => onDelete(budget.id)}
            disabled={deleting}
          >
            🗑
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: '#e2e8f0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(budget.pct, 100)}%`,
            background: color,
            borderRadius: 4,
            transition: 'width 300ms ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
        <span style={{ color }}>
          {formatCurrency(budget.spent)} gastos ({budget.pct.toFixed(0)}%)
        </span>
        <span className={overBudget ? '' : 'muted'} style={overBudget ? { color: '#ef4444', fontWeight: 600 } : {}}>
          {overBudget
            ? `${formatCurrency(Math.abs(budget.remaining))} acima do limite`
            : `${formatCurrency(budget.remaining)} restantes`}
        </span>
      </div>
    </div>
  )
}
