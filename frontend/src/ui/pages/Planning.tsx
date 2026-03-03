import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts'
import { api } from '../../lib/api'

export function Planning(){
  const [input,setInput]=useState<any>({startISO:new Date().toISOString().slice(0,10),horizonMode:'days30',includeInvoices:true,creditAsCash:false})
  const run=useMutation({mutationFn:()=>api.request('/planning/run',{method:'POST',body:JSON.stringify(input)})})
  return <div><h2>Planejamento</h2><div className='card'><input value={input.startISO} onChange={e=>setInput({...input,startISO:e.target.value})}/><select value={input.horizonMode} onChange={e=>setInput({...input,horizonMode:e.target.value})}><option>nextSalary</option><option>nextDue</option><option>days30</option><option>days60</option><option>custom</option></select><button onClick={()=>run.mutate()}>Simular</button></div>{run.data && <div className='card'><p>Base: {run.data.baseCash} | Min: {run.data.minCash} em {run.data.minDateISO} | Final: {run.data.endCash}</p><LineChart width={600} height={240} data={run.data.series}><XAxis dataKey='date'/><YAxis/><Tooltip/><Line dataKey='cash'/></LineChart><pre>{JSON.stringify(run.data.events,null,2)}</pre></div>}</div>
}
