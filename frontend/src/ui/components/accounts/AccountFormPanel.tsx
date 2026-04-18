import type { RefObject } from 'react'
import type { AccountForm } from '../../types/accounts'
import { BANK_OPTIONS, CARD_TYPES, ACCOUNT_TYPES } from '../../types/accounts'

interface Props {
  form: AccountForm
  onFormChange: (form: AccountForm) => void
  formRef: RefObject<HTMLDivElement | null>
  isEditing: boolean
  hasCredit: boolean
  isValid: boolean
  isPending: boolean
  onSubmit: () => void
  onCancel: () => void
  onToggleCardType: (type: string) => void
}

export function AccountFormPanel({
  form,
  onFormChange,
  formRef,
  isEditing,
  hasCredit,
  isValid,
  isPending,
  onSubmit,
  onCancel,
  onToggleCardType,
}: Props) {
  return (
    <div className='card' ref={formRef}>
      <div className='card-title'>
        <strong>{isEditing ? '✏️ Editar Conta Bancária' : '➕ Nova Conta Bancária'}</strong>
        <div className='muted'>
          {isEditing ? 'Atualize os dados da conta e salve as alterações' : 'Selecione o banco e configure a conta'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <label style={{ fontWeight: 600 }}>🏦 Selecione o Banco:</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
          {BANK_OPTIONS.map((bank) => (
            <button
              key={bank.code}
              onClick={() => onFormChange({ ...form, bank: bank.code })}
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
            onChange={(e) => onFormChange({ ...form, customName: e.target.value })}
            placeholder='Ex: Cooperativa XYZ'
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        <label style={{ fontWeight: 600 }}>📊 Tipo de Conta:</label>
        <select
          value={form.accountType}
          onChange={(e) => onFormChange({ ...form, accountType: e.target.value as AccountForm['accountType'] })}
        >
          {ACCOUNT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: '10px' }}>💳 Funcionalidades da Conta:</label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {CARD_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onToggleCardType(type)}
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
              <input
                type='number'
                step='0.01'
                value={form.creditLimit}
                onChange={(e) => onFormChange({ ...form, creditLimit: Number(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Fechamento</label>
              <input
                type='number'
                min='1'
                max='31'
                value={form.closeDay}
                onChange={(e) => onFormChange({ ...form, closeDay: Number(e.target.value) })}
              />
            </div>
            <div>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>Vencimento</label>
              <input
                type='number'
                min='1'
                max='31'
                value={form.dueDay}
                onChange={(e) => onFormChange({ ...form, dueDay: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>🗒️ Observação:</label>
        <textarea
          value={form.notes}
          onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
          placeholder='Ex: conta para viagem, conta salário...'
          style={{ width: '100%', minHeight: '70px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={onSubmit}
          disabled={isPending || !isValid}
          className='btn'
          style={{
            background: isEditing ? '#4f46e5' : '#10b981',
            color: 'white',
            opacity: isPending || !isValid ? 0.6 : 1,
          }}
        >
          {isEditing
            ? isPending ? '⏳ Salvando...' : '💾 Salvar Alterações'
            : isPending ? '⏳ Salvando...' : '✅ Salvar Conta'}
        </button>
        {isEditing && (
          <button
            onClick={onCancel}
            disabled={isPending}
            className='btn'
            style={{ background: '#6b7280', color: 'white', opacity: isPending ? 0.6 : 1 }}
          >
            ✖️ Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
