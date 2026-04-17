import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
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

interface InvoiceTx {
  id: string
  date: string
  description: string
  amount: number
  method: string
  kind: string
  direction: string
  category: string
  installment_index?: number
  installment_count?: number
}

type ActiveTab = 'Vencida' | 'Em aberto' | 'Fechada'

const TAB_CONFIG: Record<ActiveTab, { color: string; bg: string; border: string; icon: string; emptyMsg: string }> = {
  Vencida: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '🚨', emptyMsg: 'Nenhuma fatura vencida' },
  'Em aberto': { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', icon: '⏳', emptyMsg: 'Nenhuma fatura em aberto' },
  Fechada: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: '✅', emptyMsg: 'Nenhuma fatura fechada' },
}

const PAYMENT_METHODS = [
  { key: 'Pix', label: 'Pix', icon: '🔵' },
  { key: 'Débito', label: 'Débito', icon: '💳' },
  { key: 'Dinheiro', label: 'Dinheiro', icon: '💵' },
  { key: 'Transferência', label: 'Transferência', icon: '🏦' },
]

export function Invoices() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<ActiveTab>('Vencida')
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)

  const [paymentForm, setPaymentForm] = useState<{
    invoice_key: string
    card: string
    amount: number
    account: string
    account_id?: string
    card_account_id?: string
    method: string
  } | null>(null)

  const [editForm, setEditForm] = useState<{
    invoice_key: string
    card: string
    target_month: string
    original_month: string
  } | null>(null)

  const invoices = useQuery({ queryKey: ['invoices'], queryFn: () => api.request('/invoices') })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.request('/accounts') })

  const invoiceTransactions = useQuery({
    queryKey: ['invoice-tx', expandedInvoice],
    queryFn: () => api.request(`/invoices/transactions?invoice_key=${encodeURIComponent(expandedInvoice!)}`),
    enabled: !!expandedInvoice,
  })

  const payInvoice = useMutation({
    mutationFn: (payload: any) => api.request('/invoices/pay', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['tx'] })
      qc.invalidateQueries({ queryKey: ['invoice-tx'] })
      setPaymentForm(null)
    },
  })

  const reassignInvoice = useMutation({
    mutationFn: (payload: { invoice_key: string; target_month: string }) =>
      api.request('/invoices/reassign', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['tx'] })
      qc.invalidateQueries({ queryKey: ['invoice-tx'] })
      setEditForm(null)
    },
  })

  const invoiceList = (invoices.data || []) as Invoice[]
  const accountList = (accounts.data || []) as Array<{ id: string; name: string; card_types?: string[] }>
  const debitAccounts = accountList.filter((a) => !(a.card_types || []).every((t) => t === 'Crédito'))

  const summary = useMemo(() => {
    const s = { vencidas: 0, vencidasTotal: 0, abertas: 0, abertasTotal: 0, fechadas: 0, fechadasTotal: 0 }
    for (const inv of invoiceList) {
      if (inv.status === 'Vencida') { s.vencidas++; s.vencidasTotal += inv.open }
      else if (inv.status === 'Em aberto') { s.abertas++; s.abertasTotal += inv.open }
      else { s.fechadas++; s.fechadasTotal += inv.purchases }
    }
    return s
  }, [invoiceList])

  const tabInvoices = invoiceList.filter((i) => i.status === activeTab)
  const tabColors = TAB_CONFIG[activeTab]
  const txList = (invoiceTransactions.data || []) as InvoiceTx[]

  const toggleExpand = (key: string) => {
    setExpandedInvoice((prev) => (prev === key ? null : key))
  }

  const openPayment = (inv: Invoice) => {
    const defaultDebit = debitAccounts[0] || accountList[0]
    const creditAcc = accountList.find((acc) => acc.name === inv.card)
    setPaymentForm({
      invoice_key: inv.invoice_key,
      card: inv.card,
      card_account_id: creditAcc?.id,
      amount: inv.open,
      account: defaultDebit?.name || '',
      account_id: defaultDebit?.id,
      method: 'Pix',
    })
  }

  const openEdit = (inv: Invoice) => {
    const currentMonth = (inv.invoice_due_iso || '').slice(0, 7)
    setEditForm({
      invoice_key: inv.invoice_key,
      card: inv.card,
      original_month: currentMonth,
      target_month: currentMonth,
    })
  }

  const fmt = (v: number) => `R$ ${v.toFixed(2)}`

  return (
    <div>
      {/* Header */}
      <div className='card card-title'>
        <h2>Faturas de Cartao</h2>
        <div className='muted'>Gerencie, pague e acompanhe suas faturas de credito</div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {([
          { label: 'Vencidas', count: summary.vencidas, total: summary.vencidasTotal, color: '#dc2626', bg: '#fef2f2', icon: '🚨' },
          { label: 'Em aberto', count: summary.abertas, total: summary.abertasTotal, color: '#d97706', bg: '#fffbeb', icon: '⏳' },
          { label: 'Fechadas', count: summary.fechadas, total: summary.fechadasTotal, color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
        ] as const).map((s) => (
          <div key={s.label} className='card' style={{ background: s.bg, borderLeft: `4px solid ${s.color}`, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: 600 }}>{s.icon} {s.label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color, marginTop: '4px' }}>{fmt(s.total)}</div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color, opacity: 0.3 }}>{s.count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className='card' style={{ display: 'flex', gap: '0', padding: '0', overflow: 'hidden' }}>
        {(['Vencida', 'Em aberto', 'Fechada'] as ActiveTab[]).map((tab) => {
          const cfg = TAB_CONFIG[tab]
          const count = invoiceList.filter((i) => i.status === tab).length
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '14px 16px',
                border: 'none',
                borderBottom: isActive ? `3px solid ${cfg.color}` : '3px solid transparent',
                background: isActive ? cfg.bg : 'transparent',
                color: isActive ? cfg.color : '#6b7280',
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <span>{cfg.icon}</span>
              <span>{tab}</span>
              <span style={{
                background: isActive ? cfg.color : '#e5e7eb',
                color: isActive ? 'white' : '#6b7280',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Invoice list for active tab */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tabInvoices.length === 0 && (
          <div className='card' style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{tabColors.icon}</div>
            <div style={{ fontSize: '1rem' }}>{tabColors.emptyMsg}</div>
          </div>
        )}

        {tabInvoices.map((inv) => {
          const isExpanded = expandedInvoice === inv.invoice_key
          const paidPercent = inv.purchases > 0 ? Math.min(100, (inv.payments / inv.purchases) * 100) : 0
          const cardName = inv.invoice_key.split('|')[0]
          const dueMonth = inv.invoice_key.split('|')[1] || ''

          return (
            <div key={inv.invoice_key} className='card' style={{ padding: 0, overflow: 'hidden', border: `2px solid ${tabColors.border}` }}>
              {/* Card header */}
              <div
                style={{
                  padding: '16px 20px',
                  background: tabColors.bg,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                }}
                onClick={() => toggleExpand(inv.invoice_key)}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>{cardName}</span>
                    <span style={{
                      background: tabColors.color,
                      color: 'white',
                      padding: '2px 10px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}>{dueMonth}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    Vencimento: {new Date(inv.invoice_due_iso + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: tabColors.color }}>{fmt(inv.open)}</div>
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>em aberto</div>
                </div>

                <div style={{ fontSize: '1.2rem', color: '#9ca3af', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: '4px', background: '#e5e7eb' }}>
                <div style={{ height: '100%', width: `${paidPercent}%`, background: paidPercent >= 100 ? '#16a34a' : tabColors.color, transition: 'width 0.3s' }} />
              </div>

              {/* Summary row */}
              <div style={{ padding: '12px 20px', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.88rem', color: '#475569', borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none' }}>
                <div>Compras: <strong>{fmt(inv.purchases)}</strong></div>
                <div>Pagos: <strong style={{ color: '#16a34a' }}>{fmt(inv.payments)}</strong></div>
                <div>Aberto: <strong style={{ color: tabColors.color }}>{fmt(inv.open)}</strong></div>
                <div style={{ marginLeft: 'auto', color: '#9ca3af' }}>{paidPercent.toFixed(0)}% pago</div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{ padding: '16px 20px' }}>
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {inv.open > 0 && (
                      <button
                        onClick={() => openPayment(inv)}
                        style={{
                          padding: '10px 20px',
                          background: activeTab === 'Vencida' ? '#dc2626' : '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                        }}
                      >
                        {activeTab === 'Vencida' ? '🚨 Pagar Agora' : '💰 Pagar Fatura'}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(inv)}
                      style={{
                        padding: '10px 20px',
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      📅 Mover Fatura
                    </button>
                  </div>

                  {/* Transactions list */}
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6b7280', marginBottom: '8px' }}>
                    Lancamentos desta fatura
                  </div>

                  {invoiceTransactions.isLoading && (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#9ca3af' }}>Carregando...</div>
                  )}

                  {!invoiceTransactions.isLoading && txList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#9ca3af' }}>Nenhum lancamento encontrado</div>
                  )}

                  {txList.length > 0 && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Data</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Descricao</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Tipo</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {txList.map((t) => {
                            const isPay = t.kind === 'PagamentoFatura'
                            return (
                              <tr key={t.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '8px 12px', color: '#6b7280' }}>{t.date}</td>
                                <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>
                                  {t.description}
                                  {t.installment_count && t.installment_count >= 2 && (
                                    <span style={{ marginLeft: '6px', background: '#eef2ff', color: '#4f46e5', padding: '1px 6px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                                      {t.installment_index}/{t.installment_count}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  <span style={{
                                    background: isPay ? '#f0fdf4' : '#eef2ff',
                                    color: isPay ? '#16a34a' : '#4f46e5',
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                  }}>
                                    {isPay ? '💰 Pagamento' : '💳 Compra'}
                                  </span>
                                </td>
                                <td style={{
                                  padding: '8px 12px',
                                  textAlign: 'right',
                                  fontWeight: 600,
                                  color: isPay ? '#16a34a' : '#ef4444',
                                }}>
                                  {isPay ? '- ' : '+ '}{fmt(t.amount)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Payment Modal */}
      {paymentForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setPaymentForm(null)}>
          <div className='card' style={{ maxWidth: '480px', width: '90%', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Pagar Fatura</h3>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{paymentForm.invoice_key}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Amount */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Valor do pagamento</label>
                <input
                  type='number'
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  step='0.01'
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem' }}
                />
              </div>

              {/* Payment method */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Forma de pagamento</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {PAYMENT_METHODS.map((m) => {
                    const active = paymentForm.method === m.key
                    return (
                      <button
                        key={m.key}
                        onClick={() => setPaymentForm({ ...paymentForm, method: m.key })}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: active ? '2px solid #10b981' : '1px solid #e5e7eb',
                          background: active ? '#f0fdf4' : 'white',
                          color: active ? '#059669' : '#6b7280',
                          cursor: 'pointer',
                          fontWeight: 600,
                          textAlign: 'left',
                          fontSize: '0.9rem',
                        }}
                      >
                        {m.icon} {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Debit account */}
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px', fontSize: '0.9rem' }}>Conta de debito</label>
                <select
                  value={paymentForm.account}
                  onChange={(e) => {
                    const acc = accountList.find((a) => a.name === e.target.value)
                    setPaymentForm({ ...paymentForm, account: e.target.value, account_id: acc?.id })
                  }}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                >
                  {(debitAccounts.length > 0 ? debitAccounts : accountList).map((acc) => (
                    <option key={acc.id} value={acc.name}>{acc.name}</option>
                  ))}
                </select>
              </div>

              {payInvoice.isError && (
                <div style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '10px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#991b1b' }}>
                  {(payInvoice.error as Error)?.message || 'Erro ao processar pagamento'}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={() => setPaymentForm(null)}
                  style={{ flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => payInvoice.mutate({
                    card: paymentForm.card,
                    card_account_id: paymentForm.card_account_id,
                    invoice_key: paymentForm.invoice_key,
                    amount: paymentForm.amount,
                    account: paymentForm.account,
                    account_id: paymentForm.account_id,
                    method: paymentForm.method,
                  })}
                  disabled={payInvoice.isPending || paymentForm.amount <= 0}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: payInvoice.isPending || paymentForm.amount <= 0 ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: payInvoice.isPending || paymentForm.amount <= 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {payInvoice.isPending ? 'Processando...' : 'Confirmar Pagamento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Month Modal */}
      {editForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditForm(null)}>
          <div className='card' style={{ maxWidth: '420px', width: '90%', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Mover Fatura</h3>
              <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{editForm.invoice_key}</div>
            </div>

            <div style={{ background: '#fffbeb', borderLeft: '4px solid #d97706', padding: '10px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#92400e', marginBottom: '16px' }}>
              Move todas as compras e pagamentos desta fatura para o mes de vencimento escolhido.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Novo mes de vencimento</label>
                <input
                  type='month'
                  value={editForm.target_month}
                  onChange={(e) => setEditForm({ ...editForm, target_month: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
                {editForm.original_month && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '6px' }}>
                    Mes atual: <strong>{editForm.original_month}</strong>
                  </div>
                )}
              </div>

              {reassignInvoice.isError && (
                <div style={{ background: '#fef2f2', borderLeft: '4px solid #dc2626', padding: '10px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#991b1b' }}>
                  {(reassignInvoice.error as Error)?.message || 'Erro ao atualizar a fatura'}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setEditForm(null)}
                  style={{ flex: 1, padding: '12px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => reassignInvoice.mutate({ invoice_key: editForm.invoice_key, target_month: editForm.target_month })}
                  disabled={reassignInvoice.isPending || !editForm.target_month || editForm.target_month === editForm.original_month}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: reassignInvoice.isPending || !editForm.target_month || editForm.target_month === editForm.original_month ? '#9ca3af' : '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: reassignInvoice.isPending || !editForm.target_month || editForm.target_month === editForm.original_month ? 'not-allowed' : 'pointer',
                  }}
                >
                  {reassignInvoice.isPending ? 'Atualizando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
