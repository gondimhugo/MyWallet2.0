import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../lib/api'

interface AccountForm {
    name: string
    bank: string
    accountType: 'Corrente' | 'Poupança' | 'Investimento' | 'Outra'
    cardTypes: string[]
}

const BANK_OPTIONS = [
    { code: 'bradesco', name: 'Bradesco', logo: '🟠', color: '#f97316' },
    { code: 'itau', name: 'Itaú', logo: '🟠', color: '#ff6600' },
    { code: 'caixa', name: 'Caixa Econômica', logo: '🔵', color: '#0066cc' },
    { code: 'santander', name: 'Santander', logo: '🔴', color: '#d71010' },
    { code: 'bb', name: 'Banco do Brasil', logo: '💛', color: '#ffd700' },
    { code: 'nubank', name: 'Nubank', logo: '🟣', color: '#820ad1' },
    { code: 'inter', name: 'Banco Inter', logo: '🔴', color: '#ff6b35' },
    { code: 'btg', name: 'BTG Pactual', logo: '🔵', color: '#003da5' },
    { code: 'otro', name: 'Outro Banco', logo: '🏦', color: '#6b7280' },
]

const CARD_TYPES = ['Crédito', 'Débito']
const ACCOUNT_TYPES = ['Corrente', 'Poupança', 'Investimento', 'Outra']

const initialForm: AccountForm = {
    name: '',
    bank: 'bradesco',
    accountType: 'Corrente',
    cardTypes: [],
}

export function Accounts() {
    const [form, setForm] = useState<AccountForm>(initialForm)
    const qc = useQueryClient()

    const accounts = useQuery({ queryKey: ['accounts'], queryFn: () => api.request('/accounts') })
    const create = useMutation({
        mutationFn: () => {
            const payload = {
                name: form.name,
                bank: form.bank,
                account_type: form.accountType,
                card_types: form.cardTypes,
                balance: 0,
            }
            return api.request('/accounts', { method: 'POST', body: JSON.stringify(payload) })
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['accounts'] })
            setForm(initialForm)
        },
    })

    const remove = useMutation({
        mutationFn: (id: string) => api.request(`/accounts/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['accounts'] })
        },
    })

    const accountList = (accounts.data || []) as Array<{ id?: string; name: string; bank?: string; account_type?: string }>
    const selectedBank = BANK_OPTIONS.find((b) => b.code === form.bank)

    const toggleCardType = (type: string) => {
        if (form.cardTypes.includes(type)) {
            setForm({ ...form, cardTypes: form.cardTypes.filter((t) => t !== type) })
        } else {
            setForm({ ...form, cardTypes: [...form.cardTypes, type] })
        }
    }

    return (
        <div>
            <div className='card card-title'>
                <h2>🏦 Contas Bancárias</h2>
                <div className='muted'>Adicione e gerencie suas contas e cartões</div>
            </div>

            {/* Formulário */}
            <div className='card'>
                <div className='card-title'>
                    <strong>➕ Nova Conta Bancária</strong>
                    <div className='muted'>preencha os dados de sua conta</div>
                </div>

                {/* Nome da Conta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <label style={{ fontWeight: 600 }}>📝 Nome da Conta (ex: "Minha Conta Corrente"):</label>
                    <input
                        type='text'
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder='Ex: Conta Corrente Principal'
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                </div>

                {/* Banco */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <label style={{ fontWeight: 600 }}>🏦 Selecione o Banco:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                        {BANK_OPTIONS.map((bank) => (
                            <button
                                key={bank.code}
                                onClick={() => setForm({ ...form, bank: bank.code })}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: form.bank === bank.code ? `3px solid ${bank.color}` : '1px solid #e5e7eb',
                                    background: form.bank === bank.code ? `${bank.color}20` : 'white',
                                    cursor: 'pointer',
                                    fontWeight: form.bank === bank.code ? 600 : 400,
                                    fontSize: '0.95rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    color: form.bank === bank.code ? bank.color : '#6b7280',
                                }}
                            >
                                <span style={{ fontSize: '1.5rem' }}>{bank.logo}</span>
                                <span>{bank.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tipo de Conta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    <label style={{ fontWeight: 600 }}>📊 Tipo de Conta:</label>
                    <select
                        value={form.accountType}
                        onChange={(e) => setForm({ ...form, accountType: e.target.value as any })}
                        style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            background: 'white',
                            cursor: 'pointer',
                        }}
                    >
                        {ACCOUNT_TYPES.map((type) => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Tipos de Cartão */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '10px' }}>💳 Tipos de Cartão Disponíveis:</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {CARD_TYPES.map((type) => (
                            <button
                                key={type}
                                onClick={() => toggleCardType(type)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: form.cardTypes.includes(type) ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                                    background: form.cardTypes.includes(type) ? '#e0e7ff' : 'white',
                                    color: form.cardTypes.includes(type) ? '#4f46e5' : '#6b7280',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                {form.cardTypes.includes(type) ? '✅' : '☐'} {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview */}
                {form.name && selectedBank && (
                    <div
                        style={{
                            padding: '12px 16px',
                            background: '#f0f9ff',
                            borderLeft: `4px solid ${selectedBank.color}`,
                            borderRadius: '6px',
                            marginBottom: '16px',
                        }}
                    >
                        <div style={{ fontWeight: 600, marginBottom: '6px' }}>
                            {selectedBank.logo} {form.name} • {form.accountType}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                            {selectedBank.name}
                        </div>
                        {form.cardTypes.length > 0 && (
                            <div style={{ fontSize: '0.85rem', marginTop: '6px', color: '#4f46e5', fontWeight: 600 }}>
                                💳 {form.cardTypes.join(', ')}
                            </div>
                        )}
                    </div>
                )}

                {/* Botão salvar */}
                <button
                    onClick={() => create.mutate()}
                    disabled={create.isPending || !form.name || form.cardTypes.length === 0}
                    style={{
                        background: '#10b981',
                        color: 'white',
                        padding: '12px 24px',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: create.isPending || !form.name || form.cardTypes.length === 0 ? 'not-allowed' : 'pointer',
                        opacity: create.isPending || !form.name || form.cardTypes.length === 0 ? 0.6 : 1,
                    }}
                    className='btn'
                >
                    {create.isPending ? '⏳ Salvando...' : '✅ Salvar Conta'}
                </button>
            </div>

            {/* Grid de Contas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginTop: '24px' }}>
                {accountList.map((acc) => {
                    const bank = BANK_OPTIONS.find((b) => b.name.toLowerCase() === (acc.bank || '').toLowerCase()) || BANK_OPTIONS[BANK_OPTIONS.length - 1]
                    return (
                        <div
                            key={acc.id || acc.name}
                            style={{
                                background: 'white',
                                border: `2px solid ${bank.color}`,
                                borderRadius: '12px',
                                padding: '16px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                            }}
                        >
                            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{bank.logo}</div>
                            <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '4px' }}>{acc.name}</div>
                            <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '12px' }}>{bank.name}</div>
                            <div style={{ background: '#f3f4f6', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', color: '#4b5563' }}>
                                📊 {acc.account_type || 'Corrente'}
                            </div>
                            <button
                                className='btn'
                                onClick={() => acc.id && remove.mutate(acc.id)}
                                disabled={!acc.id || remove.isPending}
                                style={{
                                    marginTop: '12px',
                                    background: '#ef4444',
                                    color: 'white',
                                    width: '100%',
                                    opacity: !acc.id || remove.isPending ? 0.6 : 1,
                                    cursor: !acc.id || remove.isPending ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {remove.isPending ? '⏳ Removendo...' : '🗑️ Remover conta'}
                            </button>
                        </div>
                    )
                })}
            </div>

            {accountList.length === 0 && (
                <div style={{ marginTop: '24px', textAlign: 'center', color: '#6b7280', padding: '40px 20px' }}>
                    Nenhuma conta bancária cadastrada ainda
                </div>
            )}
        </div>
    )
}
