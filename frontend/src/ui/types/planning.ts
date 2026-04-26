export type HorizonMode = 'nextSalary' | 'nextDue' | 'days30' | 'days60' | 'custom'

export type PlanningTab = 'cashflow' | 'budgets' | 'goals' | 'loans' | 'scenarios'

export interface PlanningInput {
  startISO: string
  horizonMode: HorizonMode
  endISO?: string | null
  includeInvoices: boolean
  creditAsCash: boolean
}

export interface PlanningEvent {
  date: string
  label: string
  in: number
  out: number
  forecast: boolean
}

export interface PlanningSeriesPoint {
  date: string
  cash: number
}

export interface PlanningOutput {
  baseCash: number
  minCash: number
  minDateISO: string
  endCash: number
  projectedIn: number
  projectedOut: number
  series: PlanningSeriesPoint[]
  events: PlanningEvent[]
}

export const HORIZON_LABELS: Record<HorizonMode, string> = {
  nextSalary: 'Até o próximo salário',
  nextDue: 'Até o próximo vencimento',
  days30: 'Próximos 30 dias',
  days60: 'Próximos 60 dias',
  custom: 'Período personalizado',
}

export const initialPlanningInput = (): PlanningInput => ({
  startISO: new Date().toISOString().slice(0, 10),
  horizonMode: 'days30',
  endISO: null,
  includeInvoices: true,
  creditAsCash: false,
})

export type CashFlowMetricKey =
  | 'baseCash'
  | 'endCash'
  | 'minCash'
  | 'projectedIn'
  | 'projectedOut'
  | 'netChange'
  | 'daysNegative'
  | 'cushion'

export interface CashFlowMetric {
  key: CashFlowMetricKey
  label: string
  value: number
  color: string
  hint?: string
}

export const TAB_LABELS: Record<PlanningTab, string> = {
  cashflow: 'Fluxo de caixa',
  budgets: 'Orçamentos',
  goals: 'Metas',
  loans: 'Empréstimos',
  scenarios: 'Cenários',
}

export const TAB_ICONS: Record<PlanningTab, string> = {
  cashflow: '📈',
  budgets: '📊',
  goals: '🎯',
  loans: '🤝',
  scenarios: '🧪',
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDateBR(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

export function computeCashFlowMetrics(data: PlanningOutput): CashFlowMetric[] {
  const netChange = data.endCash - data.baseCash
  const daysNegative = data.series.filter((p) => p.cash < 0).length
  const cushion = data.minCash

  return [
    {
      key: 'baseCash',
      label: 'Saldo atual',
      value: data.baseCash,
      color: '#4f46e5',
      hint: 'Ponto de partida da simulação',
    },
    {
      key: 'endCash',
      label: 'Saldo projetado',
      value: data.endCash,
      color: data.endCash >= data.baseCash ? '#10b981' : '#ef4444',
      hint: 'Saldo no fim do horizonte',
    },
    {
      key: 'minCash',
      label: 'Saldo mínimo',
      value: data.minCash,
      color: data.minCash < 0 ? '#ef4444' : '#0f766e',
      hint: `Em ${formatDateBR(data.minDateISO)}`,
    },
    {
      key: 'netChange',
      label: 'Variação líquida',
      value: netChange,
      color: netChange >= 0 ? '#10b981' : '#ef4444',
      hint: netChange >= 0 ? 'Sobra de caixa' : 'Erosão de caixa',
    },
    {
      key: 'projectedIn',
      label: 'Entradas previstas',
      value: data.projectedIn,
      color: '#10b981',
    },
    {
      key: 'projectedOut',
      label: 'Saídas previstas',
      value: data.projectedOut,
      color: '#ef4444',
    },
    {
      key: 'daysNegative',
      label: 'Dias no negativo',
      value: daysNegative,
      color: daysNegative > 0 ? '#ef4444' : '#10b981',
      hint: daysNegative > 0 ? 'Risco de saldo descoberto' : 'Sem dias no vermelho',
    },
    {
      key: 'cushion',
      label: 'Folga de caixa',
      value: cushion,
      color: cushion > 0 ? '#0f766e' : '#ef4444',
      hint: cushion > 0 ? 'Margem positiva' : 'Sem folga no horizonte',
    },
  ]
}
