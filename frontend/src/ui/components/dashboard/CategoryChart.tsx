import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { type ChartTypeCat, CHART_COLORS, formatCurrency } from '../../types/dashboard'

interface Props {
  chartType: ChartTypeCat
  onChartTypeChange: (type: ChartTypeCat) => void
  data: Array<{ name: string; value: number }>
}

export function CategoryChart({ chartType, onChartTypeChange, data }: Props) {
  return (
    <div className='card chart-wrap'>
      <div className='card-title'>
        <strong>💰 Gastos por Categoria</strong>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={chartType}
            onChange={(e) => onChartTypeChange(e.target.value as ChartTypeCat)}
            style={{
              padding: '6px 8px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value='bar'>Barras</option>
            <option value='pie'>Pizza</option>
            <option value='line'>Linhas</option>
          </select>
          <div className='muted' style={{ fontSize: '0.85rem' }}>{data.length} categorias</div>
        </div>
      </div>
      {data.length > 0 ? (
        <>
          {chartType === 'bar' && (
            <ResponsiveContainer width='100%' height={280}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                <XAxis dataKey='name' angle={-45} textAnchor='end' height={100} interval={0} />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey='value' fill='#f59e0b' radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {chartType === 'pie' && (
            <ResponsiveContainer width='100%' height={280}>
              <PieChart>
                <Pie data={data} dataKey='value' nameKey='name' cx='50%' cy='50%' outerRadius={80} label>
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {chartType === 'line' && (
            <ResponsiveContainer width='100%' height={280}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                <XAxis dataKey='name' angle={-45} textAnchor='end' height={100} interval={0} />
                <YAxis />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type='monotone' dataKey='value' stroke='#f59e0b' strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Sem gastos neste período</div>
      )}
    </div>
  )
}
