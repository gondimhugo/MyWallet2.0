import { useTransactionForm } from '../hooks/transactions/useTransactionForm'
import { useTransactionList } from '../hooks/transactions/useTransactionList'
import { TransactionModeSelector } from '../components/transactions/TransactionModeSelector'
import { TransactionFormPanel } from '../components/transactions/TransactionFormPanel'
import { TransactionFilters } from '../components/transactions/TransactionFilters'
import { TransactionTable } from '../components/transactions/TransactionTable'

export function Transactions() {
  const {
    mode, setMode, form, setForm,
    installmentEnabled, setInstallmentEnabled,
    installmentCount, setInstallmentCount,
    create, sourceAccounts, currentMeta, canSubmit,
  } = useTransactionForm()

  const {
    filterMode, setFilterMode,
    allTransactions, filteredTransactions,
    counts, totalFiltered, remove,
  } = useTransactionList()

  return (
    <div>
      <div className='card card-title'>
        <h2>Lançamentos</h2>
        <div className='muted'>Compras, entradas e salarios</div>
      </div>

      <TransactionModeSelector mode={mode} onModeChange={setMode} />

      <TransactionFormPanel
        mode={mode}
        form={form}
        onFormChange={setForm}
        installmentEnabled={installmentEnabled}
        onInstallmentEnabledChange={setInstallmentEnabled}
        installmentCount={installmentCount}
        onInstallmentCountChange={setInstallmentCount}
        sourceAccounts={sourceAccounts}
        currentMeta={currentMeta}
        canSubmit={canSubmit}
        isPending={create.isPending}
        error={create.isError ? (create.error as Error) : null}
        onSubmit={() => create.mutate()}
      />

      <div className='card card-title'>
        <h3 style={{ margin: 0 }}>📋 Histórico de Lançamentos</h3>
        <div className='muted'>
          {filteredTransactions.length} registro{filteredTransactions.length !== 1 ? 's' : ''} · saldo{' '}
          <strong style={{ color: totalFiltered >= 0 ? '#10b981' : '#ef4444' }}>
            {totalFiltered >= 0 ? '+' : '-'} R$ {Math.abs(totalFiltered).toFixed(2)}
          </strong>
        </div>
      </div>

      <TransactionFilters
        filterMode={filterMode}
        onFilterChange={setFilterMode}
        totalCount={allTransactions.length}
        counts={counts}
      />

      <TransactionTable
        transactions={filteredTransactions}
        onRemove={(id) => remove.mutate(id)}
        isRemoving={remove.isPending}
      />
    </div>
  )
}
