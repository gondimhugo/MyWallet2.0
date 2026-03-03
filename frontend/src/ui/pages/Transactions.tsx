import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { api } from '../../lib/api'

interface TransactionForm {
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

const TRANSACTION_KINDS = {
  Normal: 'Transação Normal',
  PagamentoFatura: 'Pagamento de Fatura',
  Salario: 'Salário',
}

const PAYMENT_METHODS = {
  Pix: '🔵 Pix',
  Transferência: '🏦 Transferência Bancária',
  Débito: '💳 Débito',
  Crédito: '💳 Crédito',
  Dinheiro: '💵 Dinheiro',
}

const initial: TransactionForm = {
  date: new Date().toISOString().slice(0, 10),
  direction: 'Saída',
  amount: 0,
  method: 'Pix',
  account: 'Conta Corrente',
  card: '',
  kind: 'Normal',
  category: '',
  subcategory: '',
  description: '',
  notes: '',
}

export function Transactions() {
  const [form, setForm] = useState<TransactionForm>(initial)
  const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saida'>('all')
  const qc = useQueryClient()

  const tx = useQuery({ queryKey: ['tx'], queryFn: () => api.request('/transactions') })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.request('/accounts') })
  const cards = useQuery({ queryKey: ['cards'], queryFn: () => api.request('/cards') })

  const create = useMutation({
    mutationFn: () => api.request('/transactions', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tx'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setForm({ ...initial, date: new Date().toISOString().slice(0, 10) })
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.request(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tx'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  // Filtrar transações
  const filteredTransactions = useMemo(() => {
    const list = (tx.data || []) as any[]
    if (filterType === 'all') return list
    if (filterType === 'entrada') return list.filter((t) => t.direction === 'Entrada')
    return list.filter((t) => t.direction === 'Saída')
  }, [tx.data, filterType])

  // Contas e cartões
  const accountList = (accounts.data || []) as Array<{ id: string; name: string }>
  const cardList = (cards.data || []) as Array<{ id: string; name: string }>

  return (
    <div>
      <div className='card card-title'>
        <h2>Lançamentos</h2>
        <div className='muted'>Gerenciar entradas, saídas e dívidas</div>
      </div>

      {/* Aviso sobre fluxo de pagamentos */}
      <div className='card' style={{ background: '#f0f9ff', borderLeft: '4px solid #0284c7' }}>
        <strong>💡 Como funciona:</strong>
        <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px', color: '#0c4a6e', fontSize: '0.95rem' }}>
          <li><strong>🛒 Compras em Crédito:</strong> Adicione aqui na Saída (método Crédito) → aparecerá em Faturas automaticamente</li>
          <li><strong>💳 Pagamento de Faturas:</strong> Gerenciado na página de <strong>Faturas</strong></li>
          <li><strong>💰 Salário:</strong> Configurado na página de <strong>Salário</strong> → adicionado automaticamente no dia</li>
        </ul>
      </div>

      {/* Formulário de entrada */}
      <div className='card'>
        <div className='card-title'>
          <strong>➕ Novo Lançamento</strong>
          <div className='muted'>preencha os dados da transação</div>
        </div>

        {/* Data e Tipo */}
        <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600 }}>📅 Data:</label>
            <input
              type='date'
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600 }}>📊 Direção:</label>
            <select
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value as 'Entrada' | 'Saída' })}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: form.direction === 'Entrada' ? '#f0fdf4' : '#fef2f2',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <option value='Entrada'>⬇️ Entrada (recebi)</option>
              <option value='Saída'>⬆️ Saída (paguei)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600 }}>💰 Valor:</label>
            <input
              type='number'
              step='0.01'
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              placeholder='0.00'
            />
          </div>
        </div>

        {/* Tipo de Transação */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>🏷️ Tipo de Transação:</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(TRANSACTION_KINDS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setForm({ ...form, kind: key })}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: form.kind === key ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                  background: form.kind === key ? '#e0e7ff' : 'white',
                  color: form.kind === key ? '#4f46e5' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {form.kind === 'Normal' && (
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#0c4a6e', background: '#f0f9ff', padding: '8px 12px', borderRadius: '6px' }}>
              🛒 Compras normais em débito, dinheiro ou crédito. Crédito aparecerá em Faturas
            </div>
          )}
          {form.kind === 'PagamentoFatura' && (
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#7c2d12', background: '#fef3c7', padding: '8px 12px', borderRadius: '6px' }}>
              💳 Use para registrar pagamento manual de fatura
            </div>
          )}
          {form.kind === 'Salario' && (
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#065f46', background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px' }}>
              💰 Entrada de salário
            </div>
          )}
        </div>

        {/* Método de Pagamento */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>🔄 Método de Pagamento:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
            {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setForm({ ...form, method: key })}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: form.method === key ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                  background: form.method === key ? '#e0e7ff' : 'white',
                  color: form.method === key ? '#4f46e5' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Conta */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>🏦 Conta:</label>
          {accountList.length > 0 ? (
            <select
              value={form.account}
              onChange={(e) => setForm({ ...form, account: e.target.value })}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: 'white',
                cursor: 'pointer',
                width: '100%',
                maxWidth: '400px',
              }}
            >
              {accountList.map((acc) => (
                <option key={acc.id || acc.name} value={acc.name}>
                  {acc.name}
                </option>
              ))}
            </select>
          ) : (
            <div className='muted' style={{ color: '#ef4444' }}>⚠️ Nenhuma conta cadastrada</div>
          )}
        </div>

        {/* Cartão (se método for crédito) */}
        {form.method === 'Crédito' && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>💳 Cartão de Crédito:</label>
            {cardList.length > 0 ? (
              <select
                value={form.card}
                onChange={(e) => setForm({ ...form, card: e.target.value })}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '400px',
                }}
              >
                <option value=''>Selecione um cartão...</option>
                {cardList.map((card) => (
                  <option key={card.id || card.name} value={card.name}>
                    {card.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className='muted' style={{ color: '#ef4444' }}>⚠️ Nenhum cartão cadastrado</div>
            )}
            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#0284c7', background: '#f0f9ff', padding: '8px 12px', borderRadius: '6px' }}>
              ℹ️ Transações de crédito aparecerão automaticamente em <strong>Faturas</strong>, acumulando até o fechamento do ciclo
            </div>
          </div>
        )}

        {/* Descrição */}
        <div style={{ marginTop: '16px' }}>
          <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600 }}>📝 Descrição:</label>
              <input
                type='text'
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder='Ex: Supermercado, Salário, etc.'
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600 }}>📂 Categoria:</label>
              <input
                type='text'
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder='Ex: Alimentação, Salário, Dívida'
              />
            </div>
          </div>
        </div>

        {/* Notas */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>📌 Notas (opcional):</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder='Notas adicionais...'
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              minHeight: '80px',
              fontFamily: 'monospace',
              width: '100%',
            }}
          />
        </div>

        {/* Botão salvar */}
        <div style={{ marginTop: '16px' }}>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending || !form.description || form.amount <= 0}
            style={{
              background: '#10b981',
              color: 'white',
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: create.isPending || !form.description || form.amount <= 0 ? 'not-allowed' : 'pointer',
              opacity: create.isPending || !form.description || form.amount <= 0 ? 0.6 : 1,
            }}
            className='btn'
          >
            {create.isPending ? '⏳ Salvando...' : '✅ Salvar Lançamento'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className='card' style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600 }}>Filtrar:</label>
        {(['all', 'entrada', 'saida'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: filterType === type ? '2px solid #4f46e5' : '1px solid #e5e7eb',
              background: filterType === type ? '#e0e7ff' : 'white',
              color: filterType === type ? '#4f46e5' : '#6b7280',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {type === 'all' ? '📊 Todos' : type === 'entrada' ? '⬇️ Entradas' : '⬆️ Saídas'}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', color: '#6b7280', fontSize: '0.9rem' }}>
          Total: {filteredTransactions.length} lançamento{filteredTransactions.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Tabela de transações */}
      <div className='card' style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>📅 Data</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>📝 Descrição</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>🏷️ Tipo</th>
              <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>💰 Valor</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>🔄 Método</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>📂 Categoria</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>💳 Fatura</th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>🗑️ Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((t: any) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>{t.date}</td>
                  <td style={{ padding: '12px', color: '#0f172a', fontWeight: 500 }}>{t.description}</td>
                  <td style={{ padding: '12px', fontSize: '0.85rem' }}>
                    <span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '3px 8px', borderRadius: '4px' }}>
                      {t.kind}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: t.direction === 'Entrada' ? '#10b981' : '#ef4444' }}>
                    {t.direction === 'Entrada' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.9rem' }}>{t.method}</td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{t.category || '—'}</td>
                  <td style={{ padding: '12px', fontSize: '0.85rem', color: '#6b7280' }}>{t.invoice_key || '—'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      className='btn'
                      onClick={() => t.id && remove.mutate(t.id)}
                      disabled={!t.id || remove.isPending}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        padding: '6px 10px',
                        fontSize: '0.85rem',
                        opacity: !t.id || remove.isPending ? 0.6 : 1,
                        cursor: !t.id || remove.isPending ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {remove.isPending ? 'Removendo...' : 'Remover'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                  Nenhum lançamento encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
