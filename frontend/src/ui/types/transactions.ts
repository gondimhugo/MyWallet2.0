export type EntryMode = 'compra-avista' | 'compra-credito' | 'entrada' | 'pagamento-fatura' | 'salario'
export type CreationMode = Exclude<EntryMode, 'pagamento-fatura'>

export interface TransactionForm {
  date: string
  direction: 'Entrada' | 'Saída'
  amount: number
  method: string
  account: string
  card: string
  kind: string
  category: string
  subcategory: string
  description: string
  notes: string
}

export interface ModeMeta {
  label: string
  icon: string
  color: string
  bg: string
  helper: string
}

export const CASH_METHODS: Record<string, string> = {
  Pix: '🔵 Pix',
  Débito: '💳 Débito',
  Dinheiro: '💵 Dinheiro',
  Transferência: '🏦 Transferência',
}

export const ENTRY_METHODS: Record<string, string> = {
  Pix: '🔵 Pix',
  Transferência: '🏦 Transferência',
  Dinheiro: '💵 Dinheiro',
  Débito: '💳 Débito',
}

export const initialTransactionForm: TransactionForm = {
  date: new Date().toISOString().slice(0, 10),
  direction: 'Saída',
  amount: 0,
  method: 'Pix',
  account: '',
  card: '',
  kind: 'Normal',
  category: '',
  subcategory: '',
  description: '',
  notes: '',
}

export const MODE_META: Record<EntryMode, ModeMeta> = {
  'compra-avista': {
    label: 'Compra à vista',
    icon: '🛒',
    color: '#0f766e',
    bg: '#ecfdf5',
    helper: 'Pagamento imediato com Pix, Débito, Dinheiro ou Transferência. Debita na hora do saldo da conta.',
  },
  'compra-credito': {
    label: 'Compra no Crédito',
    icon: '💳',
    color: '#4f46e5',
    bg: '#eef2ff',
    helper: 'Compra parcelada/no cartão. Será lançada automaticamente em uma fatura e consome o limite do cartão.',
  },
  entrada: {
    label: 'Entrada (recebi)',
    icon: '⬇️',
    color: '#059669',
    bg: '#f0fdf4',
    helper: 'Qualquer valor que entrou na conta (reembolso, transferência recebida, venda, etc.). Para salário use a aba dedicada.',
  },
  'pagamento-fatura': {
    label: 'Pagamento de Fatura',
    icon: '🧾',
    color: '#b45309',
    bg: '#fffbeb',
    helper: '',
  },
  salario: {
    label: 'Salário',
    icon: '💰',
    color: '#047857',
    bg: '#ecfdf5',
    helper: 'Salários recorrentes devem ser cadastrados na página de Salário para serem lançados automaticamente.',
  },
}

export function categorizeTransaction(t: any): EntryMode {
  if (t.kind === 'Salario') return 'salario'
  if (t.kind === 'PagamentoFatura') return 'pagamento-fatura'
  if (t.direction === 'Entrada') return 'entrada'
  if (t.method === 'Crédito') return 'compra-credito'
  return 'compra-avista'
}
