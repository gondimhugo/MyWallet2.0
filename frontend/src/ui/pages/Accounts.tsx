import { useAccountForm } from '../hooks/accounts/useAccountForm'
import { useAccountList } from '../hooks/accounts/useAccountList'
import { AccountSummary } from '../components/accounts/AccountSummary'
import { AccountFormPanel } from '../components/accounts/AccountFormPanel'
import { AccountCard } from '../components/accounts/AccountCard'

export function Accounts() {
  const {
    form, setForm, editingId, formRef,
    hasCredit, isValid, isEditing,
    create, update, startEdit, resetForm, toggleCardType,
  } = useAccountForm()

  const { accountList, totals, remove } = useAccountList()

  const handleSubmit = () => {
    if (isEditing && editingId) {
      update.mutate(editingId)
    } else {
      create.mutate()
    }
  }

  const handleRemove = (id: string) => {
    remove.mutate(id, {
      onSuccess: () => {
        if (editingId === id) resetForm()
      },
    })
  }

  return (
    <div>
      <div className='card card-title'>
        <h2>🏦 Contas Bancárias</h2>
        <div className='muted'>Cadastro de contas com saldos de caixa (débito, Pix, transferência) e crédito</div>
      </div>

      {accountList.length > 0 && (
        <AccountSummary count={accountList.length} totals={totals} />
      )}

      <AccountFormPanel
        form={form}
        onFormChange={setForm}
        formRef={formRef}
        isEditing={isEditing}
        hasCredit={hasCredit}
        isValid={isValid}
        isPending={create.isPending || update.isPending}
        onSubmit={handleSubmit}
        onCancel={resetForm}
        onToggleCardType={toggleCardType}
      />

      <div className='accounts-grid'>
        {accountList.map((acc) => (
          <AccountCard
            key={acc.id || acc.name}
            account={acc}
            editingId={editingId}
            onEdit={startEdit}
            onRemove={handleRemove}
            isRemoving={remove.isPending}
            isUpdating={update.isPending}
          />
        ))}
      </div>

      {accountList.length === 0 && (
        <div style={{ marginTop: '24px', textAlign: 'center', color: '#6b7280', padding: '40px 20px' }}>
          Nenhuma conta bancária cadastrada ainda
        </div>
      )}
    </div>
  )
}
