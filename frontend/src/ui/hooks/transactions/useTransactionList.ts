import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '../../../lib/api'
import { type EntryMode, categorizeTransaction } from '../../types/transactions'

export function useTransactionList() {
  const [filterMode, setFilterMode] = useState<'all' | EntryMode>('all')
  const qc = useQueryClient()

  const tx = useQuery({ queryKey: ['tx'], queryFn: () => api.request('/transactions') })
  const allTransactions = (tx.data || []) as any[]

  const counts = useMemo(() => {
    const c = { 'compra-avista': 0, 'compra-credito': 0, entrada: 0, 'pagamento-fatura': 0, salario: 0 } as Record<EntryMode, number>
    for (const t of allTransactions) c[categorizeTransaction(t)]++
    return c
  }, [allTransactions])

  const filteredTransactions = useMemo(() => {
    if (filterMode === 'all') return allTransactions
    return allTransactions.filter((t) => categorizeTransaction(t) === filterMode)
  }, [allTransactions, filterMode])

  const totalFiltered = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + (t.direction === 'Entrada' ? t.amount : -t.amount), 0)
  }, [filteredTransactions])

  const remove = useMutation({
    mutationFn: (id: string) => api.request(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tx'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  return {
    filterMode,
    setFilterMode,
    allTransactions,
    filteredTransactions,
    counts,
    totalFiltered,
    remove,
  }
}
