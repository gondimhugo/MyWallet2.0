import { useMutation, useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { api } from '../../lib/api'

interface SalaryForm {
  monthly_salary: number
  mode: 'mensal' | 'quinzenal'
  day1: number
  day2: number | null
  amount1: number | null
  amount2: number | null
  default_method: string
  default_account: string
}

export function Salary() {
  const profile = useQuery({ queryKey: ['salary'], queryFn: () => api.request('/salary-profile') })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.request('/accounts') })

  const [form, setForm] = useState<SalaryForm>({
    monthly_salary: 0,
    mode: 'mensal',
    day1: 5,
    day2: null,
    amount1: null,
    amount2: null,
    default_method: 'Transferência',
    default_account: 'Conta Corrente',
  })
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const save = useMutation({
    mutationFn: () => api.request('/salary-profile', { method: 'PUT', body: JSON.stringify(form) }),
    onSuccess: () => {
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 2000)
      profile.refetch()
    },
    onError: () => {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    },
  })

  // Carregar dados do perfil quando disponível
  useMemo(() => {
    if (profile.data && Object.keys(profile.data).length > 0) {
      setForm({
        monthly_salary: profile.data.monthly_salary || 0,
        mode: profile.data.mode || 'mensal',
        day1: profile.data.day1 || 5,
        day2: profile.data.day2 || null,
        amount1: profile.data.amount1 || null,
        amount2: profile.data.amount2 || null,
        default_method: profile.data.default_method || 'Transferência',
        default_account: profile.data.default_account || 'Conta Corrente',
      })
    }
  }, [profile.data])

  const getModeLabel = (mode: string) => (mode === 'mensal' ? '💰 Mensal' : '📋 Quinzenal')

  // Lista de contas para o dropdown
  const accountList = (accounts.data || []) as Array<{ id: string; name: string }>

  return (
    <div>
      <div className='card card-title'>
        <h2>Perfil de Salário</h2>
        <div className='muted'>Configure seus recebimentos mensais ou quinzenais</div>
      </div>

      {/* Mode selector */}
      <div className='card' style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600, fontSize: '1rem' }}>Tipo de Recebimento:</label>
        <div style={{ display: 'flex', gap: '12px' }}>
          {(['mensal', 'quinzenal'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setForm({ ...form, mode })}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: form.mode === mode ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                background: form.mode === mode ? '#e0e7ff' : 'white',
                color: form.mode === mode ? '#4f46e5' : '#6b7280',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              {getModeLabel(mode)}
            </button>
          ))}
        </div>
      </div>

      {/* Salário mensal base */}
      <div className='card'>
        <div className='card-title'>
          <strong>📊 Salário Total Mensal</strong>
          <div className='muted'>Valor bruto mensal</div>
        </div>
        <div className='form'>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontWeight: 600, minWidth: '140px' }}>Valor Mensal:</label>
            <input
              type='number'
              value={form.monthly_salary}
              onChange={(e) => setForm({ ...form, monthly_salary: Number(e.target.value) })}
              placeholder='Ex: 3000.00'
              style={{ flex: 1 }}
            />
          </div>
        </div>
      </div>

      {/* Modo Mensal */}
      {form.mode === 'mensal' && (
        <div className='card'>
          <div className='card-title'>
            <strong>📅 Recebimento Mensal</strong>
            <div className='muted'>Configure seu recebimento único</div>
          </div>
          <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600 }}>Dia do Recebimento:</label>
              <input
                type='number'
                min='1'
                max='31'
                value={form.day1}
                onChange={(e) => setForm({ ...form, day1: Number(e.target.value) })}
                placeholder='Ex: 5'
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontWeight: 600 }}>Valor Recebido (opcional):</label>
              <input
                type='number'
                value={form.amount1 || ''}
                onChange={(e) => setForm({ ...form, amount1: e.target.value ? Number(e.target.value) : null })}
                placeholder='Se diferente do total'
              />
              {form.amount1 && form.amount1 !== form.monthly_salary && (
                <div className='muted' style={{ fontSize: '0.85rem' }}>
                  Diferença: R$ {((form.monthly_salary || 0) - form.amount1).toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modo Quinzenal */}
      {form.mode === 'quinzenal' && (
        <div className='card'>
          <div className='card-title'>
            <strong>📋 Recebimento Quinzenal</strong>
            <div className='muted'>Configure seus 2 recebimentos mensais</div>
          </div>
          <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
            {/* 1º recebimento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, color: '#4f46e5' }}>1º Recebimento</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dia:</label>
                <input
                  type='number'
                  min='1'
                  max='31'
                  value={form.day1}
                  onChange={(e) => setForm({ ...form, day1: Number(e.target.value) })}
                  placeholder='Ex: 5'
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Valor:</label>
                <input
                  type='number'
                  value={form.amount1 || ''}
                  onChange={(e) => setForm({ ...form, amount1: e.target.value ? Number(e.target.value) : null })}
                  placeholder={`Ex: ${((form.monthly_salary || 0) / 2).toFixed(2)}`}
                />
              </div>
            </div>

            {/* 2º recebimento */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, color: '#06b6d4' }}>2º Recebimento</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dia:</label>
                <input
                  type='number'
                  min='1'
                  max='31'
                  value={form.day2 || ''}
                  onChange={(e) => setForm({ ...form, day2: e.target.value ? Number(e.target.value) : null })}
                  placeholder='Ex: 20'
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Valor:</label>
                <input
                  type='number'
                  value={form.amount2 || ''}
                  onChange={(e) => setForm({ ...form, amount2: e.target.value ? Number(e.target.value) : null })}
                  placeholder={`Ex: ${((form.monthly_salary || 0) / 2).toFixed(2)}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conta e método padrão */}
      <div className='card'>
        <div className='card-title'>
          <strong>🏦 Recebimento</strong>
          <div className='muted'>Conta e método padrão</div>
        </div>
        <div className='grid' style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600 }}>Conta de Recebimento:</label>
            {accounts.isLoading ? (
              <div className='muted'>⏳ Carregando contas...</div>
            ) : accountList.length > 0 ? (
              <>
                <select
                  value={form.default_account}
                  onChange={(e) => setForm({ ...form, default_account: e.target.value })}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <option value=''>Selecione uma conta...</option>
                  {accountList.map((acc) => (
                    <option key={acc.id || acc.name} value={acc.name}>
                      {acc.name}
                    </option>
                  ))}
                </select>
                <div className='muted' style={{ fontSize: '0.85rem' }}>
                  ✅ {accountList.length} conta{accountList.length !== 1 ? 's' : ''} disponível{accountList.length !== 1 ? 's' : ''}
                </div>
              </>
            ) : (
              <div className='muted' style={{ color: '#ef4444' }}>
                ⚠️ Nenhuma conta cadastrada. Crie uma conta primeiro.
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontWeight: 600 }}>Método de Recebimento:</label>
            <select
              value={form.default_method}
              onChange={(e) => setForm({ ...form, default_method: e.target.value })}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              <option value='Transferência'>Transferência Bancária</option>
              <option value='Depósito'>Depósito</option>
              <option value='Pix'>Pix</option>
              <option value='Dinheiro'>Dinheiro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Botão salvar */}
      <div className='card' style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className='btn'
          style={{
            background: saveStatus === 'success' ? '#10b981' : '#4f46e5',
            color: 'white',
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: save.isPending ? 'wait' : 'pointer',
            opacity: save.isPending ? 0.7 : 1,
          }}
        >
          {save.isPending ? '⏳ Salvando...' : saveStatus === 'success' ? '✅ Salvo!' : '💾 Salvar Perfil'}
        </button>
        {saveStatus === 'error' && <div style={{ color: '#ef4444', fontWeight: 600 }}>❌ Erro ao salvar</div>}
      </div>

      {/* Resumo do perfil */}
      {profile.data && Object.keys(profile.data).length > 0 && (
        <div className='card'>
          <div className='card-title'>
            <strong>📋 Perfil Atual</strong>
            <div className='muted'>Configuração persistida</div>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#6b7280' }}>
            {JSON.stringify(profile.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
