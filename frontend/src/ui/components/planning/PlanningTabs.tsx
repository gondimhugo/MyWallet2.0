import { TAB_ICONS, TAB_LABELS, type PlanningTab } from '../../types/planning'

interface Props {
  active: PlanningTab
  onChange: (tab: PlanningTab) => void
}

const TAB_ORDER: PlanningTab[] = ['cashflow', 'budgets', 'goals', 'loans', 'scenarios']
const ENABLED: Record<PlanningTab, boolean> = {
  cashflow: true,
  budgets: true,
  goals: false,
  loans: true,
  scenarios: false,
}

export function PlanningTabs({ active, onChange }: Props) {
  return (
    <div
      className='card'
      style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        padding: 6,
      }}
    >
      {TAB_ORDER.map((tab) => {
        const enabled = ENABLED[tab]
        const isActive = tab === active
        return (
          <button
            key={tab}
            type='button'
            onClick={() => enabled && onChange(tab)}
            disabled={!enabled}
            style={{
              flex: '1 1 140px',
              padding: '10px 12px',
              borderRadius: 10,
              border: 0,
              cursor: enabled ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              background: isActive ? 'var(--primary)' : 'transparent',
              color: isActive ? '#fff' : enabled ? '#334155' : '#94a3b8',
              boxShadow: isActive ? 'var(--shadow)' : 'none',
              transition: 'background-color 120ms ease, color 120ms ease',
            }}
            title={enabled ? '' : 'Em breve'}
          >
            <span style={{ marginRight: 6 }}>{TAB_ICONS[tab]}</span>
            {TAB_LABELS[tab]}
            {!enabled && (
              <span style={{ marginLeft: 6, fontSize: '0.7rem', opacity: 0.7 }}>(em breve)</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
