import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { Loan, LoanFormData, LoanScheduleResponse } from '../../types/planning'

const LOANS_KEY = ['loans'] as const

export function useLoans() {
  const qc = useQueryClient()

  const list = useQuery<Loan[]>({
    queryKey: LOANS_KEY,
    queryFn: () => api.request('/loans'),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: LOANS_KEY })
    // A loan affects the planning forecast; nudge any open simulation cache.
    qc.invalidateQueries({ queryKey: ['planning'] })
  }

  const create = useMutation<Loan, Error, LoanFormData>({
    mutationFn: (form) =>
      api.request('/loans', {
        method: 'POST',
        body: JSON.stringify(form),
      }),
    onSuccess: invalidate,
  })

  const update = useMutation<Loan, Error, { id: string; form: LoanFormData }>({
    mutationFn: ({ id, form }) =>
      api.request(`/loans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      }),
    onSuccess: invalidate,
  })

  const remove = useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (id) => api.request(`/loans/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  const repay = useMutation<Loan, Error, { id: string; amount: number }>({
    mutationFn: ({ id, amount }) =>
      api.request(`/loans/${id}/repay`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: invalidate,
  })

  return { list, create, update, remove, repay }
}

export function useLoanSchedule(loanId: string | null) {
  return useQuery<LoanScheduleResponse>({
    queryKey: ['loans', 'schedule', loanId],
    queryFn: () => api.request(`/loans/${loanId}/schedule`),
    enabled: !!loanId,
  })
}
