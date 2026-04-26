import { useMutation } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { PlanningInput, PlanningOutput } from '../../types/planning'

export function usePlanningSimulation() {
  return useMutation<PlanningOutput, Error, PlanningInput>({
    mutationFn: (input) => {
      const payload = {
        ...input,
        endISO: input.horizonMode === 'custom' ? input.endISO : null,
      }
      return api.request('/planning/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
  })
}
