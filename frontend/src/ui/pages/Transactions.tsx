import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'

type EntryMode = 'compra-avista' | 'compra-credito' | 'entrada' | 'pagamento-fatura' | 'salario'

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

const CASH_METHODS: Record<string, string> = {
  Pix: '🔵 Pix',
  Débito: '💳 Débito',
  Dinheiro: '💵 Dinheiro',
  Transferência: '🏦 Transferência',
}

const ENTRY_METHODS: Record<string, string> = {
  Pix: '🔵 Pix',
  Transferência: '🏦 Transferência',
  Dinheiro: '💵 Dinheiro',
  Débito: '💳 Débito',
}

const initial: TransactionForm = {
  date: new Date().toISOString().slice(0, 10),
  direction: 'Saída',
  amount: 0,
  method: 'Pix',
  account: '',
  card: '',
  kind: 'Normal',
  category: '',
  subcategory: '',
  description: '',
  notes: '',
}

const MODE_META: Record<EntryMode, { label: string; icon: string; color: string; bg: string; helper: string }> = {
  'compra-avista': {
    label: 'Compra à vista',
    icon: '🛒',
    color: '#0f766e',
    bg: '#ecfdf5',
    helper: 'Pagamento imediato com Pix, Débito, Dinheiro ou Transferência. Debita na hora do saldo da conta.',
  },
  'compra-credito': {
    label: 'Compra no Crédito',
    icon: '💳',
    color: '#4f46e5',
    bg: '#eef2ff',
    helper: 'Compra parcelada/no cartão. Será lançada automaticamente em uma fatura e consome o limite do cartão.',
  },
  entrada: {
    label: 'Entrada (recebi)',
    icon: '⬇️',
    color: '#059669',
    bg: '#f0fdf4',
    helper: 'Qualquer valor que entrou na conta (reembolso, transferência recebida, venda, etc.). Para salário use a aba dedicada.',
  },
  'pagamento-fatura': {
    label: 'Pagamento de Fatura',
    icon: '🧾',
    color: '#b45309',
    bg: '#fffbeb',
    helper: 'Registre manualmente o pagamento de uma fatura de cartão. Em geral prefira a página de Faturas.',
  },
  salario: {
    label: 'Salário',
    icon: '💰',
    color: '#047857',
    bg: '#ecfdf5',
    helper: 'Salários recorrentes devem ser cadastrados na página de Salário para serem lançados automaticamente.',
  },
}

function categorizeTransaction(t: any): EntryMode {
  if (t.kind === 'Salario') return 'salario'
  if (t.kind === 'PagamentoFatura') return 'pagamento-fatura'
  if (t.direction === 'Entrada') return 'entrada'
  if (t.method === 'Crédito') return 'compra-credito'
  return 'compra-avista'
}

export function Transactions() {
  const [mode, setMode] = useState<EntryMode>('compra-avista')
  const [form, setForm] = useState<TransactionForm>(initial)
  const [filterMode, setFilterMode] = useState<'all' | EntryMode>('all')
  const [installmentEnabled, setInstallmentEnabled] = useState(false)
  const [installmentCount, setInstallmentCount] = useState(2)
  const qc = useQueryClient()

  const tx = useQuery({ queryKey: ['tx'], queryFn: () => api.request('/transactions') })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.request('/accounts') })

  const accountList = (accounts.data || []) as Array<{
    id: string
    name: string
    card_types?: string[]
    credit_limit?: number
    close_day?: number | null
    due_day?: number | null
  }>
  const creditAccountList = accountList.filter(
    (a) => (a.credit_limit || 0) > 0 || (a.card_types || []).includes('Crédito') || (!!a.close_day && !!a.due_day),
  )

  // Ajusta o form quando muda o modo
  useEffect(() => {
    setForm((prev) => {
      const next = { ...prev }
      switch (mode) {
        case 'compra-avista':
          next.direction = 'Saída'
          next.kind = 'Normal'
          if (next.method === 'Crédito' || !Object.keys(CASH_METHODS).includes(next.method)) {
            next.method = 'Pix'
          }
          break
        case 'compra-credito':
          next.direction = 'Saída'
          next.kind = 'Normal'
          next.method = 'Crédito'
          break
        case 'entrada':
          next.direction = 'Entrada'
          next.kind = 'Normal'
          if (next.method === 'Crédito') next.method = 'Pix'
          break
        case 'pagamento-fatura':
          next.direction = 'Saída'
          next.kind = 'PagamentoFatura'
          if (next.method === 'Crédito') next.method = 'Pix'
          break
        case 'salario':
          next.direction = 'Entrada'
          next.kind = 'Salario'
          if (next.method === 'Crédito') next.method = 'Pix'
          break
      }
      return next
    })
    if (mode !== 'compra-credito') {
      setInstallmentEnabled(false)
      setInstallmentCount(2)
    }
  }, [mode])

  // Ajusta conta conforme modo / método
  useEffect(() => {
    const usingCredit = mode === 'compra-credito'
    const sourceList = usingCredit ? creditAccountList : accountList
    if (sourceList.length === 0) return
    const exists = sourceList.some((a) => a.name === form.account)
    if (!exists) {
      setForm((prev) => ({ ...prev, account: sourceList[0].name }))
    }
  }, [mode, form.account, accountList, creditAccountList])

  const create = useMutation({
    mutationFn: () => {
      const selectedAccount = accountList.find((a) => a.name === form.account)
      if (!selectedAccount) {
        throw new Error('Selecione uma conta bancária válida antes de salvar o lançamento.')
      }
      const isCreditOut = mode === 'compra-credito'
      const isInstallment = isCreditOut && installmentEnabled && installmentCount >= 2
      const payload = {
        ...form,
        account_id: selectedAccount.id,
        card: isCreditOut ? selectedAccount.name : '',
        card_account_id: isCreditOut ? selectedAccount.id : null,
      }
      if (isInstallment) {
        return api.request('/transactions/installments', {
          method: 'POST',
          body: JSON.stringify({ ...payload, installment_count: installmentCount }),
        })
      }
      return api.request('/transactions', { method: 'POST', body: JSON.stringify(payload) })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tx'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setForm((prev) => ({
        ...initial,
        date: new Date().toISOString().slice(0, 10),
        direction: prev.direction,
        method: prev.method,
        kind: prev.kind,
        account: prev.account,
      }))
      setInstallmentEnabled(false)
      setInstallmentCount(2)
    },
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.request(`/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tx'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  const allTransactions = (tx.data || []) as any[]

  // Contagens por modo (para os filtros e o resumo)
  const counts = useMemo(() => {
    const c = { 'compra-avista': 0, 'compra-credito': 0, entrada: 0, 'pagamento-fatura': 0, salario: 0 } as Record<EntryMode, number>
    for (const t of allTransactions) c[categorizeTransaction(t)]++
    return c
  }, [allTransactions])

  const filteredTransactions = useMemo(() => {
    if (filterMode === 'all') return allTransactions
    return allTransactions.filter((t) => categorizeTransaction(t) === filterMode)
  }, [allTransactions, filterMode])

  const totalFiltered = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + (t.direction === 'Entrada' ? t.amount : -t.amount), 0)
  }, [filteredTransactions])

  const currentMeta = MODE_META[mode]
  const sourceAccounts = mode === 'compra-credito' ? creditAccountList : accountList

  const canSubmit =
    !!form.description &&
    form.amount > 0 &&
    !!sourceAccounts.find((a) => a.name === form.account) &&
    !(mode === 'compra-credito' && creditAccountList.length === 0)

  return (
    <div>
      <div className='card card-title'>
        <h2>Lançamentos</h2>
        <div className='muted'>Compras, entradas e pagamentos</div>
      </div>

      {/* Seletor de tipo de lançamento */}
      <div className='card'>
        <div className='card-title' style={{ marginBottom: '8px' }}>
          <strong>➕ Novo Lançamento</strong>
          <div className='muted'>escolha o tipo</div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '10px',
            marginTop: '4px',
          }}
        >
          {(Object.keys(MODE_META) as EntryMode[]).map((m) => {
            const meta = MODE_META[m]
            const active = mode === m
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '14px 12px',
                  borderRadius: '10px',
                  border: active ? `2px solid ${meta.color}` : '1px solid #e5e7eb',
                  background: active ? meta.bg : 'white',
                  color: active ? meta.color : '#475569',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  lineHeight: 1.25,
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>{meta.icon}</span>
                <span style={{ fontSize: '0.95rem' }}>{meta.label}</span>
              </button>
            )
          })}
        </div>
        <div
          style={{
            marginTop: '14px',
            fontSize: '0.9rem',
            color: currentMeta.color,
            background: currentMeta.bg,
            padding: '10px 14px',
            borderRadius: '8px',
            borderLeft: `4px solid ${currentMeta.color}`,
          }}
        >
          <strong>
            {currentMeta.icon} {currentMeta.label}:
          </strong>{' '}
          {currentMeta.helper}
        </div>
      </div>

      {/* Formulário específico do modo selecionado */}
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
            <input type='date' value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontWeight: 600 }}>💰 Valor</label>
            <input
              type='number'
              step='0.01'
              value={form.amount || ''}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              placeholder='0.00'
            />
          </div>
        </div>

        {/* Método de pagamento — apenas para modos à vista / entrada / pagamento fatura */}
        {(mode === 'compra-avista' || mode === 'entrada' || mode === 'pagamento-fatura' || mode === 'salario') && (
          <div style={{ marginTop: '16px' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
              🔄 {mode === 'entrada' || mode === 'salario' ? 'Como você recebeu' : 'Forma de pagamento'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
              {Object.entries(mode === 'entrada' || mode === 'salario' ? ENTRY_METHODS : CASH_METHODS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setForm({ ...form, method: key })}
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

        {/* Modo crédito: informação reforçada + parcelamento */}
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
                  onClick={() => setInstallmentEnabled(false)}
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
                  onClick={() => setInstallmentEnabled(true)}
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
                        if (Number.isFinite(v)) setInstallmentCount(Math.max(2, Math.min(48, Math.round(v))))
                      }}
                      style={{ width: '100px', padding: '8px', borderRadius: '6px' }}
                    />
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[2, 3, 6, 10, 12].map((n) => (
                        <button
                          key={n}
                          onClick={() => setInstallmentCount(n)}
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
              onChange={(e) => setForm({ ...form, account: e.target.value })}
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
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={
                  mode === 'compra-credito'
                    ? 'Ex: Mercado, Netflix, Roupa...'
                    : mode === 'entrada'
                      ? 'Ex: Reembolso, Venda, Transferência recebida...'
                      : mode === 'pagamento-fatura'
                        ? 'Ex: Fatura Nubank Abril'
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
                onChange={(e) => setForm({ ...form, category: e.target.value })}
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
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder='Notas adicionais...'
            style={{ padding: '10px', borderRadius: '8px', minHeight: '70px', width: '100%' }}
          />
        </div>

        {/* Ação */}
        <div style={{ marginTop: '18px' }}>
          <button
            onClick={() => create.mutate()}
            disabled={!canSubmit || create.isPending}
            className='btn'
            style={{
              background: canSubmit ? currentMeta.color : '#9ca3af',
              color: 'white',
              padding: '12px 24px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: !canSubmit || create.isPending ? 'not-allowed' : 'pointer',
              opacity: !canSubmit || create.isPending ? 0.7 : 1,
            }}
          >
            {create.isPending
              ? '⏳ Salvando...'
              : mode === 'compra-credito' && installmentEnabled && installmentCount >= 2
                ? `✅ Salvar ${installmentCount}x parcelas`
                : `✅ Salvar ${currentMeta.label}`}
          </button>
          {create.isError && (
            <div style={{ marginTop: '8px', color: '#dc2626', fontSize: '0.9rem' }}>
              ⚠️ {(create.error as Error)?.message || 'Erro ao salvar lançamento'}
            </div>
          )}
        </div>
      </div>

      {/* Lista / Histórico */}
      <div className='card card-title'>
        <h3 style={{ margin: 0 }}>📋 Histórico de Lançamentos</h3>
        <div className='muted'>
          {filteredTransactions.length} registro{filteredTransactions.length !== 1 ? 's' : ''} · saldo{' '}
          <strong style={{ color: totalFiltered >= 0 ? '#10b981' : '#ef4444' }}>
            {totalFiltered >= 0 ? '+' : '-'} R$ {Math.abs(totalFiltered).toFixed(2)}
          </strong>
        </div>
      </div>

      <div className='card' style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {([
          { key: 'all', label: '📊 Todos', color: '#4f46e5', count: allTransactions.length },
          { key: 'compra-avista', label: '🛒 À vista', color: MODE_META['compra-avista'].color, count: counts['compra-avista'] },
          { key: 'compra-credito', label: '💳 Crédito', color: MODE_META['compra-credito'].color, count: counts['compra-credito'] },
          { key: 'entrada', label: '⬇️ Entradas', color: MODE_META['entrada'].color, count: counts['entrada'] },
          { key: 'pagamento-fatura', label: '🧾 Pgto. Fatura', color: MODE_META['pagamento-fatura'].color, count: counts['pagamento-fatura'] },
          { key: 'salario', label: '💰 Salário', color: MODE_META['salario'].color, count: counts['salario'] },
        ] as const).map((f) => {
          const active = filterMode === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key as typeof filterMode)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: active ? `2px solid ${f.color}` : '1px solid #e5e7eb',
                background: active ? `${f.color}15` : 'white',
                color: active ? f.color : '#475569',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <span>{f.label}</span>
              <span
                style={{
                  background: active ? f.color : '#e5e7eb',
                  color: active ? 'white' : '#475569',
                  padding: '1px 8px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                }}
              >
                {f.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tabela */}
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
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((t: any) => {
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
                        {remove.isPending ? '...' : 'Remover'}
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
    </div>
  )
}
