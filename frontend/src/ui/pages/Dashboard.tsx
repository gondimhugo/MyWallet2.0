import { useQuery } from '@tanstack/react-query'
import { Pie, PieChart, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { api } from '../../lib/api'

export function Dashboard() {
  const now = new Date(); const start = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`; const end = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-31`
  const kpis = useQuery({queryKey:['kpi',start,end], queryFn:()=>api.request(`/dashboard/kpis?startISO=${start}&endISO=${end}`)})
  const debt = useQuery({queryKey:['debt'], queryFn:()=>api.request('/dashboard/debt')})
  const tx = useQuery({queryKey:['tx'], queryFn:()=>api.request('/transactions')})
  const pie = Object.entries((tx.data||[]).reduce((a:any,t:any)=>{ if(t.direction==='Saída') a[t.category||'Outros']=(a[t.category||'Outros']||0)+t.amount; return a},{}) ).map(([name,value])=>({name,value}))
  const series = (tx.data||[]).map((t:any)=>({date:t.date,saldo:t.direction==='Entrada'?t.amount:-t.amount}))
  return <div><h2>Dashboard</h2><div className='grid'>{Object.entries(kpis.data||{}).map(([k,v])=><div key={k} className='card'><strong>{k}</strong><div>R$ {Number(v).toFixed(2)}</div></div>)}</div><h3>Dívida por Salário</h3><pre className='card'>{JSON.stringify(debt.data,null,2)}</pre><div className='grid'><div className='card'><PieChart width={320} height={240}><Pie data={pie} dataKey='value' nameKey='name' outerRadius={90} /><Tooltip/></PieChart></div><div className='card'><LineChart width={420} height={240} data={series}><CartesianGrid strokeDasharray='3 3'/><XAxis dataKey='date'/><YAxis/><Tooltip/><Line type='monotone' dataKey='saldo' /></LineChart></div></div></div>
}
