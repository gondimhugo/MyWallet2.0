import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../lib/api'
import type { DashboardTransaction, KPIData } from '../../types/dashboard'

export function useDashboardData(start: string, end: string) {
  const kpis = useQuery({ queryKey: ['kpi', start, end], queryFn: () => api.request(`/dashboard/kpis?startISO=${start}&endISO=${end}`) })
  const tx = useQuery({ queryKey: ['tx', start, end], queryFn: () => api.request(`/transactions?startISO=${start}&endISO=${end}`) })

  const categoryData = useMemo(() => {
    const txList = (tx.data || []) as DashboardTransaction[]
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

  const accumulatedData = useMemo(() => {
    const txList = (tx.data || []) as DashboardTransaction[]
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

  return {
    kpis: kpis.data as KPIData | undefined,
    categoryData,
    accumulatedData,
  }
}
