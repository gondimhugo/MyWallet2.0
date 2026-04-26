import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../../lib/api'
import { parseApiError } from '../../../../lib/validation'
import { useLoanSchedule, useLoans } from '../../../hooks/planning/useLoans'
import type { Account } from '../../../types'
import type { Loan } from '../../../types/planning'
import { LoanForm } from './LoanForm'
import { LoanList } from './LoanList'
import { LoanScheduleTable } from './LoanScheduleTable'

export function LoansTab() {
  const { list, create, update, remove, repay } = useLoans()
  const [editing, setEditing] = useState<Loan | null>(null)
  const [scheduleLoanId, setScheduleLoanId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const accountsQuery = useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: () => api.request('/accounts'),
  })

  const schedule = useLoanSchedule(scheduleLoanId)

  const isMutating =
    create.isPending || update.isPending || remove.isPending || repay.isPending

  const handleSubmit = (formData: Parameters<typeof create.mutate>[0]) => {
    setActionError(null)
    if (editing) {
      update.mutate(
        { id: editing.id, form: formData },
        {
          onSuccess: () => setEditing(null),
          onError: (err) => setActionError(parseApiError(err)),
        },
      )
    } else {
      create.mutate(formData, {
        onError: (err) => setActionError(parseApiError(err)),
      })
    }
  }

  const handleDelete = (loan: Loan) => {
    setActionError(null)
    const confirmed = window.confirm(
      `Excluir o empréstimo "${loan.counterparty || 'sem contraparte'}"? Esta ação não pode ser desfeita.`,
    )
    if (!confirmed) return
    remove.mutate(loan.id, {
      onError: (err) => setActionError(parseApiError(err)),
      onSuccess: () => {
        if (editing?.id === loan.id) setEditing(null)
        if (scheduleLoanId === loan.id) setScheduleLoanId(null)
      },
    })
  }

  const handleRepay = (loan: Loan, amount: number) => {
    setActionError(null)
    repay.mutate(
      { id: loan.id, amount },
      { onError: (err) => setActionError(parseApiError(err)) },
    )
  }

  return (
    <>
      <LoanForm
        editing={editing}
        accounts={accountsQuery.data ?? []}
        isPending={create.isPending || update.isPending}
        errorMessage={actionError ?? undefined}
        onSubmit={handleSubmit}
        onCancel={() => {
          setEditing(null)
          setActionError(null)
        }}
      />

      {list.isLoading && (
        <div className='card centered muted' style={{ padding: 32 }}>
          Carregando empréstimos…
        </div>
      )}

      {list.isError && (
        <div className='card auth-alert error' role='alert'>
          {parseApiError(list.error)}
        </div>
      )}

      {list.data && (
        <LoanList
          loans={list.data}
          onEdit={(loan) => {
            setEditing(loan)
            setActionError(null)
          }}
          onDelete={handleDelete}
          onRepay={handleRepay}
          onShowSchedule={(loan) => setScheduleLoanId(loan.id)}
          isMutating={isMutating}
        />
      )}

      {scheduleLoanId && (
        <LoanScheduleTable
          data={schedule.data}
          isLoading={schedule.isLoading}
          errorMessage={schedule.error ? parseApiError(schedule.error) : undefined}
          onClose={() => setScheduleLoanId(null)}
        />
      )}
    </>
  )
}
