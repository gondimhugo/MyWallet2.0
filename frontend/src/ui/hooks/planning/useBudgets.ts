import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { BudgetFormData, BudgetProgress } from '../../types/planning'

const budgetsKey = (month: string) => ['budgets', month]
const categoriesKey = ['budgets-categories']

export function useBudgets(month: string) {
  const qc = useQueryClient()

  const list = useQuery<BudgetProgress[]>({
    queryKey: budgetsKey(month),
    queryFn: () => api.request(`/budgets?month=${month}`),
  })

  const categories = useQuery<string[]>({
    queryKey: categoriesKey,
    queryFn: () => api.request('/budgets/categories'),
    staleTime: 60_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: budgetsKey(month) })

  const create = useMutation({
    mutationFn: (data: BudgetFormData) =>
      api.request('/budgets', {
        method: 'POST',
        body: JSON.stringify({ ...data, amount_limit: Number(data.amount_limit) }),
      }),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BudgetFormData }) =>
      api.request(`/budgets/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, amount_limit: Number(data.amount_limit) }),
      }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) =>
      api.request(`/budgets/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  return { list, categories, create, update, remove }
}
