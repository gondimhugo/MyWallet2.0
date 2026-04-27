import { useEffect, useMemo, useState } from 'react'
import type { Account } from '../../../types'
import {
  LOAN_DIRECTION_LABELS,
  LOAN_INTEREST_MODE_LABELS,
  type Loan,
  type LoanDirection,
  type LoanFormData,
  type LoanInterestMode,
  formatCurrency,
  initialLoanForm,
} from '../../../types/planning'

interface Props {
  editing: Loan | null
  accounts: Account[]
  isPending: boolean
  errorMessage?: string
  onSubmit: (form: LoanFormData) => void
  onCancel: () => void
}

function loanToForm(loan: Loan): LoanFormData {
  return {
    direction: loan.direction,
    counterparty: loan.counterparty,
    principal: loan.principal,
    interest_rate: loan.interest_rate,
    interest_mode: loan.interest_mode,
    start_date: loan.start_date,
    due_date: loan.due_date,
    linked_account_id: loan.linked_account_id,
    notes: loan.notes,
  }
}

function monthsBetween(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0
  const start = new Date(`${startISO}T00:00:00`)
  const end = new Date(`${endISO}T00:00:00`)
  if (end <= start) return 0
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) months -= 1
  return Math.max(0, months)
}

function previewExpectedReturn(form: LoanFormData): { total: number; interest: number; months: number } {
  const months = monthsBetween(form.start_date, form.due_date)
  const principal = form.principal || 0
  const rate = form.interest_rate || 0
  if (months <= 0 || rate <= 0) {
    return { total: principal, interest: 0, months }
  }
  const total =
    form.interest_mode === 'compound'
      ? principal * Math.pow(1 + rate, months)
      : principal * (1 + rate * months)
  return { total, interest: total - principal, months }
}

export function LoanForm({ editing, accounts, isPending, errorMessage, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<LoanFormData>(initialLoanForm)

  useEffect(() => {
    setForm(editing ? loanToForm(editing) : initialLoanForm())
  }, [editing])

  const update = <K extends keyof LoanFormData>(key: K, value: LoanFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const preview = useMemo(() => previewExpectedReturn(form), [form])

  const canSubmit =
    form.principal > 0 &&
    form.interest_rate >= 0 &&
    !!form.start_date &&
    !!form.due_date &&
    form.due_date >= form.start_date

  return (
    <div className='card'>
      <div className='card-title'>
        <strong>{editing ? '✏️ Editar empréstimo' : '➕ Novo empréstimo'}</strong>
        <span className='muted' style={{ fontSize: '0.85rem' }}>
          Taxa em decimal por mês (ex: 0,02 = 2% a.m.)
        </span>
      </div>

      <div className='form'>
        <label className='field'>
          <span>Tipo</span>
          <select
            value={form.direction}
            onChange={(e) => update('direction', e.target.value as LoanDirection)}
          >
            {(Object.keys(LOAN_DIRECTION_LABELS) as LoanDirection[]).map((d) => (
              <option key={d} value={d}>
                {LOAN_DIRECTION_LABELS[d]}
              </option>
            ))}
          </select>
        </label>

        <label className='field'>
          <span>Contraparte</span>
          <input
            type='text'
            value={form.counterparty}
            placeholder='Nome de quem emprestou/recebeu'
            onChange={(e) => update('counterparty', e.target.value)}
          />
        </label>

        <label className='field'>
          <span>Principal (R$)</span>
          <input
            type='number'
            step='0.01'
            min={0}
            value={form.principal}
            onChange={(e) => update('principal', Number(e.target.value))}
          />
        </label>

        <label className='field'>
          <span>Taxa por mês</span>
          <input
            type='number'
            step='0.0001'
            min={0}
            value={form.interest_rate}
            onChange={(e) => update('interest_rate', Number(e.target.value))}
          />
        </label>

        <label className='field'>
          <span>Modo de juros</span>
          <select
            value={form.interest_mode}
            onChange={(e) => update('interest_mode', e.target.value as LoanInterestMode)}
          >
            {(Object.keys(LOAN_INTEREST_MODE_LABELS) as LoanInterestMode[]).map((m) => (
              <option key={m} value={m}>
                {LOAN_INTEREST_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>

        <label className='field'>
          <span>Data inicial</span>
          <input
            type='date'
            value={form.start_date}
            onChange={(e) => update('start_date', e.target.value)}
          />
        </label>

        <label className='field'>
          <span>Data de retorno</span>
          <input
            type='date'
            value={form.due_date}
            onChange={(e) => update('due_date', e.target.value)}
            aria-invalid={!!form.start_date && !!form.due_date && form.due_date < form.start_date}
          />
        </label>

        <label className='field'>
          <span>Conta vinculada (opcional)</span>
          <select
            value={form.linked_account_id ?? ''}
            onChange={(e) => update('linked_account_id', e.target.value || null)}
          >
            <option value=''>Nenhuma</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </label>

        <label className='field' style={{ gridColumn: '1 / -1' }}>
          <span>Observações</span>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder='Detalhes do acordo, parcelamento, contato…'
          />
        </label>
      </div>

      <div
        className='card'
        style={{
          background: 'rgba(79,70,229,0.04)',
          border: '1px solid rgba(79,70,229,0.15)',
          marginTop: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span className='muted' style={{ fontWeight: 600 }}>
            Prévia ({preview.months} {preview.months === 1 ? 'mês' : 'meses'})
          </span>
          <span>
            <span className='muted' style={{ marginRight: 6 }}>Juros:</span>
            <strong style={{ color: '#f59e0b' }}>{formatCurrency(preview.interest)}</strong>
          </span>
          <span>
            <span className='muted' style={{ marginRight: 6 }}>Total devido:</span>
            <strong style={{ color: '#4f46e5' }}>{formatCurrency(preview.total)}</strong>
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className='auth-alert error' role='alert' style={{ marginTop: 12 }}>
          {errorMessage}
        </div>
      )}

      <div className='form-actions'>
        <button
          type='button'
          onClick={() => onSubmit(form)}
          disabled={!canSubmit || isPending}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            opacity: !canSubmit || isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Salvando…' : editing ? 'Atualizar empréstimo' : 'Criar empréstimo'}
        </button>
        {editing && (
          <button
            type='button'
            onClick={onCancel}
            disabled={isPending}
            style={{ background: 'rgba(15,23,42,0.06)', color: '#334155' }}
          >
            Cancelar edição
          </button>
        )}
      </div>
    </div>
  )
}
