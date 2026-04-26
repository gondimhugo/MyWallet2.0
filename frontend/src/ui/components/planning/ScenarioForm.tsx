import { HORIZON_LABELS, type HorizonMode, type PlanningInput } from '../../types/planning'
import type { PlanningFormError } from '../../hooks/planning/usePlanningForm'

interface Props {
  input: PlanningInput
  errors: PlanningFormError[]
  onChange: <K extends keyof PlanningInput>(key: K, value: PlanningInput[K]) => void
  onSubmit: () => void
  onReset: () => void
  canSubmit: boolean
  isPending: boolean
}

const HORIZONS: HorizonMode[] = ['days30', 'days60', 'nextSalary', 'nextDue', 'custom']

export function ScenarioForm({
  input,
  errors,
  onChange,
  onSubmit,
  onReset,
  canSubmit,
  isPending,
}: Props) {
  const errorFor = (field: PlanningFormError['field']) =>
    errors.find((e) => e.field === field)?.message

  return (
    <div className='card'>
      <div className='card-title'>
        <strong>⚙️ Parâmetros da simulação</strong>
        <span className='muted' style={{ fontSize: '0.85rem' }}>
          Defina o horizonte e como tratar crédito/faturas.
        </span>
      </div>

      <div className='form'>
        <label className='field'>
          <span>Data inicial</span>
          <input
            type='date'
            value={input.startISO}
            onChange={(e) => onChange('startISO', e.target.value)}
            aria-invalid={!!errorFor('startISO')}
          />
          {errorFor('startISO') && <span className='field-error'>{errorFor('startISO')}</span>}
        </label>

        <label className='field'>
          <span>Horizonte</span>
          <select
            value={input.horizonMode}
            onChange={(e) => onChange('horizonMode', e.target.value as HorizonMode)}
          >
            {HORIZONS.map((h) => (
              <option key={h} value={h}>
                {HORIZON_LABELS[h]}
              </option>
            ))}
          </select>
        </label>

        {input.horizonMode === 'custom' && (
          <label className='field'>
            <span>Data final</span>
            <input
              type='date'
              value={input.endISO ?? ''}
              onChange={(e) => onChange('endISO', e.target.value || null)}
              aria-invalid={!!errorFor('endISO')}
            />
            {errorFor('endISO') && <span className='field-error'>{errorFor('endISO')}</span>}
          </label>
        )}

        <label
          className='field'
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <input
            type='checkbox'
            checked={input.includeInvoices}
            onChange={(e) => onChange('includeInvoices', e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span style={{ fontWeight: 500 }}>Incluir faturas em aberto</span>
        </label>

        <label
          className='field'
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <input
            type='checkbox'
            checked={input.creditAsCash}
            onChange={(e) => onChange('creditAsCash', e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span style={{ fontWeight: 500 }}>Tratar compras no crédito como saída de caixa</span>
        </label>
      </div>

      <div className='form-actions'>
        <button
          type='button'
          className='btn btn-primary'
          onClick={onSubmit}
          disabled={!canSubmit || isPending}
          style={{
            background: 'var(--primary)',
            color: '#fff',
            opacity: !canSubmit || isPending ? 0.6 : 1,
          }}
        >
          {isPending ? 'Simulando…' : 'Simular cenário'}
        </button>
        <button
          type='button'
          className='btn'
          onClick={onReset}
          disabled={isPending}
          style={{ background: 'rgba(15,23,42,0.06)', color: '#334155' }}
        >
          Restaurar padrão
        </button>
      </div>
    </div>
  )
}
