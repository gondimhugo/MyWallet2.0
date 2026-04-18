import { useState } from 'react'
import { useDashboardPeriod } from '../hooks/dashboard/useDashboardPeriod'
import { useDashboardData } from '../hooks/dashboard/useDashboardData'
import { PeriodSelector } from '../components/dashboard/PeriodSelector'
import { KPICards } from '../components/dashboard/KPICards'
import { CategoryChart } from '../components/dashboard/CategoryChart'
import { BalanceChart } from '../components/dashboard/BalanceChart'
import type { ChartTypeCat, ChartTypeBalance } from '../types/dashboard'

export function Dashboard() {
  const [chartTypeCat, setChartTypeCat] = useState<ChartTypeCat>('bar')
  const [chartTypeBalance, setChartTypeBalance] = useState<ChartTypeBalance>('line')

  const period = useDashboardPeriod()
  const { kpis, categoryData, accumulatedData } = useDashboardData(period.start, period.end)

  return (
    <div>
      <div className='card card-title'>
        <h2>Dashboard</h2>
        <div className='muted'>{period.start} até {period.end}</div>
      </div>

      <PeriodSelector
        periodType={period.periodType}
        onPeriodTypeChange={period.setPeriodType}
        selectedYear={period.selectedYear}
        onYearChange={period.setSelectedYear}
        selectedMonth={period.selectedMonth}
        onMonthChange={period.setSelectedMonth}
        customStartDate={period.customStartDate}
        onCustomStartChange={period.setCustomStartDate}
        customEndDate={period.customEndDate}
        onCustomEndChange={period.setCustomEndDate}
      />

      <KPICards data={kpis} />

      <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))' }}>
        <CategoryChart
          chartType={chartTypeCat}
          onChartTypeChange={setChartTypeCat}
          data={categoryData}
        />
        <BalanceChart
          chartType={chartTypeBalance}
          onChartTypeChange={setChartTypeBalance}
          data={accumulatedData}
        />
      </div>
    </div>
  )
}
