import { formatBRL } from '../../types'

interface Props {
  count: number
  totals: { cash: number; limit: number; used: number; available: number }
}

export function AccountSummary({ count, totals }: Props) {
  return (
    <div className='card'>
      <div className='card-title'>
        <strong>💼 Resumo Consolidado</strong>
        <div className='muted' style={{ fontSize: '0.85rem' }}>{count} conta(s)</div>
      </div>
      <div className='balance-summary'>
        <div className='balance-tile cash'>
          <div className='label'>💰 Saldo em Caixa</div>
          <div className='value'>{formatBRL(totals.cash)}</div>
          <div className='hint'>Débito · Pix · Transferência · Dinheiro</div>
        </div>
        <div className='balance-tile credit-available'>
          <div className='label'>✅ Crédito Disponível</div>
          <div className='value'>{formatBRL(totals.available)}</div>
          <div className='hint'>Pronto para usar</div>
        </div>
        <div className='balance-tile credit-used'>
          <div className='label'>💳 Crédito Usado</div>
          <div className='value'>{formatBRL(totals.used)}</div>
          <div className='hint'>Já comprometido</div>
        </div>
        <div className='balance-tile credit-limit'>
          <div className='label'>🎯 Limite Total</div>
          <div className='value'>{formatBRL(totals.limit)}</div>
          <div className='hint'>Soma de todos limites</div>
        </div>
      </div>
    </div>
  )
}
