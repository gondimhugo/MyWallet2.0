import { type KPIData, formatCurrency, getKPILabel, getKPIColor } from '../../types/dashboard'

interface Props {
  data: KPIData | undefined
}

export function KPICards({ data }: Props) {
  if (!data) return null

  return (
    <div className='grid'>
      {Object.entries(data).map(([key, value]) => (
        <div
          key={key}
          className='card kpi'
          style={{
            borderLeft: `4px solid ${getKPIColor(key)}`,
            background: 'linear-gradient(135deg, var(--card) 0%, rgba(79,70,229,0.02) 100%)',
          }}
        >
          <div className='muted' style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {getKPILabel(key)}
          </div>
          <div className='value' style={{ color: getKPIColor(key), marginTop: 8 }}>
            {formatCurrency(Number(value))}
          </div>
        </div>
      ))}
    </div>
  )
}
