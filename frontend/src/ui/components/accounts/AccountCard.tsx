import type { Account } from '../../types'
import { formatBRL } from '../../types'
import { BANK_OPTIONS } from '../../types/accounts'

interface Props {
  account: Account
  editingId: string | null
  onEdit: (acc: Account) => void
  onRemove: (id: string) => void
  isRemoving: boolean
  isUpdating: boolean
}

export function AccountCard({ account: acc, editingId, onEdit, onRemove, isRemoving, isUpdating }: Props) {
  const bank =
    BANK_OPTIONS.find((b) => b.code === acc.bank) ||
    BANK_OPTIONS.find((b) => b.name.toLowerCase() === (acc.bank || '').toLowerCase()) ||
    BANK_OPTIONS[BANK_OPTIONS.length - 1]

  const cardTypes = acc.card_types || []
  const hasCreditOnCard = cardTypes.includes('Crédito') || (acc.credit_limit || 0) > 0
  const isOnlyCredit = cardTypes.length > 0 && cardTypes.every((t) => t === 'Crédito')
  const hasDebit = !isOnlyCredit
  const balance = acc.balance || 0
  const limit = acc.credit_limit || 0
  const used = acc.credit_used || 0
  const available = acc.credit_available ?? (limit - used)

  return (
    <div className='account-card' style={{ borderTop: `4px solid ${bank.color}` }}>
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

      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
        <button
          className='btn'
          onClick={() => onEdit(acc)}
          disabled={!acc.id || isRemoving || isUpdating}
          style={{
            background: '#4f46e5',
            color: 'white',
            flex: 1,
            opacity: !acc.id || isRemoving || isUpdating ? 0.6 : 1,
          }}
        >
          {editingId === acc.id ? '✏️ Editando...' : '✏️ Editar'}
        </button>
        <button
          className='btn'
          onClick={() => acc.id && onRemove(acc.id)}
          disabled={!acc.id || isRemoving}
          style={{
            background: '#ef4444',
            color: 'white',
            flex: 1,
            opacity: !acc.id || isRemoving ? 0.6 : 1,
          }}
        >
          {isRemoving ? '⏳ Removendo...' : '🗑️ Remover'}
        </button>
      </div>
    </div>
  )
}
