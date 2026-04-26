interface Props {
  startISO: string
  endISO?: string | null
  isRunning: boolean
}

export function PlanningHeader({ startISO, endISO, isRunning }: Props) {
  const periodHint = endISO ? `${startISO} até ${endISO}` : `Início ${startISO}`

  return (
    <div className='card card-title'>
      <div>
        <h2 style={{ margin: 0 }}>Planejamento</h2>
        <div className='muted' style={{ fontSize: '0.9rem', marginTop: 4 }}>
          Simule cenários, acompanhe orçamentos, metas e empréstimos.
        </div>
      </div>
      <div className='muted' style={{ fontSize: '0.85rem' }}>
        {isRunning ? 'Calculando…' : periodHint}
      </div>
    </div>
  )
}
