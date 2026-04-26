import {
  computeCashFlowMetrics,
  formatCurrency,
  type CashFlowMetric,
  type PlanningOutput,
} from '../../../types/planning'

interface Props {
  data: PlanningOutput
}

function renderValue(metric: CashFlowMetric): string {
  if (metric.key === 'daysNegative') {
    return `${metric.value} ${metric.value === 1 ? 'dia' : 'dias'}`
  }
  return formatCurrency(metric.value)
}

export function CashFlowMetrics({ data }: Props) {
  const metrics = computeCashFlowMetrics(data)

  return (
    <div className='grid'>
      {metrics.map((metric) => (
        <div
          key={metric.key}
          className='card kpi'
          style={{
            borderLeft: `4px solid ${metric.color}`,
            background: 'linear-gradient(135deg, var(--card) 0%, rgba(79,70,229,0.02) 100%)',
          }}
        >
          <div className='muted' style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {metric.label}
          </div>
          <div className='value' style={{ color: metric.color, marginTop: 6 }}>
            {renderValue(metric)}
          </div>
          {metric.hint && (
            <div className='muted' style={{ fontSize: '0.78rem' }}>
              {metric.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
