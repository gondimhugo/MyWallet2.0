export type ChartTypeCat = 'bar' | 'pie' | 'line'
export type ChartTypeBalance = 'line' | 'area' | 'bar'

export interface KPIData {
  entradas: number
  saidas: number
  saldo: number
  gastos_sem_fatura: number
  pagamentos_fatura: number
}

export interface DashboardTransaction {
  date: string
  direction: 'Entrada' | 'Saída'
  amount: number
  kind: string
  category: string
}

export const CHART_COLORS = ['#4f46e5', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#6366f1', '#14b8a6', '#f97316']

export function formatCurrency(val: number): string {
  return `R$ ${val.toFixed(2)}`
}

export function getKPILabel(key: string): string {
  const labels: Record<string, string> = {
    entradas: '💰 Entradas',
    saidas: '📤 Total Saídas',
    saldo: '📊 Saldo',
    gastos_sem_fatura: '🛒 Gastos',
    pagamentos_fatura: '💳 Pagamentos Fatura',
  }
  return labels[key] || key
}

export function getKPIColor(key: string): string {
  const colors: Record<string, string> = {
    entradas: '#10b981',
    saidas: '#ef4444',
    saldo: '#4f46e5',
    gastos_sem_fatura: '#f59e0b',
    pagamentos_fatura: '#06b6d4',
  }
  return colors[key] || '#6b7280'
}
