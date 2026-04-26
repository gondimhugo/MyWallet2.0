import { Link, Outlet, useLocation } from 'react-router-dom'

const tabs = [
  ['/', 'Dashboard'],
  ['/transactions', 'Lançamentos'],
  ['/accounts', 'Contas'],
  ['/invoices', 'Faturas'],
  ['/planning', 'Planejamento'],
  ['/salary', 'Salário'],
  ['/profile', 'Perfil'],
  ['/settings', 'Config'],
]

export function Layout({ onLogout }: { onLogout: () => void }) {
  const loc = useLocation()
  return (
    <div className="app-shell">
      <header className='topbar'>
        <div className='brand'>
          <span className='logo-pill'>MyWallet</span>
        </div>
        <nav className='nav'>
          {tabs.map(([to, label]) => (
            <Link key={to} className={loc.pathname === to ? 'active' : ''} to={to}>{label}</Link>
          ))}
        </nav>
        <div className='top-actions'>
          <button className='btn btn-ghost' onClick={onLogout}>Sair</button>
        </div>
      </header>
      <main className='container'>
        <Outlet />
      </main>
    </div>
  )
}
