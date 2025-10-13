import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useEffect, useState, useMemo } from 'react'
import { db } from '../../services/mockDb'

export default function DashboardLayout() {
	const { logout } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
	
	// Verificar status do caixa
	const caixaAberto = useMemo(() => {
		const caixas = db.get().caixas
		return caixas.find((c) => c.status === 'aberto')
	}, [])

	function toggleTheme() {
		const isLight = document.documentElement.dataset.theme === 'light'
		const next = isLight ? 'dark' : 'light'
		document.documentElement.dataset.theme = next
		try { localStorage.setItem('app.theme', next) } catch {}
	}

	const isLight = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'

	// Update page title based on current route
	const path = location.pathname
	let pageTitle = 'Dashboard'
	if (path.startsWith('/acompanhamento')) pageTitle = 'Acompanhamento'
	else if (path.startsWith('/lancamento')) pageTitle = 'Lançamento'
	else if (path.startsWith('/caixa')) pageTitle = 'Caixa'
	else if (path.startsWith('/relatorios')) pageTitle = 'Relatórios'
	else if (path.startsWith('/parametros')) pageTitle = 'Parâmetros'
	else if (path.startsWith('/formas-pagamento')) pageTitle = 'Formas de Pagamento'
	else if (path.startsWith('/brinquedos')) pageTitle = 'Brinquedos'
	else if (path.startsWith('/pagamento')) pageTitle = 'Pagamento'
	else if (path.startsWith('/recibo')) pageTitle = 'Recibo'

	useEffect(() => {
		document.title = `Playground - ${pageTitle}`
	}, [pageTitle])

	// Close sidebar when route changes on mobile
	useEffect(() => {
		if (window.innerWidth < 768) {
			setSidebarOpen(false)
		}
	}, [location.pathname])

	function onLogout() {
		logout()
		navigate('/login')
	}

	const toggleSidebar = () => {
		setSidebarOpen(!sidebarOpen)
	}

	const toggleSubmenu = (menu: string) => {
		setActiveSubmenu(activeSubmenu === menu ? null : menu)
	}

	const menuItems = [
		{
			label: 'Acompanhamento',
			path: '/acompanhamento',
			icon: '📊'
		},
		{
			label: 'Lançamento',
			path: '/lancamento',
			icon: caixaAberto ? '📝' : '🔒',
			disabled: !caixaAberto,
			status: caixaAberto ? 'Caixa Aberto' : 'Caixa Fechado'
		},
		{
			label: 'Caixa',
			path: '/caixa',
			icon: caixaAberto ? '✅' : '💰',
			status: caixaAberto ? 'Aberto' : 'Fechado'
		},
		{
			label: 'Relatórios',
			path: '/relatorios',
			icon: '📈'
		},
		{
			label: 'Parâmetros',
			path: '/parametros',
			icon: '⚙️',
			submenu: [
				{ label: 'Formas de Pagamento', path: '/formas-pagamento' },
				{ label: 'Brinquedos', path: '/brinquedos' }
			]
		}
	]

	return (
		<div className="app-layout">
			{/* Mobile Header */}
			<header className="mobile-header">
				<button className="menu-toggle" onClick={toggleSidebar}>
					<span></span>
					<span></span>
					<span></span>
				</button>
				<Link to="/acompanhamento" className="brand">Parque</Link>
				<div className="mobile-actions">
					<label className="switch">
						<span className="icon sun">☀️</span>
						<input type="checkbox" onChange={toggleTheme} defaultChecked={isLight} />
						<span className="slider"></span>
						<span className="icon moon">🌙</span>
					</label>
					<button className="btn" onClick={onLogout}>Sair</button>
				</div>
			</header>

			{/* Sidebar */}
			<aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
				<div className="sidebar-header">
					<Link to="/acompanhamento" className="brand">Parque</Link>
					<button className="close-sidebar" onClick={toggleSidebar}>×</button>
				</div>
				
				<nav className="sidebar-nav">
					{menuItems.map((item, index) => (
						<div key={index} className="nav-item">
							{item.submenu ? (
								<>
									<div className="nav-link-container">
										<NavLink 
											to={item.path} 
											className={`nav-link ${item.disabled ? 'disabled' : ''}`}
											style={{ opacity: item.disabled ? 0.6 : 1, flex: 1 }}
										>
											<span className="nav-icon">{item.icon}</span>
											<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
												<span className="nav-label">{item.label}</span>
												{item.status && (
													<span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 'normal' }}>
														{item.status}
													</span>
												)}
											</div>
										</NavLink>
										<button 
											className="nav-toggle"
											onClick={() => toggleSubmenu(item.label)}
											style={{ padding: '12px 8px', minWidth: '40px' }}
										>
											<span className={`nav-arrow ${activeSubmenu === item.label ? 'open' : ''}`}>▼</span>
										</button>
									</div>
									<div className={`submenu ${activeSubmenu === item.label ? 'open' : ''}`}>
										{item.submenu.map((subItem, subIndex) => (
											<NavLink 
												key={subIndex} 
												to={subItem.path}
												className="submenu-item"
											>
												{subItem.label}
											</NavLink>
										))}
									</div>
								</>
							) : (
								<NavLink 
									to={item.path} 
									className={`nav-link ${item.disabled ? 'disabled' : ''}`}
									style={{ opacity: item.disabled ? 0.6 : 1 }}
								>
									<span className="nav-icon">{item.icon}</span>
									<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
										<span className="nav-label">{item.label}</span>
										{item.status && (
											<span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 'normal' }}>
												{item.status}
											</span>
										)}
									</div>
								</NavLink>
							)}
						</div>
					))}
				</nav>

				<div className="sidebar-footer">
					<div className="user-actions">
						<label className="switch">
							<span className="icon sun">☀️</span>
							<input type="checkbox" onChange={toggleTheme} defaultChecked={isLight} />
							<span className="slider"></span>
							<span className="icon moon">🌙</span>
						</label>
						<button className="btn" onClick={onLogout}>Sair</button>
					</div>
				</div>
			</aside>

			{/* Overlay for mobile */}
			{sidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}

			{/* Main Content */}
			<main className="main-content">
				<div className="page container">
					<Outlet />
				</div>
			</main>
		</div>
	)
}


