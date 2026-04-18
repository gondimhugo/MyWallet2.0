import { type EntryMode, MODE_META } from '../../types/transactions'

interface Props {
  filterMode: 'all' | EntryMode
  onFilterChange: (mode: 'all' | EntryMode) => void
  totalCount: number
  counts: Record<EntryMode, number>
}

export function TransactionFilters({ filterMode, onFilterChange, totalCount, counts }: Props) {
  const filters = [
    { key: 'all' as const, label: '📊 Todos', color: '#4f46e5', count: totalCount },
    { key: 'compra-avista' as const, label: '🛒 À vista', color: MODE_META['compra-avista'].color, count: counts['compra-avista'] },
    { key: 'compra-credito' as const, label: '💳 Crédito', color: MODE_META['compra-credito'].color, count: counts['compra-credito'] },
    { key: 'entrada' as const, label: '⬇️ Entradas', color: MODE_META['entrada'].color, count: counts['entrada'] },
    { key: 'pagamento-fatura' as const, label: '🧾 Pgto. Fatura', color: MODE_META['pagamento-fatura'].color, count: counts['pagamento-fatura'] },
    { key: 'salario' as const, label: '💰 Salário', color: MODE_META['salario'].color, count: counts['salario'] },
  ]

  return (
    <div className='card' style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {filters.map((f) => {
        const active = filterMode === f.key
        return (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
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
  )
}
