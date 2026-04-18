interface Props {
  periodType: 'month' | 'custom'
  onPeriodTypeChange: (type: 'month' | 'custom') => void
  selectedYear: number
  onYearChange: (year: number) => void
  selectedMonth: number
  onMonthChange: (month: number) => void
  customStartDate: string
  onCustomStartChange: (date: string) => void
  customEndDate: string
  onCustomEndChange: (date: string) => void
}

export function PeriodSelector({
  periodType,
  onPeriodTypeChange,
  selectedYear,
  onYearChange,
  selectedMonth,
  onMonthChange,
  customStartDate,
  onCustomStartChange,
  customEndDate,
  onCustomEndChange,
}: Props) {
  const now = new Date()

  const resetToCurrentMonth = () => {
    if (periodType === 'month') {
      onMonthChange(now.getMonth() + 1)
      onYearChange(now.getFullYear())
    } else {
      const today = new Date()
      onCustomStartChange(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
      )
      onCustomEndChange(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
      )
    }
  }

  return (
    <div className='card' style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontWeight: 600, fontSize: '0.95rem' }}>📅 Tipo de Período:</label>
          <select
            value={periodType}
            onChange={(e) => onPeriodTypeChange(e.target.value as 'month' | 'custom')}
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
              onChange={(e) => onMonthChange(Number(e.target.value))}
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
              onChange={(e) => onYearChange(Number(e.target.value))}
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
            onClick={resetToCurrentMonth}
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
              onChange={(e) => onCustomStartChange(e.target.value)}
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
              onChange={(e) => onCustomEndChange(e.target.value)}
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
            onClick={resetToCurrentMonth}
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
  )
}
