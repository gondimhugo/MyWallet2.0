import { api } from '../../lib/api'

export function Settings(){
  return <div><h2>Config</h2><div className='card'><button onClick={()=>window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/settings/export-csv`)}>Exportar CSV</button><button onClick={()=>api.request('/settings/reset',{method:'POST'})}>Resetar dados</button></div></div>
}
