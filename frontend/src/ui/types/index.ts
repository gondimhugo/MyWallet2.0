export interface Account {
  id?: string
  name: string
  bank?: string
  account_type?: string
  card_types?: string[]
  notes?: string
  balance?: number
  credit_limit?: number
  credit_used?: number
  credit_available?: number
  close_day?: number | null
  due_day?: number | null
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
