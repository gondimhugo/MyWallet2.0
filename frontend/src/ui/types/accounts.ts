export interface AccountForm {
  customName: string
  bank: string
  accountType: 'Corrente' | 'Poupança' | 'Investimento' | 'Outra'
  cardTypes: string[]
  notes: string
  creditLimit: number
  closeDay: number
  dueDay: number
}

export interface BankOption {
  code: string
  name: string
  logo: string
  color: string
}

export const BANK_OPTIONS: BankOption[] = [
  { code: 'bradesco', name: 'Bradesco', logo: '🟠', color: '#f97316' },
  { code: 'itau', name: 'Itaú', logo: '🟠', color: '#ff6600' },
  { code: 'caixa', name: 'Caixa Econômica', logo: '🔵', color: '#0066cc' },
  { code: 'santander', name: 'Santander', logo: '🔴', color: '#d71010' },
  { code: 'bb', name: 'Banco do Brasil', logo: '💛', color: '#ffd700' },
  { code: 'nubank', name: 'Nubank', logo: '🟣', color: '#820ad1' },
  { code: 'inter', name: 'Banco Inter', logo: '🔴', color: '#ff6b35' },
  { code: 'btg', name: 'BTG Pactual', logo: '🔵', color: '#003da5' },
  { code: 'otro', name: 'Outro Banco', logo: '🏦', color: '#6b7280' },
]

export const CARD_TYPES = ['Crédito', 'Débito']
export const ACCOUNT_TYPES = ['Corrente', 'Poupança', 'Investimento', 'Outra']

export const initialAccountForm: AccountForm = {
  customName: '',
  bank: 'bradesco',
  accountType: 'Corrente',
  cardTypes: [],
  notes: '',
  creditLimit: 0,
  closeDay: 8,
  dueDay: 15,
}
