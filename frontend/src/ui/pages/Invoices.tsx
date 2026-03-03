import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../lib/api'

interface Invoice {
  invoice_key: string
  card: string
  purchases: number
  payments: number
  open: number
  status: 'Vencida' | 'Em aberto' | 'Fechada'
  invoice_due_iso: string
}

interface Card {
  id: string
  name: string
  close_day: number
  due_day: number
}

export function Invoices() {
  const qc = useQueryClient()
  const [cardName, setCardName] = useState('')
  const [closeDay, setCloseDay] = useState(8)
  const [dueDay, setDueDay] = useState(15)
  const [paymentForm, setPaymentForm] = useState<{
    invoice_key: string
    card: string
    amount: number
    account: string
  } | null>(null)

  // Queries
  const invoices = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api.request('/invoices'),
  })

  const cards = useQuery({
    queryKey: ['cards'],
    queryFn: () => api.request('/cards'),
  })

  const accounts = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.request('/accounts'),
  })

  // Mutations
  const createCard = useMutation({
    mutationFn: () =>
      api.request('/cards', {
        method: 'POST',
        body: JSON.stringify({ name: cardName, close_day: closeDay, due_day: dueDay }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cards'] })
      setCardName('')
      setCloseDay(8)
      setDueDay(15)
    },
  })

  const payInvoice = useMutation({
    mutationFn: (payload: any) =>
      api.request('/invoices/pay', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setPaymentForm(null)
    },
  })

  // Data processing
  const invoiceList = (invoices.data || []) as Invoice[]
  const cardList = (cards.data || []) as Card[]
  const accountList = (accounts.data || []) as Array<{ id: string; name: string }>

  const groupByStatus = (status: string) => invoiceList.filter((i) => i.status === status)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Vencida':
        return { bg: '#fef2f2', border: '#fee2e2', color: '#dc2626', icon: '⚠️' }
      case 'Em aberto':
        return { bg: '#fffbeb', border: '#fcd34d', color: '#d97706', icon: '⏰' }
      case 'Fechada':
        return { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a', icon: '✅' }
      default:
        return { bg: '#f3f4f6', border: '#e5e7eb', color: '#6b7280', icon: '📋' }
    }
  }

  return (
    <div>
      <div className='card card-title'>
        <h2>💳 Faturas de Cartão</h2>
        <div className='muted'>Gerencie suas compras de crédito e pagamentos de faturas</div>
      </div>

      {/* Aviso informativo */}
      <div className='card' style={{ background: '#f0f9ff', borderLeft: '4px solid #0284c7' }}>
        <strong>💡 Como funciona:</strong>
        <ul style={{ marginTop: '8px', marginBottom: '0', paddingLeft: '20px', color: '#0c4a6e', fontSize: '0.95rem' }}>
          <li><strong>📝 Compras em Crédito:</strong> Você adiciona em <strong>Lançamentos</strong> → aparecem aqui automaticamente</li>
          <li><strong>📊 Cálculo de Fatura:</strong> Agrupa por cartão com base na data de fechamento e vencimento</li>
          <li><strong>💰 Pagamento:</strong> Clique em "Pagar" para registrar o pagamento da fatura</li>
        </ul>
      </div>

      {/* Seções por Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {['Vencida', 'Em aberto', 'Fechada'].map((status) => {
          const statusInvoices = groupByStatus(status)
          const colors = getStatusColor(status)

          return (
            <div key={status} className='card'>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.5rem' }}>{colors.icon}</span>
                <h3 style={{ margin: '0', color: colors.color }}>
                  {status} ({statusInvoices.length})
                </h3>
              </div>

              {statusInvoices.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {statusInvoices.map((inv) => (
                    <div
                      key={inv.invoice_key}
                      style={{
                        background: colors.bg,
                        border: `2px solid ${colors.border}`,
                        borderRadius: '10px',
                        padding: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{inv.invoice_key}</div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>
                            Vencimento: {new Date(inv.invoice_due_iso).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: colors.color }}>
                            R$ {inv.open.toFixed(2)}
                          </div>
                          {inv.purchases > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
                              Compras: R$ {inv.purchases.toFixed(2)}
                              {inv.payments > 0 && ` | Pagos: R$ ${inv.payments.toFixed(2)}`}
                            </div>
                          )}
                        </div>
                      </div>

                      {status !== 'Fechada' && (
                        <button
                          onClick={() =>
                            setPaymentForm({
                              invoice_key: inv.invoice_key,
                              card: inv.card,
                              amount: inv.open,
                              account: accountList[0]?.name || 'Conta Corrente',
                            })
                          }
                          style={{
                            width: '100%',
                            padding: '10px',
                            background: colors.color,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                          }}
                        >
                          {status === 'Vencida' ? '🚨 Pagar Agora' : '💳 Pagar Fatura'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px', fontSize: '0.95rem' }}>
                  Nenhuma fatura {status.toLowerCase()}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal de Pagamento */}
      {paymentForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setPaymentForm(null)}
        >
          <div
            className='card'
            style={{ maxWidth: '400px', width: '90%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className='card-title' style={{ marginBottom: '16px' }}>
              <strong>💳 Pagar Fatura</strong>
              <div className='muted'>{paymentForm.invoice_key}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>📊 Valor:</label>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#4f46e5', marginBottom: '8px' }}>
                  R$ {paymentForm.amount.toFixed(2)}
                </div>
                <input
                  type='number'
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  step='0.01'
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>🏦 Conta de Débito:</label>
                <select
                  value={paymentForm.account}
                  onChange={(e) => setPaymentForm({ ...paymentForm, account: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {accountList.map((acc) => (
                    <option key={acc.id} value={acc.name}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setPaymentForm(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    payInvoice.mutate({
                      card: paymentForm.card,
                      invoice_key: paymentForm.invoice_key,
                      amount: paymentForm.amount,
                      account: paymentForm.account,
                      method: 'Pix',
                    })
                  }}
                  disabled={payInvoice.isPending}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: payInvoice.isPending ? 'not-allowed' : 'pointer',
                    opacity: payInvoice.isPending ? 0.6 : 1,
                  }}
                >
                  {payInvoice.isPending ? '⏳ Processando...' : '✅ Confirmar Pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gerenciamento de Cartões */}
      <div className='card' style={{ marginTop: '24px' }}>
        <div className='card-title'>
          <strong>💳 Meus Cartões</strong>
          <div className='muted'>Adicione e configure seus cartões de crédito</div>
        </div>

        {cardList.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {cardList.map((card) => (
              <div
                key={card.id}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '16px',
                  borderRadius: '10px',
                  fontWeight: 600,
                }}
              >
                <div style={{ fontSize: '1.1rem', marginBottom: '12px' }}>{card.name}</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  📅 Fecha: dia {card.close_day} | 💰 Vence: dia {card.due_day}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <input
            type='text'
            placeholder='Nome do cartão'
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
          />
          <input
            type='number'
            min='1'
            max='31'
            placeholder='Dia de fechamento'
            value={closeDay}
            onChange={(e) => setCloseDay(Number(e.target.value))}
          />
          <input
            type='number'
            min='1'
            max='31'
            placeholder='Dia de vencimento'
            value={dueDay}
            onChange={(e) => setDueDay(Number(e.target.value))}
          />
        </div>

        <button
          onClick={() => createCard.mutate()}
          disabled={createCard.isPending || !cardName}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '12px',
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: createCard.isPending || !cardName ? 'not-allowed' : 'pointer',
            opacity: createCard.isPending || !cardName ? 0.6 : 1,
          }}
        >
          {createCard.isPending ? '⏳ Adicionando...' : '➕ Adicionar Cartão'}
        </button>
      </div>
    </div>
  )
}
