import { Link, Outlet, useLocation } from 'react-router-dom'

const tabs = [
  ['/', 'Dashboard'], ['/transactions', 'Lançamentos'], ['/invoices', 'Faturas'], ['/planning', 'Planejamento'], ['/salary', 'Salário'], ['/settings', 'Config'],
]

export function Layout({ onLogout }: { onLogout: () => void }) {
  const loc = useLocation()
  return <div><header className='topbar'><strong>MyWallet</strong>{tabs.map(([to, label]) => <Link key={to} className={loc.pathname===to?'active':''} to={to}>{label}</Link>)}<button onClick={onLogout}>Sair</button></header><main className='container'><Outlet /></main></div>
}
