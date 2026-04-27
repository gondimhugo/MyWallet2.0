import { useEffect, useRef, useState } from 'react'
import { parseApiError } from '../../../../lib/validation'
import type { BudgetFormData, BudgetProgress } from '../../../types/planning'
import { formatCurrency } from '../../../types/planning'

interface Props {
  month: string
  categories: string[]
  editing: BudgetProgress | null
  onSave: (data: BudgetFormData) => Promise<void>
  onCancel: () => void
}

const CURRENT_MONTH = new Date().toISOString().slice(0, 7)

export function BudgetForm({ month, categories, editing, onSave, onCancel }: Props) {
  const [category, setCategory] = useState(editing?.category ?? '')
  const [amountLimit, setAmountLimit] = useState<string>(
    editing ? String(editing.amount_limit) : '',
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCategory(editing?.category ?? '')
    setAmountLimit(editing ? String(editing.amount_limit) : '')
    setError('')
    inputRef.current?.focus()
  }, [editing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const cat = category.trim()
    const limit = parseFloat(amountLimit)

    if (!cat) return setError('Informe a categoria')
    if (!amountLimit || isNaN(limit) || limit <= 0) return setError('Limite deve ser maior que zero')

    setSaving(true)
    try {
      await onSave({ category: cat, month, amount_limit: limit })
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className='card' onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
      <div className='card-title'>
        <strong>{editing ? '✏️ Editar orçamento' : '➕ Novo orçamento'}</strong>
        <span className='muted' style={{ fontSize: '0.85rem' }}>
          Mês: <strong>{month}</strong>
        </span>
      </div>

      <div className='form'>
        <label className='field'>
          <span>Categoria</span>
          <input
            ref={inputRef}
            list='budget-categories'
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder='Ex: Alimentação'
            disabled={saving}
            autoComplete='off'
          />
          {categories.length > 0 && (
            <datalist id='budget-categories'>
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          )}
        </label>

        <label className='field'>
          <span>Limite (R$)</span>
          <input
            type='number'
            min='0.01'
            step='0.01'
            value={amountLimit}
            onChange={(e) => setAmountLimit(e.target.value)}
            placeholder='0,00'
            disabled={saving}
          />
          {amountLimit && !isNaN(parseFloat(amountLimit)) && parseFloat(amountLimit) > 0 && (
            <span className='muted' style={{ fontSize: '0.8rem' }}>
              {formatCurrency(parseFloat(amountLimit))}
            </span>
          )}
        </label>
      </div>

      {error && (
        <div className='card auth-alert error' role='alert' style={{ marginTop: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type='submit' className='btn primary' disabled={saving} style={{ flex: 1 }}>
          {saving ? 'Salvando…' : editing ? '💾 Salvar alterações' : '➕ Adicionar'}
        </button>
        <button type='button' className='btn' onClick={onCancel} disabled={saving}>
          ✖ Cancelar
        </button>
      </div>
    </form>
  )
}
