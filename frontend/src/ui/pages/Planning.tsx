import { useEffect, useState } from 'react'
import { parseApiError } from '../../lib/validation'
import { BudgetsTab } from '../components/planning/budgets/BudgetsTab'
import { CashFlowEvents } from '../components/planning/cashflow/CashFlowEvents'
import { CashFlowMetrics } from '../components/planning/cashflow/CashFlowMetrics'
import { CashFlowTimeline } from '../components/planning/cashflow/CashFlowTimeline'
import { PlanningHeader } from '../components/planning/PlanningHeader'
import { PlanningTabs } from '../components/planning/PlanningTabs'
import { ScenarioForm } from '../components/planning/ScenarioForm'
import { usePlanningForm } from '../hooks/planning/usePlanningForm'
import { usePlanningSimulation } from '../hooks/planning/usePlanningSimulation'
import { TAB_LABELS, type PlanningTab } from '../types/planning'

const TAB_STORAGE_KEY = 'mw:planningTab'

function loadInitialTab(): PlanningTab {
  if (typeof window === 'undefined') return 'cashflow'
  const stored = window.localStorage.getItem(TAB_STORAGE_KEY)
  if (stored === 'cashflow' || stored === 'budgets') return stored
  return 'cashflow'
}

export function Planning() {
  const { input, update, reset, errors, canSubmit } = usePlanningForm()
  const simulation = usePlanningSimulation()
  const [activeTab, setActiveTab] = useState<PlanningTab>(loadInitialTab)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TAB_STORAGE_KEY, activeTab)
    }
  }, [activeTab])

  const handleRun = () => {
    if (!canSubmit) return
    simulation.mutate(input)
  }

  return (
    <div>
      <PlanningHeader
        startISO={input.startISO}
        endISO={input.horizonMode === 'custom' ? input.endISO : undefined}
        isRunning={simulation.isPending}
      />

      <PlanningTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === 'cashflow' && (
        <>
          <ScenarioForm
            input={input}
            errors={errors}
            onChange={update}
            onSubmit={handleRun}
            onReset={reset}
            canSubmit={canSubmit}
            isPending={simulation.isPending}
          />

          {simulation.isError && (
            <div className='card auth-alert error' role='alert'>
              {parseApiError(simulation.error)}
            </div>
          )}

          {simulation.isPending && (
            <div className='card centered muted' style={{ padding: 32 }}>
              Calculando projeção…
            </div>
          )}

          {simulation.data && !simulation.isPending && (
            <>
              <CashFlowMetrics data={simulation.data} />
              <CashFlowTimeline data={simulation.data} />
              <CashFlowEvents events={simulation.data.events} />
            </>
          )}

          {!simulation.data && !simulation.isPending && !simulation.isError && (
            <div className='card centered muted' style={{ padding: 32, flexDirection: 'column', gap: 6 }}>
              <strong style={{ color: '#334155' }}>Nada simulado ainda</strong>
              <span>Ajuste os parâmetros acima e clique em <em>Simular cenário</em>.</span>
            </div>
          )}
        </>
      )}

      {activeTab === 'budgets' && <BudgetsTab />}

      {activeTab !== 'cashflow' && activeTab !== 'budgets' && (
        <div className='card centered muted' style={{ padding: 40, flexDirection: 'column', gap: 8 }}>
          <strong style={{ color: '#334155' }}>{TAB_LABELS[activeTab]}</strong>
          <span>Esta seção será habilitada nas próximas fases do redesign.</span>
        </div>
      )}
    </div>
  )
}
