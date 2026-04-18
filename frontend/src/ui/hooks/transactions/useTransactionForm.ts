import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import type { Account } from '../../types'
import {
  type CreationMode,
  type TransactionForm,
  CASH_METHODS,
  initialTransactionForm,
  MODE_META,
} from '../../types/transactions'

export function useTransactionForm() {
  const [mode, setMode] = useState<CreationMode>('compra-avista')
  const [form, setForm] = useState<TransactionForm>(initialTransactionForm)
  const [installmentEnabled, setInstallmentEnabled] = useState(false)
  const [installmentCount, setInstallmentCount] = useState(2)
  const qc = useQueryClient()

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.request('/accounts') })

  const accountList = (accounts.data || []) as Account[]
  const creditAccountList = accountList.filter(
    (a) => (a.credit_limit || 0) > 0 || (a.card_types || []).includes('Crédito') || (!!a.close_day && !!a.due_day),
  )

  useEffect(() => {
    setForm((prev) => {
      const next = { ...prev }
      switch (mode) {
        case 'compra-avista':
          next.direction = 'Saída'
          next.kind = 'Normal'
          if (next.method === 'Crédito' || !Object.keys(CASH_METHODS).includes(next.method)) {
            next.method = 'Pix'
          }
          break
        case 'compra-credito':
          next.direction = 'Saída'
          next.kind = 'Normal'
          next.method = 'Crédito'
          break
        case 'entrada':
          next.direction = 'Entrada'
          next.kind = 'Normal'
          if (next.method === 'Crédito') next.method = 'Pix'
          break
        case 'salario':
          next.direction = 'Entrada'
          next.kind = 'Salario'
          if (next.method === 'Crédito') next.method = 'Pix'
          break
      }
      return next
    })
    if (mode !== 'compra-credito') {
      setInstallmentEnabled(false)
      setInstallmentCount(2)
    }
  }, [mode])

  useEffect(() => {
    const usingCredit = mode === 'compra-credito'
    const sourceList = usingCredit ? creditAccountList : accountList
    if (sourceList.length === 0) return
    const exists = sourceList.some((a) => a.name === form.account)
    if (!exists) {
      setForm((prev) => ({ ...prev, account: sourceList[0].name }))
    }
  }, [mode, form.account, accountList, creditAccountList])

  const create = useMutation({
    mutationFn: () => {
      const selectedAccount = accountList.find((a) => a.name === form.account)
      if (!selectedAccount) {
        throw new Error('Selecione uma conta bancária válida antes de salvar o lançamento.')
      }
      const isCreditOut = mode === 'compra-credito'
      const isInstallment = isCreditOut && installmentEnabled && installmentCount >= 2
      const payload = {
        ...form,
        account_id: selectedAccount.id,
        card: isCreditOut ? selectedAccount.name : '',
        card_account_id: isCreditOut ? selectedAccount.id : null,
      }
      if (isInstallment) {
        return api.request('/transactions/installments', {
          method: 'POST',
          body: JSON.stringify({ ...payload, installment_count: installmentCount }),
        })
      }
      return api.request('/transactions', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tx'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setForm((prev) => ({
        ...initialTransactionForm,
        date: new Date().toISOString().slice(0, 10),
        direction: prev.direction,
        method: prev.method,
        kind: prev.kind,
        account: prev.account,
      }))
      setInstallmentEnabled(false)
      setInstallmentCount(2)
    },
  })

  const sourceAccounts = mode === 'compra-credito' ? creditAccountList : accountList
  const currentMeta = MODE_META[mode]

  const canSubmit =
    !!form.description &&
    form.amount > 0 &&
    !!sourceAccounts.find((a) => a.name === form.account) &&
    !(mode === 'compra-credito' && creditAccountList.length === 0)

  return {
    mode,
    setMode,
    form,
    setForm,
    installmentEnabled,
    setInstallmentEnabled,
    installmentCount,
    setInstallmentCount,
    create,
    sourceAccounts,
    currentMeta,
    canSubmit,
  }
}
