export type HorizonMode = 'nextSalary' | 'nextDue' | 'days30' | 'days60' | 'custom'

export type PlanningTab = 'cashflow' | 'budgets' | 'goals' | 'loans' | 'scenarios'

export interface PlanningInput {
  startISO: string
  horizonMode: HorizonMode
  endISO?: string | null
  includeInvoices: boolean
  creditAsCash: boolean
  includeLoans: boolean
}

export type LoanDirection = 'taken' | 'granted'
export type LoanInterestMode = 'simple' | 'compound'
export type LoanStatus = 'active' | 'partial' | 'paid' | 'overdue'

export interface Loan {
  id: string
  user_id: string
  direction: LoanDirection
  counterparty: string
  principal: number
  interest_rate: number
  interest_mode: LoanInterestMode
  start_date: string
  due_date: string
  status: LoanStatus
  repaid_amount: number
  linked_account_id: string | null
  notes: string
  expected_return: number
  interest_amount: number
  months: number
  outstanding: number
}

export interface LoanFormData {
  direction: LoanDirection
  counterparty: string
  principal: number
  interest_rate: number
  interest_mode: LoanInterestMode
  start_date: string
  due_date: string
  linked_account_id: string | null
  notes: string
}

export interface LoanScheduleRow {
  month: number
  date: string
  interest_period: number
  interest_accrued: number
  balance: number
}

export interface LoanScheduleResponse {
  loan: Loan
  rows: LoanScheduleRow[]
}

export const LOAN_DIRECTION_LABELS: Record<LoanDirection, string> = {
  taken: 'Tomado (devo)',
  granted: 'Concedido (a receber)',
}

export const LOAN_INTEREST_MODE_LABELS: Record<LoanInterestMode, string> = {
  simple: 'Juros simples',
  compound: 'Juros compostos',
}

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  active: 'Ativo',
  partial: 'Pago parcial',
  paid: 'Quitado',
  overdue: 'Vencido',
}

export const LOAN_STATUS_COLORS: Record<LoanStatus, string> = {
  active: '#4f46e5',
  partial: '#f59e0b',
  paid: '#10b981',
  overdue: '#ef4444',
}

export function initialLoanForm(): LoanFormData {
  const today = new Date().toISOString().slice(0, 10)
  const dueDate = new Date()
  dueDate.setMonth(dueDate.getMonth() + 1)
  return {
    direction: 'taken',
    counterparty: '',
    principal: 0,
    interest_rate: 0,
    interest_mode: 'simple',
    start_date: today,
    due_date: dueDate.toISOString().slice(0, 10),
    linked_account_id: null,
    notes: '',
  }
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

// ── Budgets ─────────────────────────────────────────────────────────────────

export interface Budget {
  id: string
  category: string
  month: string  // YYYY-MM
  amount_limit: number
}

export interface BudgetProgress {
  id: string
  category: string
  month: string
  amount_limit: number
  spent: number
  remaining: number
  pct: number
}

export interface BudgetFormData {
  category: string
  month: string
  amount_limit: number | ''
}

export const initialBudgetForm = (month: string): BudgetFormData => ({
  category: '',
  month,
  amount_limit: '',
})

// ── Horizon ──────────────────────────────────────────────────────────────────

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
  includeLoans: true,
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
