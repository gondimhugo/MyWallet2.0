import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { api } from '../../lib/api'

interface AccountForm {
  customName: string
  bank: string
  accountType: 'Corrente' | 'Poupança' | 'Investimento' | 'Outra'
  cardTypes: string[]
  notes: string
  creditLimit: number
  closeDay: number
  dueDay: number
}

const BANK_OPTIONS = [
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

const CARD_TYPES = ['Crédito', 'Débito']
const ACCOUNT_TYPES = ['Corrente', 'Poupança', 'Investimento', 'Outra']

const initialForm: AccountForm = {
  customName: '',
  bank: 'bradesco',
  accountType: 'Corrente',
  cardTypes: [],
  notes: '',
  creditLimit: 0,
  closeDay: 8,
  dueDay: 15,
}

export function Accounts() {
  const [form, setForm] = useState<AccountForm>(initialForm)
  const qc = useQueryClient()

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.request('/accounts') })

  const selectedBank = useMemo(() => BANK_OPTIONS.find((b) => b.code === form.bank) || BANK_OPTIONS[0], [form.bank])
  const bankName = form.bank === 'otro' ? form.customName.trim() : selectedBank.name
  const hasCredit = form.cardTypes.includes('Crédito')
  const isValid = !!bankName && (!hasCredit || (form.closeDay >= 1 && form.closeDay <= 31 && form.dueDay >= 1 && form.dueDay <= 31))

  const create = useMutation({
    mutationFn: () => {
      const payload = {
        name: bankName,
        bank: form.bank,
        account_type: form.accountType,
        card_types: form.cardTypes,
        notes: form.notes,
        credit_limit: form.creditLimit,
        close_day: hasCredit ? form.closeDay : null,
        due_day: hasCredit ? form.dueDay : null,
        balance: 0,
      }
      return api.request('/accounts', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setForm(initialForm)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.request(`/accounts/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })

  const accountList = (accounts.data || []) as Array<{
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
  }>

  const toggleCardType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      cardTypes: prev.cardTypes.includes(type) ? prev.cardTypes.filter((t) => t !== type) : [...prev.cardTypes, type],
    }))
  }

  return (
    <div>
      <div className='card card-title'>
        <h2>🏦 Contas Bancárias</h2>
        <div className='muted'>Cadastro profissional de contas com observações, débito e crédito</div>
      </div>

      <div className='card'>
        <div className='card-title'>
          <strong>➕ Nova Conta Bancária</strong>
          <div className='muted'>Selecione o banco e configure a conta</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <label style={{ fontWeight: 600 }}>🏦 Selecione o Banco:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            {BANK_OPTIONS.map((bank) => (
              <button
                key={bank.code}
                onClick={() => setForm({ ...form, bank: bank.code })}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: form.bank === bank.code ? `3px solid ${bank.color}` : '1px solid #e5e7eb',
                  background: form.bank === bank.code ? `${bank.color}20` : 'white',
                  cursor: 'pointer',
                  fontWeight: form.bank === bank.code ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: form.bank === bank.code ? bank.color : '#6b7280',
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{bank.logo}</span>
                <span>{bank.name}</span>
              </button>
            ))}
          </div>
        </div>

        {form.bank === 'otro' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ fontWeight: 600 }}>📝 Nome do Banco (obrigatório para Outro Banco):</label>
            <input
              type='text'
              value={form.customName}
              onChange={(e) => setForm({ ...form, customName: e.target.value })}
              placeholder='Ex: Cooperativa XYZ'
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <label style={{ fontWeight: 600 }}>📊 Tipo de Conta:</label>
          <select value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value as any })}>
            {ACCOUNT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '10px' }}>💳 Funcionalidades da Conta:</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {CARD_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => toggleCardType(type)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: form.cardTypes.includes(type) ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                  background: form.cardTypes.includes(type) ? '#e0e7ff' : 'white',
                  color: form.cardTypes.includes(type) ? '#4f46e5' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {form.cardTypes.includes(type) ? '✅' : '☐'} {type}
              </button>
            ))}
          </div>
        </div>

        {hasCredit && (
          <div className='card' style={{ marginBottom: '16px', background: '#f8fafc' }}>
            <div className='card-title'><strong>💳 Configuração do Crédito</strong></div>
            <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Limite</label>
                <input type='number' step='0.01' value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: Number(e.target.value) })} />
              </div>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Fechamento</label>
                <input type='number' min='1' max='31' value={form.closeDay} onChange={(e) => setForm({ ...form, closeDay: Number(e.target.value) })} />
              </div>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Vencimento</label>
                <input type='number' min='1' max='31' value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })} />
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>🗒️ Observação:</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder='Ex: conta para viagem, conta salário...'
            style={{ width: '100%', minHeight: '70px' }}
          />
        </div>

        <button
          onClick={() => create.mutate()}
          disabled={create.isPending || !isValid}
          className='btn'
          style={{ background: '#10b981', color: 'white', opacity: create.isPending || !isValid ? 0.6 : 1 }}
        >
          {create.isPending ? '⏳ Salvando...' : '✅ Salvar Conta'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '24px' }}>
        {accountList.map((acc) => {
          const bank = BANK_OPTIONS.find((b) => b.code === acc.bank) || BANK_OPTIONS.find((b) => b.name.toLowerCase() === (acc.bank || '').toLowerCase()) || BANK_OPTIONS[BANK_OPTIONS.length - 1]
          const hasCreditOnCard = (acc.card_types || []).includes('Crédito') || (acc.credit_limit || 0) > 0
          return (
            <div key={acc.id || acc.name} style={{ background: 'white', border: `2px solid ${bank.color}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '2rem' }}>{bank.logo}</div>
              <div style={{ fontWeight: 700, marginTop: '6px' }}>{acc.name}</div>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{bank.name} · {acc.account_type || 'Corrente'}</div>
              <div style={{ marginTop: '8px', fontWeight: 600, color: '#0f766e' }}>Saldo: R$ {(acc.balance || 0).toFixed(2)}</div>
              {hasCreditOnCard && (
                <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#4f46e5' }}>
                  Limite: R$ {(acc.credit_limit || 0).toFixed(2)} · Usado: R$ {(acc.credit_used || 0).toFixed(2)} · Disponível: R$ {(acc.credit_available ?? ((acc.credit_limit || 0) - (acc.credit_used || 0))).toFixed(2)} · Fecha: {acc.close_day || '-'} · Vence: {acc.due_day || '-'}
                </div>
              )}
              {acc.notes && <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#475569' }}>🗒️ {acc.notes}</div>}

              <button
                className='btn'
                onClick={() => acc.id && remove.mutate(acc.id)}
                disabled={!acc.id || remove.isPending}
                style={{ marginTop: '12px', background: '#ef4444', color: 'white', width: '100%', opacity: !acc.id || remove.isPending ? 0.6 : 1 }}
              >
                {remove.isPending ? '⏳ Removendo...' : '🗑️ Remover conta'}
              </button>
            </div>
          )
        })}
      </div>

      {accountList.length === 0 && (
        <div style={{ marginTop: '24px', textAlign: 'center', color: '#6b7280', padding: '40px 20px' }}>
          Nenhuma conta bancária cadastrada ainda
        </div>
      )}
    </div>
  )
}
