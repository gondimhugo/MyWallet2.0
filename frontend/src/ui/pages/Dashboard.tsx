import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { api } from '../../lib/api'

const COLORS = ['#4f46e5', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#6366f1', '#14b8a6', '#f97316']
type ChartTypeCat = 'bar' | 'pie' | 'line'
type ChartTypeBalance = 'line' | 'area' | 'bar'

interface KPIData {
  entradas: number
  saidas: number
  saldo: number
  gastos_sem_fatura: number
  pagamentos_fatura: number
}

interface Transaction {
  date: string
  direction: 'Entrada' | 'Saída'
  amount: number
  kind: string
  category: string
}

function formatCurrency(val: number) {
  return `R$ ${val.toFixed(2)}`
}

function getKPILabel(key: string): string {
  const labels: Record<string, string> = {
    entradas: '💰 Entradas',
    saidas: '📤 Total Saídas',
    saldo: '📊 Saldo',
    gastos_sem_fatura: '🛒 Gastos',
    pagamentos_fatura: '💳 Pagamentos Fatura',
  }
  return labels[key] || key
}

function getKPIColor(key: string): string {
  const colors: Record<string, string> = {
    entradas: '#10b981',
    saidas: '#ef4444',
    saldo: '#4f46e5',
    gastos_sem_fatura: '#f59e0b',
    pagamentos_fatura: '#06b6d4',
  }
  return colors[key] || '#6b7280'
}

export function Dashboard() {
  const [chartTypeCat, setChartTypeCat] = useState<ChartTypeCat>('bar')
  const [chartTypeBalance, setChartTypeBalance] = useState<ChartTypeBalance>('line')
  const [periodType, setPeriodType] = useState<'month' | 'custom'>('month')

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [customStartDate, setCustomStartDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  )
  const [customEndDate, setCustomEndDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
  )

  // Calculate first and last day of selected month
  let start: string
  let end: string

  if (periodType === 'month') {
    start = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
    end = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  } else {
    start = customStartDate
    end = customEndDate
  }

  const kpis = useQuery({ queryKey: ['kpi', start, end], queryFn: () => api.request(`/dashboard/kpis?startISO=${start}&endISO=${end}`) })
  const tx = useQuery({ queryKey: ['tx', start, end], queryFn: () => api.request(`/transactions?startISO=${start}&endISO=${end}`) })

  // Gráfico de categorias (excluindo pagamento de fatura)
  const categoryData = useMemo(() => {
    const txList = (tx.data || []) as Transaction[]
    return Object.entries(
      txList.reduce((acc: Record<string, number>, t) => {
        if (t.direction === 'Saída' && t.kind !== 'PagamentoFatura') {
          acc[t.category || 'Outros'] = (acc[t.category || 'Outros'] || 0) + t.amount
        }
        return acc
      }, {})
    )
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
  }, [tx.data])

  // Gráfico de saldo acumulado (delta diário)
  const accumulatedData = useMemo(() => {
    const txList = (tx.data || []) as Transaction[]
    const byDate: Record<string, number> = {}

    txList.forEach((t) => {
      const delta = t.direction === 'Entrada' ? t.amount : -t.amount
      byDate[t.date] = (byDate[t.date] || 0) + delta
    })

    const dates = Object.keys(byDate).sort()
    let accumulated = 0
    return dates.map((date) => {
      accumulated += byDate[date]
      return { date, delta: Number(byDate[date].toFixed(2)), acumulado: Number(accumulated.toFixed(2)) }
    })
  }, [tx.data])

  return (
    <div>
      <div className='card card-title'>
        <h2>Dashboard</h2>
        <div className='muted'>{start} até {end}</div>
      </div>

      {/* Período selector */}
      <div className='card' style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>📅 Tipo de Período:</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as 'month' | 'custom')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '0.95rem',
                cursor: 'pointer',
                background: 'white',
              }}
            >
              <option value='month'>Por Mês</option>
              <option value='custom'>Por Dias (Customizado)</option>
            </select>
          </div>
        </div>

        {periodType === 'month' ? (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Mês:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  background: 'white',
                }}
              >
                <option value={1}>Janeiro</option>
                <option value={2}>Fevereiro</option>
                <option value={3}>Março</option>
                <option value={4}>Abril</option>
                <option value={5}>Maio</option>
                <option value={6}>Junho</option>
                <option value={7}>Julho</option>
                <option value={8}>Agosto</option>
                <option value={9}>Setembro</option>
                <option value={10}>Outubro</option>
                <option value={11}>Novembro</option>
                <option value={12}>Dezembro</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Ano:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  background: 'white',
                }}
              >
                {Array.from({ length: 10 }, (_, i) => now.getFullYear() - 5 + i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                const today = new Date()
                setSelectedMonth(today.getMonth() + 1)
                setSelectedYear(today.getFullYear())
              }}
              className='btn'
              style={{
                marginLeft: 'auto',
                background: '#4f46e5',
                color: 'white',
                padding: '8px 16px',
                fontSize: '0.9rem',
              }}
            >
              Mês Atual
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Data Início:</label>
              <input
                type='date'
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  background: 'white',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>Data Fim:</label>
              <input
                type='date'
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  background: 'white',
                }}
              />
            </div>
            <button
              onClick={() => {
                const today = new Date()
                setCustomStartDate(
                  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
                )
                setCustomEndDate(
                  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
                )
              }}
              className='btn'
              style={{
                marginLeft: 'auto',
                background: '#4f46e5',
                color: 'white',
                padding: '8px 16px',
                fontSize: '0.9rem',
              }}
            >
              Mês Atual
            </button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className='grid'>
        {kpis.data &&
          Object.entries(kpis.data as KPIData).map(([key, value]) => (
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

      {/* Gráficos */}
      <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))' }}>
        {/* Gastos por categoria */}
        <div className='card chart-wrap'>
          <div className='card-title'>
            <strong>💰 Gastos por Categoria</strong>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={chartTypeCat}
                onChange={(e) => setChartTypeCat(e.target.value as ChartTypeCat)}
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
              <div className='muted' style={{ fontSize: '0.85rem' }}>{categoryData.length} categorias</div>
            </div>
          </div>
          {categoryData.length > 0 ? (
            <>
              {chartTypeCat === 'bar' && (
                <ResponsiveContainer width='100%' height={280}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                    <XAxis dataKey='name' angle={-45} textAnchor='end' height={100} interval={0} />
                    <YAxis />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Bar dataKey='value' fill='#f59e0b' radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              {chartTypeCat === 'pie' && (
                <ResponsiveContainer width='100%' height={280}>
                  <PieChart>
                    <Pie data={categoryData} dataKey='value' nameKey='name' cx='50%' cy='50%' outerRadius={80} label>
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {chartTypeCat === 'line' && (
                <ResponsiveContainer width='100%' height={280}>
                  <LineChart data={categoryData}>
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

        {/* Saldo acumulado */}
        <div className='card chart-wrap'>
          <div className='card-title'>
            <strong>📈 Saldo Acumulado</strong>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={chartTypeBalance}
                onChange={(e) => setChartTypeBalance(e.target.value as ChartTypeBalance)}
                style={{
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <option value='line'>Linhas</option>
                <option value='area'>Área</option>
                <option value='bar'>Barras</option>
              </select>
              <div className='muted' style={{ fontSize: '0.85rem' }}>Delta diário</div>
            </div>
          </div>
          {accumulatedData.length > 0 ? (
            <>
              {chartTypeBalance === 'line' && (
                <ResponsiveContainer width='100%' height={280}>
                  <LineChart data={accumulatedData}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                    <XAxis dataKey='date' />
                    <YAxis />
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v))}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    <Line
                      type='monotone'
                      dataKey='delta'
                      stroke='#4f46e5'
                      strokeWidth={2}
                      name='Delta Diário'
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type='monotone'
                      dataKey='acumulado'
                      stroke='#10b981'
                      strokeWidth={3}
                      name='Saldo Acumulado'
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {chartTypeBalance === 'area' && (
                <ResponsiveContainer width='100%' height={280}>
                  <AreaChart data={accumulatedData}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                    <XAxis dataKey='date' />
                    <YAxis />
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v))}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    <Area type='monotone' dataKey='delta' fill='#4f46e5' stroke='#4f46e5' name='Delta Diário' isAnimationActive={false} />
                    <Area type='monotone' dataKey='acumulado' fill='#10b981' stroke='#10b981' name='Saldo Acumulado' isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
              {chartTypeBalance === 'bar' && (
                <ResponsiveContainer width='100%' height={280}>
                  <BarChart data={accumulatedData}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                    <XAxis dataKey='date' />
                    <YAxis />
                    <Tooltip
                      formatter={(v) => formatCurrency(Number(v))}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey='delta' fill='#4f46e5' name='Delta Diário' radius={[4, 4, 0, 0]} />
                    <Bar dataKey='acumulado' fill='#10b981' name='Saldo Acumulado' radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Sem transações neste período</div>
          )}
        </div>
      </div>
    </div>
  )
}
