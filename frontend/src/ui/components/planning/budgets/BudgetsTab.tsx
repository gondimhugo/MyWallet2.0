import { useState } from 'react'
import { parseApiError } from '../../../../lib/validation'
import { useBudgets } from '../../../hooks/planning/useBudgets'
import { formatCurrency, initialBudgetForm, type BudgetFormData, type BudgetProgress } from '../../../types/planning'
import { BudgetCard } from './BudgetCard'
import { BudgetForm } from './BudgetForm'

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (m === 1) return `${y - 1}-12`
  return `${y}-${String(m - 1).padStart(2, '0')}`
}

function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (m === 12) return `${y + 1}-01`
  return `${y}-${String(m + 1).padStart(2, '0')}`
}

function formatMonthBR(month: string): string {
  const [y, m] = month.split('-')
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${names[parseInt(m, 10) - 1]} ${y}`
}

export function BudgetsTab() {
  const [month, setMonth] = useState(currentMonth)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BudgetProgress | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')

  const { list, categories, create, update, remove } = useBudgets(month)

  const budgets = list.data ?? []
  const cats = categories.data ?? []
  const totalLimit = budgets.reduce((s, b) => s + b.amount_limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const overCount = budgets.filter((b) => b.spent > b.amount_limit).length

  const handleSave = async (data: BudgetFormData) => {
    if (editing) {
      await update.mutateAsync({ id: editing.id, data })
    } else {
      await create.mutateAsync(data)
    }
    setShowForm(false)
    setEditing(null)
  }

  const handleEdit = (b: BudgetProgress) => {
    setEditing(b)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    setDeleteError('')
    setDeletingId(id)
    try {
      await remove.mutateAsync(id)
    } catch (err) {
      setDeleteError(parseApiError(err))
    } finally {
      setDeletingId(null)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div>
      {/* Header row */}
      <div
        className='card'
        style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px' }}
      >
        {/* Month navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type='button'
            className='btn'
            style={{ padding: '4px 10px' }}
            onClick={() => setMonth(prevMonth(month))}
          >
            ‹
          </button>
          <strong style={{ minWidth: 80, textAlign: 'center' }}>{formatMonthBR(month)}</strong>
          <button
            type='button'
            className='btn'
            style={{ padding: '4px 10px' }}
            onClick={() => setMonth(nextMonth(month))}
          >
            ›
          </button>
          {month !== currentMonth() && (
            <button
              type='button'
              className='btn'
              style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              onClick={() => setMonth(currentMonth())}
            >
              Hoje
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <button
          type='button'
          className='btn primary'
          style={{ padding: '6px 14px' }}
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          disabled={showForm && !editing}
        >
          ➕ Novo orçamento
        </button>
      </div>

      {/* KPI summary */}
      {budgets.length > 0 && (
        <div className='grid' style={{ marginBottom: 0 }}>
          <div className='card kpi' style={{ borderLeft: '4px solid #4f46e5' }}>
            <div className='muted' style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total orçado</div>
            <div className='value' style={{ color: '#4f46e5' }}>{formatCurrency(totalLimit)}</div>
          </div>
          <div
            className='card kpi'
            style={{ borderLeft: `4px solid ${totalSpent > totalLimit ? '#ef4444' : '#10b981'}` }}
          >
            <div className='muted' style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total gasto</div>
            <div className='value' style={{ color: totalSpent > totalLimit ? '#ef4444' : '#10b981' }}>
              {formatCurrency(totalSpent)}
            </div>
            <div className='muted' style={{ fontSize: '0.78rem' }}>
              {((totalSpent / totalLimit) * 100).toFixed(0)}% do total
            </div>
          </div>
          <div
            className='card kpi'
            style={{ borderLeft: `4px solid ${totalLimit - totalSpent >= 0 ? '#0f766e' : '#ef4444'}` }}
          >
            <div className='muted' style={{ fontSize: '0.85rem', fontWeight: 600 }}>Saldo disponível</div>
            <div
              className='value'
              style={{ color: totalLimit - totalSpent >= 0 ? '#0f766e' : '#ef4444' }}
            >
              {formatCurrency(totalLimit - totalSpent)}
            </div>
          </div>
          {overCount > 0 && (
            <div className='card kpi' style={{ borderLeft: '4px solid #ef4444' }}>
              <div className='muted' style={{ fontSize: '0.85rem', fontWeight: 600 }}>Acima do limite</div>
              <div className='value' style={{ color: '#ef4444' }}>
                {overCount} {overCount === 1 ? 'categoria' : 'categorias'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <BudgetForm
          month={month}
          categories={cats}
          editing={editing}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {/* Error */}
      {deleteError && (
        <div className='card auth-alert error' role='alert'>
          {deleteError}
        </div>
      )}

      {/* Loading / empty */}
      {list.isLoading && (
        <div className='card centered muted' style={{ padding: 32 }}>
          Carregando orçamentos…
        </div>
      )}

      {list.isError && (
        <div className='card auth-alert error' role='alert'>
          {parseApiError(list.error)}
        </div>
      )}

      {!list.isLoading && !list.isError && budgets.length === 0 && !showForm && (
        <div
          className='card centered muted'
          style={{ padding: 40, flexDirection: 'column', gap: 8 }}
        >
          <strong style={{ color: '#334155' }}>Nenhum orçamento para {formatMonthBR(month)}</strong>
          <span>Clique em <em>Novo orçamento</em> para definir limites por categoria.</span>
        </div>
      )}

      {/* Budget cards */}
      {budgets.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          {budgets.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deleting={deletingId === b.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
