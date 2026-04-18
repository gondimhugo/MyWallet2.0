import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '../../../lib/api'
import type { Account } from '../../types'

export function useAccountList() {
  const qc = useQueryClient()
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.request('/accounts') })

  const accountList = (accounts.data || []) as Account[]

  const totals = useMemo(() => {
    let cash = 0
    let limit = 0
    let used = 0
    let available = 0
    for (const acc of accountList) {
      const cardTypes = acc.card_types || []
      const isOnlyCredit = cardTypes.length > 0 && cardTypes.every((t) => t === 'Crédito')
      if (!isOnlyCredit) cash += acc.balance || 0
      const lim = acc.credit_limit || 0
      if (lim > 0) {
        limit += lim
        used += acc.credit_used || 0
        available += acc.credit_available ?? (lim - (acc.credit_used || 0))
      }
    }
    return { cash, limit, used, available }
  }, [accountList])

  const remove = useMutation({
    mutationFn: (id: string) => api.request(`/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  return {
    accountList,
    totals,
    remove,
  }
}
