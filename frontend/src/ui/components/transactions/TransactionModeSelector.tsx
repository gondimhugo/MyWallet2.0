import { type CreationMode, MODE_META } from '../../types/transactions'

interface Props {
  mode: CreationMode
  onModeChange: (mode: CreationMode) => void
}

export function TransactionModeSelector({ mode, onModeChange }: Props) {
  const currentMeta = MODE_META[mode]

  return (
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
        {(['compra-avista', 'compra-credito', 'entrada', 'salario'] as CreationMode[]).map((m) => {
          const meta = MODE_META[m]
          const active = mode === m
          return (
            <button
              key={m}
              onClick={() => onModeChange(m)}
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
  )
}
