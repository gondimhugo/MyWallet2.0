import { useState } from 'react'
import { api } from '../../lib/api'

export function Login({ onLogin }: { onLogin: (pair: { access_token: string; refresh_token: string }) => void }) {
  const [email, setEmail] = useState('demo@mywallet.app')
  const [password, setPassword] = useState('123456')
  return <div className='card'><h2>Entrar</h2><input value={email} onChange={(e)=>setEmail(e.target.value)} /><input type='password' value={password} onChange={(e)=>setPassword(e.target.value)} /><button onClick={async()=>{ try{onLogin(await api.request('/auth/login',{method:'POST', body: JSON.stringify({email,password})}))}catch{onLogin(await api.request('/auth/register',{method:'POST', body: JSON.stringify({email,password,full_name:'Demo'})}))} }}>Entrar / Registrar</button></div>
}
