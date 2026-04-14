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

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function Accounts() {
  const [form, setForm] = useState<AccountForm>(initialForm)
  const qc = useQueryClient()

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.request('/accounts') })

  const selectedBank = useMemo(() => BANK_OPTIONS.find((b) => b.code === form.bank) || BANK_OPTIONS[0], [form.bank])
  const bankName = form.bank === 'otro' ? form.customName.trim() : selectedBank.name
  const hasCredit = form.cardTypes.includes('Crédito')
  const isValid = !!bankName && (!hasCredit || (form.creditLimit > 0 && form.closeDay >= 1 && form.closeDay <= 31 && form.dueDay >= 1 && form.dueDay <= 31))

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

  const totals = useMemo(() => {
    let cash = 0
    let limit = 0
    let used = 0
    let available = 0
    for (const acc of accountList) {
      const cardTypes = acc.card_types || []
      const isOnlyCredit = cardTypes.length > 0 && cardTypes.every((t) => t === 'Crédito')
      if (!isOnlyCredit) cash += acc.balance || 0
      const lim = acc.credit_limit || 0
      if (lim > 0) {
        limit += lim
        used += acc.credit_used || 0
        available += acc.credit_available ?? (lim - (acc.credit_used || 0))
      }
    }
    return { cash, limit, used, available }
  }, [accountList])

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
        <div className='muted'>Cadastro de contas com saldos de caixa (débito, Pix, transferência) e crédito</div>
      </div>

      {accountList.length > 0 && (
        <div className='card'>
          <div className='card-title'>
            <strong>💼 Resumo Consolidado</strong>
            <div className='muted' style={{ fontSize: '0.85rem' }}>{accountList.length} conta(s)</div>
          </div>
          <div className='balance-summary'>
            <div className='balance-tile cash'>
              <div className='label'>💰 Saldo em Caixa</div>
              <div className='value'>{formatBRL(totals.cash)}</div>
              <div className='hint'>Débito · Pix · Transferência · Dinheiro</div>
            </div>
            <div className='balance-tile credit-available'>
              <div className='label'>✅ Crédito Disponível</div>
              <div className='value'>{formatBRL(totals.available)}</div>
              <div className='hint'>Pronto para usar</div>
            </div>
            <div className='balance-tile credit-used'>
              <div className='label'>💳 Crédito Usado</div>
              <div className='value'>{formatBRL(totals.used)}</div>
              <div className='hint'>Já comprometido</div>
            </div>
            <div className='balance-tile credit-limit'>
              <div className='label'>🎯 Limite Total</div>
              <div className='value'>{formatBRL(totals.limit)}</div>
              <div className='hint'>Soma de todos limites</div>
            </div>
          </div>
        </div>
      )}

      <div className='card'>
        <div className='card-title'>
          <strong>➕ Nova Conta Bancária</strong>
          <div className='muted'>Selecione o banco e configure a conta</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <label style={{ fontWeight: 600 }}>🏦 Selecione o Banco:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
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
            <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
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

      <div className='accounts-grid'>
        {accountList.map((acc) => {
          const bank = BANK_OPTIONS.find((b) => b.code === acc.bank) || BANK_OPTIONS.find((b) => b.name.toLowerCase() === (acc.bank || '').toLowerCase()) || BANK_OPTIONS[BANK_OPTIONS.length - 1]
          const cardTypes = acc.card_types || []
          const hasCreditOnCard = cardTypes.includes('Crédito') || (acc.credit_limit || 0) > 0
          const isOnlyCredit = cardTypes.length > 0 && cardTypes.every((t) => t === 'Crédito')
          const hasDebit = !isOnlyCredit
          const balance = acc.balance || 0
          const limit = acc.credit_limit || 0
          const used = acc.credit_used || 0
          const available = acc.credit_available ?? (limit - used)
          return (
            <div key={acc.id || acc.name} className='account-card' style={{ borderTop: `4px solid ${bank.color}` }}>
              <div className='account-head'>
                <div className='logo'>{bank.logo}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className='name'>{acc.name}</div>
                  <div className='sub'>{bank.name} · {acc.account_type || 'Corrente'}</div>
                </div>
              </div>

              {hasDebit && (
                <div className='highlight-box cash-box'>
                  <div className='hb-label'>💰 Saldo em Caixa</div>
                  <div className='hb-value'>{formatBRL(balance)}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>Débito · Pix · Transferência</div>
                </div>
              )}

              {hasCreditOnCard && (
                <div className='highlight-box credit-box'>
                  <div className='hb-label'>💳 Crédito</div>
                  <div className='hb-value'>{formatBRL(available)}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>Disponível de {formatBRL(limit)}</div>
                  <div className='credit-mini-grid'>
                    <div className='credit-mini available'>
                      <div className='cm-label'>Disponível</div>
                      <div className='cm-value'>{formatBRL(available)}</div>
                    </div>
                    <div className='credit-mini used'>
                      <div className='cm-label'>Usado</div>
                      <div className='cm-value'>{formatBRL(used)}</div>
                    </div>
                    <div className='credit-mini limit'>
                      <div className='cm-label'>Limite</div>
                      <div className='cm-value'>{formatBRL(limit)}</div>
                    </div>
                  </div>
                  <div className='credit-dates'>
                    <span>📅 Fecha dia <strong>{acc.close_day || '-'}</strong></span>
                    <span>⏰ Vence dia <strong>{acc.due_day || '-'}</strong></span>
                  </div>
                </div>
              )}

              {acc.notes && <div style={{ fontSize: '0.85rem', color: '#475569' }}>🗒️ {acc.notes}</div>}

              <button
                className='btn'
                onClick={() => acc.id && remove.mutate(acc.id)}
                disabled={!acc.id || remove.isPending}
                style={{ marginTop: 'auto', background: '#ef4444', color: 'white', width: '100%', opacity: !acc.id || remove.isPending ? 0.6 : 1 }}
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
