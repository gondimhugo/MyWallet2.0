import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../lib/api'

const initial = { date:new Date().toISOString().slice(0,10), direction:'Saída', amount:0, method:'Pix', account:'Conta Corrente', card:'', kind:'Normal', category:'', subcategory:'', description:'', notes:'' }

export function Transactions(){
  const [form,setForm]=useState<any>(initial); const qc=useQueryClient()
  const tx=useQuery({queryKey:['tx'], queryFn:()=>api.request('/transactions')}); const cards=useQuery({queryKey:['cards'], queryFn:()=>api.request('/cards')})
  const create=useMutation({mutationFn:()=>api.request('/transactions',{method:'POST',body:JSON.stringify(form)}), onSuccess:()=>{qc.invalidateQueries({queryKey:['tx']}); setForm(initial)}})
  return <div><h2>Lançamentos</h2><div className='card form'>{Object.keys(initial).map(k=>k==='notes'?<textarea key={k} placeholder={k} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/>:<input key={k} placeholder={k} value={form[k]} onChange={e=>setForm({...form,[k]:k==='amount'?Number(e.target.value):e.target.value})}/>)}{form.method==='Crédito' && <small>Preview: cartão {form.card || cards.data?.[0]?.name}</small>}<button onClick={()=>create.mutate()}>Salvar</button></div><table><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Método</th><th>Fatura</th></tr></thead><tbody>{(tx.data||[]).map((t:any)=><tr key={t.id}><td>{t.date}</td><td>{t.description}</td><td>{t.amount}</td><td>{t.method}</td><td>{t.invoice_key}</td></tr>)}</tbody></table></div>
}
