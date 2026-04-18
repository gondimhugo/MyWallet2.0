import { categorizeTransaction, MODE_META } from '../../types/transactions'

interface Props {
  transactions: any[]
  onRemove: (id: string) => void
  isRemoving: boolean
}

export function TransactionTable({ transactions, onRemove, isRemoving }: Props) {
  return (
    <div className='card' style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>📅 Data</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>🏷️ Tipo</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>📝 Descrição</th>
            <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>💰 Valor</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>🔄 Método</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>📂 Categoria</th>
            <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>💳 Fatura</th>
            <th style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>🗑️</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length > 0 ? (
            transactions.map((t: any) => {
              const cat = categorizeTransaction(t)
              const meta = MODE_META[cat]
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px' }}>{t.date}</td>
                  <td style={{ padding: '12px' }}>
                    <span
                      style={{
                        background: meta.bg,
                        color: meta.color,
                        padding: '3px 8px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {meta.icon} {meta.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#0f172a', fontWeight: 500 }}>
                    {t.description}
                    {t.installment_count && t.installment_count >= 2 && (
                      <span
                        style={{
                          marginLeft: '8px',
                          background: '#eef2ff',
                          color: '#4f46e5',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        🧩 {t.installment_index}/{t.installment_count}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '12px',
                      textAlign: 'right',
                      fontWeight: 700,
                      color: t.direction === 'Entrada' ? '#10b981' : '#ef4444',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.direction === 'Entrada' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px', fontSize: '0.9rem' }}>{t.method}</td>
                  <td style={{ padding: '12px', color: '#6b7280' }}>{t.category || '—'}</td>
                  <td style={{ padding: '12px', fontSize: '0.85rem', color: '#6b7280' }}>{t.invoice_key || '—'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      className='btn'
                      onClick={() => t.id && onRemove(t.id)}
                      disabled={!t.id || isRemoving}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        padding: '6px 10px',
                        fontSize: '0.85rem',
                        opacity: !t.id || isRemoving ? 0.6 : 1,
                        cursor: !t.id || isRemoving ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isRemoving ? '...' : 'Remover'}
                    </button>
                  </td>
                </tr>
              )
            })
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
  )
}
