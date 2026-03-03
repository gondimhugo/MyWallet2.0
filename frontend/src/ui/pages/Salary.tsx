import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../lib/api'

export function Salary(){
  const profile=useQuery({queryKey:['salary'],queryFn:()=>api.request('/salary-profile')})
  const [form,setForm]=useState<any>({monthly_salary:0,mode:'mensal',day1:5,day2:20,default_method:'Transferência',default_account:'Conta Corrente'})
  const save=useMutation({mutationFn:()=>api.request('/salary-profile',{method:'PUT',body:JSON.stringify(form)})})
  return <div><h2>Salário</h2><pre className='card'>{JSON.stringify(profile.data,null,2)}</pre><div className='card'>{Object.keys(form).map(k=><input key={k} value={form[k]} onChange={e=>setForm({...form,[k]:['monthly_salary','day1','day2'].includes(k)?Number(e.target.value):e.target.value})} placeholder={k}/>)}<button onClick={()=>save.mutate()}>Salvar perfil</button></div></div>
}
