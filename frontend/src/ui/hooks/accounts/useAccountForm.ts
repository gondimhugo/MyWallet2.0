import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { api } from '../../../lib/api'
import { type AccountForm, BANK_OPTIONS, initialAccountForm } from '../../types/accounts'

export function useAccountForm() {
  const [form, setForm] = useState<AccountForm>(initialAccountForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const formRef = useRef<HTMLDivElement | null>(null)
  const qc = useQueryClient()

  const selectedBank = useMemo(() => BANK_OPTIONS.find((b) => b.code === form.bank) || BANK_OPTIONS[0], [form.bank])
  const bankName = form.bank === 'otro' ? form.customName.trim() : selectedBank.name
  const hasCredit = form.cardTypes.includes('Crédito')
  const isValid = !!bankName && (!hasCredit || (form.creditLimit > 0 && form.closeDay >= 1 && form.closeDay <= 31 && form.dueDay >= 1 && form.dueDay <= 31))
  const isEditing = editingId !== null

  const buildPayload = () => ({
    name: bankName,
    bank: form.bank,
    account_type: form.accountType,
    card_types: form.cardTypes,
    notes: form.notes,
    credit_limit: form.creditLimit,
    close_day: hasCredit ? form.closeDay : null,
    due_day: hasCredit ? form.dueDay : null,
    balance: 0,
  })

  const resetForm = () => {
    setForm(initialAccountForm)
    setEditingId(null)
  }

  const create = useMutation({
    mutationFn: () => api.request('/accounts', { method: 'POST', body: JSON.stringify(buildPayload()) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      resetForm()
    },
  })

  const update = useMutation({
    mutationFn: (id: string) => api.request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(buildPayload()) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      resetForm()
    },
  })

  const startEdit = (acc: {
    id?: string
    name: string
    bank?: string
    account_type?: string
    card_types?: string[]
    notes?: string
    credit_limit?: number
    close_day?: number | null
    due_day?: number | null
  }) => {
    if (!acc.id) return
    const knownBank = BANK_OPTIONS.find(
      (b) => b.code === acc.bank || b.name.toLowerCase() === (acc.bank || '').toLowerCase(),
    )
    const bankCode = knownBank && knownBank.code !== 'otro' ? knownBank.code : 'otro'
    const customName = bankCode === 'otro' ? acc.name : ''
    const allowedAccountTypes: AccountForm['accountType'][] = ['Corrente', 'Poupança', 'Investimento', 'Outra']
    const accountType = allowedAccountTypes.includes(acc.account_type as AccountForm['accountType'])
      ? (acc.account_type as AccountForm['accountType'])
      : 'Corrente'
    setForm({
      customName,
      bank: bankCode,
      accountType,
      cardTypes: acc.card_types ? [...acc.card_types] : [],
      notes: acc.notes || '',
      creditLimit: acc.credit_limit || 0,
      closeDay: acc.close_day ?? 8,
      dueDay: acc.due_day ?? 15,
    })
    setEditingId(acc.id)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const toggleCardType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      cardTypes: prev.cardTypes.includes(type) ? prev.cardTypes.filter((t) => t !== type) : [...prev.cardTypes, type],
    }))
  }

  return {
    form,
    setForm,
    editingId,
    formRef,
    selectedBank,
    bankName,
    hasCredit,
    isValid,
    isEditing,
    create,
    update,
    startEdit,
    resetForm,
    toggleCardType,
  }
}
