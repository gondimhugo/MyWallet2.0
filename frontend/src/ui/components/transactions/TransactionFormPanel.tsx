import type { Account } from '../../types'
import {
  type CreationMode,
  type TransactionForm,
  type ModeMeta,
  CASH_METHODS,
  ENTRY_METHODS,
} from '../../types/transactions'

interface Props {
  mode: CreationMode
  form: TransactionForm
  onFormChange: (form: TransactionForm) => void
  installmentEnabled: boolean
  onInstallmentEnabledChange: (enabled: boolean) => void
  installmentCount: number
  onInstallmentCountChange: (count: number) => void
  sourceAccounts: Account[]
  currentMeta: ModeMeta
  canSubmit: boolean
  isPending: boolean
  error: Error | null
  onSubmit: () => void
}

export function TransactionFormPanel({
  mode,
  form,
  onFormChange,
  installmentEnabled,
  onInstallmentEnabledChange,
  installmentCount,
  onInstallmentCountChange,
  sourceAccounts,
  currentMeta,
  canSubmit,
  isPending,
  error,
  onSubmit,
}: Props) {
  return (
    <div className='card' style={{ borderTop: `4px solid ${currentMeta.color}` }}>
      <div className='card-title' style={{ marginBottom: '12px' }}>
        <strong style={{ color: currentMeta.color }}>
          {currentMeta.icon} Dados — {currentMeta.label}
        </strong>
      </div>

      {mode === 'salario' && (
        <div
          style={{
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            color: '#9a3412',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '12px',
            fontSize: '0.9rem',
          }}
        >
          ⚠️ Salários são melhor cadastrados na página de <strong>Salário</strong> para lançamento automático. Use esta opção só
          para lançar um salário manualmente.
        </div>
      )}

      {/* Data e Valor */}
      <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: 600 }}>📅 Data</label>
          <input type='date' value={form.date} onChange={(e) => onFormChange({ ...form, date: e.target.value })} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontWeight: 600 }}>💰 Valor</label>
          <input
            type='number'
            step='0.01'
            value={form.amount || ''}
            onChange={(e) => onFormChange({ ...form, amount: Number(e.target.value) })}
            placeholder='0.00'
          />
        </div>
      </div>

      {/* Método de pagamento */}
      {(mode === 'compra-avista' || mode === 'entrada' || mode === 'salario') && (
        <div style={{ marginTop: '16px' }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            🔄 {mode === 'entrada' || mode === 'salario' ? 'Como você recebeu' : 'Forma de pagamento'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            {Object.entries(mode === 'entrada' || mode === 'salario' ? ENTRY_METHODS : CASH_METHODS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => onFormChange({ ...form, method: key })}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: form.method === key ? `2px solid ${currentMeta.color}` : '1px solid #e5e7eb',
                  background: form.method === key ? currentMeta.bg : 'white',
                  color: form.method === key ? currentMeta.color : '#6b7280',
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
      )}

      {/* Modo crédito */}
      {mode === 'compra-credito' && (
        <>
          <div
            style={{
              marginTop: '16px',
              background: '#eef2ff',
              color: '#3730a3',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.9rem',
            }}
          >
            💳 Forma de pagamento: <strong>Crédito</strong> — a compra entrará na próxima fatura do cartão selecionado.
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>🧩 Parcelamento</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => onInstallmentEnabledChange(false)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: !installmentEnabled ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                  background: !installmentEnabled ? '#eef2ff' : 'white',
                  color: !installmentEnabled ? '#4f46e5' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                💳 À vista (1x)
              </button>
              <button
                onClick={() => onInstallmentEnabledChange(true)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: installmentEnabled ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                  background: installmentEnabled ? '#eef2ff' : 'white',
                  color: installmentEnabled ? '#4f46e5' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🧩 Parcelado
              </button>
            </div>

            {installmentEnabled && (
              <div
                style={{
                  marginTop: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 600 }}>Nº de parcelas:</label>
                  <input
                    type='number'
                    min={2}
                    max={48}
                    value={installmentCount}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      if (Number.isFinite(v)) onInstallmentCountChange(Math.max(2, Math.min(48, Math.round(v))))
                    }}
                    style={{ width: '100px', padding: '8px', borderRadius: '6px' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[2, 3, 6, 10, 12].map((n) => (
                      <button
                        key={n}
                        onClick={() => onInstallmentCountChange(n)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: installmentCount === n ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                          background: installmentCount === n ? '#eef2ff' : 'white',
                          color: installmentCount === n ? '#4f46e5' : '#6b7280',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                        }}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>
                {form.amount > 0 && installmentCount >= 2 && (
                  <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                    💰 Total <strong>R$ {form.amount.toFixed(2)}</strong> em{' '}
                    <strong>{installmentCount}x</strong> de{' '}
                    <strong>R$ {(form.amount / installmentCount).toFixed(2)}</strong>
                    <span style={{ color: '#64748b' }}> · cada parcela cairá em uma fatura mensal consecutiva.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Conta / Cartão */}
      <div style={{ marginTop: '16px' }}>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
          {mode === 'compra-credito' ? '💳 Cartão de Crédito' : '🏦 Conta bancária'}
        </label>
        {sourceAccounts.length > 0 ? (
          <select
            value={form.account}
            onChange={(e) => onFormChange({ ...form, account: e.target.value })}
            style={{ padding: '10px', borderRadius: '8px', width: '100%', maxWidth: '420px' }}
          >
            {sourceAccounts.map((acc) => (
              <option key={acc.id || acc.name} value={acc.name}>
                {acc.name}
                {mode === 'compra-credito' ? ` — limite R$ ${(acc.credit_limit || 0).toFixed(2)}` : ''}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ color: '#dc2626', fontSize: '0.9rem' }}>
            ⚠️{' '}
            {mode === 'compra-credito'
              ? 'Nenhum cartão com crédito configurado. Cadastre em Contas.'
              : 'Nenhuma conta cadastrada. Cadastre em Contas.'}
          </div>
        )}
      </div>

      {/* Descrição e Categoria */}
      <div style={{ marginTop: '16px' }}>
        <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 600 }}>📝 Descrição</label>
            <input
              type='text'
              value={form.description}
              onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              placeholder={
                mode === 'compra-credito'
                  ? 'Ex: Mercado, Netflix, Roupa...'
                  : mode === 'entrada'
                    ? 'Ex: Reembolso, Venda, Transferência recebida...'
                    : mode === 'salario'
                      ? 'Ex: Salário Empresa X'
                      : 'Ex: Supermercado, Farmácia, Uber...'
              }
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 600 }}>📂 Categoria</label>
            <input
              type='text'
              value={form.category}
              onChange={(e) => onFormChange({ ...form, category: e.target.value })}
              placeholder='Ex: Alimentação, Lazer, Salário...'
            />
          </div>
        </div>
      </div>

      {/* Notas */}
      <div style={{ marginTop: '16px' }}>
        <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>📌 Notas (opcional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
          placeholder='Notas adicionais...'
          style={{ padding: '10px', borderRadius: '8px', minHeight: '70px', width: '100%' }}
        />
      </div>

      {/* Ação */}
      <div style={{ marginTop: '18px' }}>
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isPending}
          className='btn'
          style={{
            background: canSubmit ? currentMeta.color : '#9ca3af',
            color: 'white',
            padding: '12px 24px',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: !canSubmit || isPending ? 'not-allowed' : 'pointer',
            opacity: !canSubmit || isPending ? 0.7 : 1,
          }}
        >
          {isPending
            ? '⏳ Salvando...'
            : mode === 'compra-credito' && installmentEnabled && installmentCount >= 2
              ? `✅ Salvar ${installmentCount}x parcelas`
              : `✅ Salvar ${currentMeta.label}`}
        </button>
        {error && (
          <div style={{ marginTop: '8px', color: '#dc2626', fontSize: '0.9rem' }}>
            ⚠️ {error.message || 'Erro ao salvar lançamento'}
          </div>
        )}
      </div>
    </div>
  )
}
