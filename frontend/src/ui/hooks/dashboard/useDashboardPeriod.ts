import { useState } from 'react'

export function useDashboardPeriod() {
  const now = new Date()
  const [periodType, setPeriodType] = useState<'month' | 'custom'>('month')
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [customStartDate, setCustomStartDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  )
  const [customEndDate, setCustomEndDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`
  )

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

  return {
    periodType,
    setPeriodType,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    start,
    end,
  }
}
