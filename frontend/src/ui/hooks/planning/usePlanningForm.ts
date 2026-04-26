import { useCallback, useMemo, useState } from 'react'
import { initialPlanningInput, type PlanningInput } from '../../types/planning'

export interface PlanningFormError {
  field: 'startISO' | 'endISO'
  message: string
}

export function usePlanningForm() {
  const [input, setInput] = useState<PlanningInput>(initialPlanningInput)

  const update = useCallback(<K extends keyof PlanningInput>(key: K, value: PlanningInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => {
    setInput(initialPlanningInput())
  }, [])

  const errors = useMemo<PlanningFormError[]>(() => {
    const list: PlanningFormError[] = []
    if (!input.startISO) {
      list.push({ field: 'startISO', message: 'Informe a data inicial.' })
    }
    if (input.horizonMode === 'custom') {
      if (!input.endISO) {
        list.push({ field: 'endISO', message: 'Informe a data final do período.' })
      } else if (input.endISO < input.startISO) {
        list.push({ field: 'endISO', message: 'A data final deve ser posterior à inicial.' })
      }
    }
    return list
  }, [input])

  const canSubmit = errors.length === 0

  return { input, setInput, update, reset, errors, canSubmit }
}
