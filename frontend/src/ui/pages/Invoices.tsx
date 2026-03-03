import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../lib/api'

export function Invoices(){
  const qc=useQueryClient(); const invoices=useQuery({queryKey:['inv'],queryFn:()=>api.request('/invoices')}); const cards=useQuery({queryKey:['cards'],queryFn:()=>api.request('/cards')})
  const [card,setCard]=useState(''); const [closeDay,setClose]=useState(8); const [dueDay,setDue]=useState(15)
  const createCard=useMutation({mutationFn:()=>api.request('/cards',{method:'POST',body:JSON.stringify({name:card,close_day:closeDay,due_day:dueDay})}),onSuccess:()=>qc.invalidateQueries({queryKey:['cards']})})
  const pay=useMutation({mutationFn:(x:any)=>api.request('/invoices/pay',{method:'POST',body:JSON.stringify(x)}),onSuccess:()=>qc.invalidateQueries({queryKey:['inv']})})
  const group=(s:string)=> (invoices.data||[]).filter((x:any)=>x.status===s)
  return <div><h2>Faturas</h2><div className='grid'><section><h3>Vencidas</h3>{group('Vencida').map((i:any)=><button key={i.invoice_key} onClick={()=>pay.mutate({card:i.card,invoice_key:i.invoice_key,amount:i.open,account:'Conta Corrente',method:'Pix'})}>{i.invoice_key} R$ {i.open}</button>)}</section><section><h3>Em aberto</h3>{group('Em aberto').map((i:any)=><div key={i.invoice_key}>{i.invoice_key} - {i.open}</div>)}</section><section><h3>Pagas</h3>{group('Fechada').map((i:any)=><div key={i.invoice_key}>{i.invoice_key}</div>)}</section></div><div className='card'><h3>Cartões</h3>{(cards.data||[]).map((c:any)=><div key={c.id}>{c.name} fecha {c.close_day} vence {c.due_day}</div>)}<input placeholder='nome' value={card} onChange={e=>setCard(e.target.value)} /><button onClick={()=>createCard.mutate()}>Adicionar cartão</button></div></div>
}
