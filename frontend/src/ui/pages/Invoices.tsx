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

export function Invoices() {
  const qc = useQueryClient()
  const [paymentForm, setPaymentForm] = useState<{
    invoice_key: string
    card: string
    amount: number
    account: string
  } | null>(null)

  const invoices = useQuery({ queryKey: ['invoices'], queryFn: () => api.request('/invoices') })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.request('/accounts') })

  const payInvoice = useMutation({
    mutationFn: (payload: any) => api.request('/invoices/pay', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['tx'] })
      setPaymentForm(null)
    },
  })

  const invoiceList = (invoices.data || []) as Invoice[]
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
        <div className='muted'>Gerencie compras de crédito e pagamentos</div>
      </div>

      <div className='card' style={{ background: '#f0f9ff', borderLeft: '4px solid #0284c7' }}>
        <strong>💡 Como funciona:</strong>
        <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px', color: '#0c4a6e', fontSize: '0.95rem' }}>
          <li>Compras no crédito feitas em <strong>Lançamentos</strong> aparecem aqui automaticamente.</li>
          <li>Configuração de cartão (limite, fechamento e vencimento) agora é feita em <strong>Contas</strong>.</li>
          <li>Use o botão de pagar para registrar baixa da fatura.</li>
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {['Vencida', 'Em aberto', 'Fechada'].map((status) => {
          const statusInvoices = groupByStatus(status)
          const colors = getStatusColor(status)
          return (
            <div key={status} className='card'>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '1.5rem' }}>{colors.icon}</span>
                <h3 style={{ margin: 0, color: colors.color }}>{status} ({statusInvoices.length})</h3>
              </div>

              {statusInvoices.length === 0 && (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px', fontSize: '0.95rem' }}>
                  Nenhuma fatura {status.toLowerCase()}
                </div>
              )}

              {statusInvoices.map((inv) => (
                <div key={inv.invoice_key} style={{ background: colors.bg, border: `2px solid ${colors.border}`, borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{inv.invoice_key}</div>
                      <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>
                        Vencimento: {new Date(inv.invoice_due_iso).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: colors.color }}>R$ {inv.open.toFixed(2)}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '10px' }}>
                    Cartão: <strong>{inv.card}</strong> · Compras: R$ {inv.purchases.toFixed(2)} · Pagos: R$ {inv.payments.toFixed(2)}
                  </div>

                  {inv.open > 0 && (
                    <button
                      onClick={() => setPaymentForm({
                        invoice_key: inv.invoice_key,
                        card: inv.card,
                        amount: inv.open,
                        account: accountList[0]?.name || 'Conta Corrente',
                      })}
                      style={{ width: '100%', padding: '10px', background: colors.color, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {status === 'Vencida' ? '🚨 Pagar Agora' : '💳 Pagar Fatura'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {paymentForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setPaymentForm(null)}>
          <div className='card' style={{ maxWidth: '400px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className='card-title' style={{ marginBottom: '16px' }}>
              <strong>💳 Pagar Fatura</strong>
              <div className='muted'>{paymentForm.invoice_key}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>📊 Valor:</label>
                <input type='number' value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })} step='0.01' style={{ width: '100%' }} />
              </div>

              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>🏦 Conta de Débito:</label>
                <select value={paymentForm.account} onChange={(e) => setPaymentForm({ ...paymentForm, account: e.target.value })} style={{ width: '100%' }}>
                  {accountList.map((acc) => (
                    <option key={acc.id} value={acc.name}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setPaymentForm(null)} style={{ flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button
                  onClick={() => payInvoice.mutate({ card: paymentForm.card, invoice_key: paymentForm.invoice_key, amount: paymentForm.amount, account: paymentForm.account, method: 'Pix' })}
                  disabled={payInvoice.isPending}
                  style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: payInvoice.isPending ? 'not-allowed' : 'pointer', opacity: payInvoice.isPending ? 0.6 : 1 }}
                >
                  {payInvoice.isPending ? '⏳ Processando...' : '✅ Confirmar Pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
