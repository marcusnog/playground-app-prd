import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useEffect, useState, useMemo } from 'react'
import { usePermissions } from '../../hooks/usePermissions'
import { useCaixa } from '../../hooks/useCaixa'
import { Sun, Moon, Menu, X, LogOut } from 'lucide-react'
import {
	IcoDashboard, IcoTicket, IcoEdit, IcoLock,
	IcoCashRegister, IcoCar, IcoBarChart, IcoSettings,
	IcoUsers, IcoUser,
} from '../../ui/icons'

export default function DashboardLayout() {
	const { logout } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)

	const { caixas } = useCaixa()
	const { hasPermission, user } = usePermissions()
	const algumCaixaAberto = useMemo(() => {
		return !!caixas?.some((c) => c.status === 'aberto')
	}, [caixas])

	const [isLight, setIsLight] = useState(
		typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
	)

	function toggleTheme() {
		const next = isLight ? 'dark' : 'light'
		document.documentElement.dataset.theme = next
		setIsLight(!isLight)
		try { localStorage.setItem('app.theme', next) } catch { /* noop */ }
	}

	// Update page title
	const path = location.pathname
	let pageTitle = 'Dashboard'
	if (path.startsWith('/acompanhamento')) pageTitle = 'Acompanhamento'
	else if (path.startsWith('/lancamento')) pageTitle = 'Lançamento'
	else if (path.startsWith('/caixa')) pageTitle = 'Caixa'
	else if (path.startsWith('/parametros')) pageTitle = 'Parâmetros'
	else if (path.startsWith('/formas-pagamento')) pageTitle = 'Formas de Pagamento'
	else if (path.startsWith('/brinquedos')) pageTitle = 'Brinquedos'
	else if (path.startsWith('/clientes')) pageTitle = 'Clientes'
	else if (path.startsWith('/relatorios')) pageTitle = 'Relatórios'
	else if (path.startsWith('/pagamento')) pageTitle = 'Pagamento'
	else if (path.startsWith('/cortesia')) pageTitle = 'Cortesia'
	else if (path.startsWith('/recibo')) pageTitle = 'Recibo'

	useEffect(() => {
		document.title = `Playground - ${pageTitle}`
	}, [pageTitle])

	useEffect(() => {
		if (window.innerWidth <= 768) setSidebarOpen(false)
	}, [location.pathname])

	function onLogout() {
		logout()
		navigate('/login')
	}

	function toggleSubmenu(label: string) {
		setActiveSubmenu(activeSubmenu === label ? null : label)
	}

	const menuItems = useMemo(() => {
		const items = []

		if (hasPermission('acompanhamento')) {
			items.push({ label: 'Acompanhamento', path: '/acompanhamento', icon: <IcoDashboard /> })
		}
		if (hasPermission('cortesia')) {
			items.push({ label: 'Cortesia', path: '/cortesia', icon: <IcoTicket /> })
		}
		if (hasPermission('lancamento')) {
			items.push({
				label: 'Lançamento',
				path: '/lancamento',
				icon: algumCaixaAberto ? <IcoEdit /> : <IcoLock />,
				disabled: !algumCaixaAberto,
				status: algumCaixaAberto ? 'Caixa Aberto' : 'Caixa Fechado'
			})
		}
		if (hasPermission('caixa')) {
			const submenu = []
			if (hasPermission('parametros')) submenu.push({ label: 'Cadastro de Caixas', path: '/caixas' })
			if (hasPermission('caixa', 'abertura')) submenu.push({ label: 'Abertura', path: '/caixa/abertura' })
			if (hasPermission('caixa', 'fechamento')) submenu.push({ label: 'Fechamento', path: '/caixa/fechamento' })
			if (hasPermission('caixa', 'sangria')) submenu.push({ label: 'Sangria', path: '/caixa/sangria' })
			if (hasPermission('caixa', 'suprimento')) submenu.push({ label: 'Suprimento', path: '/caixa/suprimento' })
			if (submenu.length > 0) {
				items.push({
					label: 'Caixa',
					path: '/caixa/abertura',
					icon: <IcoCashRegister />,
					status: algumCaixaAberto ? 'Aberto' : 'Fechado',
					submenu
				})
			}
		}
		if (hasPermission('estacionamento')) {
			const submenu = []
			if (hasPermission('estacionamento', 'cadastro')) submenu.push({ label: 'Cadastro', path: '/estacionamentos' })
			if (hasPermission('estacionamento', 'caixa', 'abertura')) submenu.push({ label: 'Abertura Caixa', path: '/estacionamento/caixa/abertura' })
			if (hasPermission('estacionamento', 'caixa', 'fechamento')) submenu.push({ label: 'Fechamento Caixa', path: '/estacionamento/caixa/fechamento' })
			if (hasPermission('estacionamento', 'lancamento')) submenu.push({ label: 'Lançamento', path: '/estacionamento/lancamento' })
			if (hasPermission('estacionamento', 'acompanhamento')) submenu.push({ label: 'Acompanhamento', path: '/estacionamento/acompanhamento' })
			if (submenu.length > 0) {
				items.push({ label: 'Estacionamento', path: '/estacionamento/lancamento', icon: <IcoCar />, submenu })
			}
		}
		if (hasPermission('relatorios')) {
			items.push({ label: 'Relatórios', path: '/relatorios', icon: <IcoBarChart /> })
		}
		if (hasPermission('parametros')) {
			const submenu = []
			if (hasPermission('parametros', 'empresa')) submenu.push({ label: 'Cadastro da Empresa', path: '/parametros' })
			if (hasPermission('parametros', 'formasPagamento')) submenu.push({ label: 'Formas de Pagamento', path: '/formas-pagamento' })
			if (hasPermission('parametros', 'brinquedos')) submenu.push({ label: 'Brinquedos', path: '/brinquedos' })
			if (submenu.length > 0) {
				items.push({ label: 'Parâmetros', path: '/parametros', icon: <IcoSettings />, submenu })
			}
		}
		if (hasPermission('clientes')) {
			items.push({ label: 'Clientes', path: '/clientes', icon: <IcoUsers /> })
		}
		if (hasPermission('parametros')) {
			items.push({ label: 'Usuários', path: '/usuarios', icon: <IcoUser /> })
		}

		return items
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user, algumCaixaAberto, hasPermission])

	return (
		<div className="app-layout">
			{/* Mobile Header */}
			<header className="mobile-header">
				<button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
					{sidebarOpen ? <X size={22} /> : <Menu size={22} />}
				</button>
				<Link to="/acompanhamento" className="brand">
					<img src={`${import.meta.env.BASE_URL}playground_parking_icon.svg`} alt="" className="brand-icon" aria-hidden="true" />
					<span className="brand-name">Playground</span>
				</Link>
				<div className="mobile-actions">
					<button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Alternar tema">
						{isLight ? <Moon size={18} /> : <Sun size={18} />}
					</button>
				</div>
			</header>

			{/* Sidebar */}
			<aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
				<div className="sidebar-header">
					<Link to="/acompanhamento" className="brand">
						<img src={`${import.meta.env.BASE_URL}playground_parking_icon.svg`} alt="" className="brand-icon" aria-hidden="true" />
						<span className="brand-name">Playground</span>
					</Link>
					<button className="close-sidebar" onClick={() => setSidebarOpen(false)}>
						<X size={20} />
					</button>
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
													<span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 'normal' }}>
														{item.status}
													</span>
												)}
											</div>
										</NavLink>
										<button
											className="nav-toggle"
											onClick={() => toggleSubmenu(item.label)}
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
												onClick={() => setSidebarOpen(false)}
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
									onClick={() => setSidebarOpen(false)}
									style={{ opacity: item.disabled ? 0.6 : 1 }}
								>
									<span className="nav-icon">{item.icon}</span>
									<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
										<span className="nav-label">{item.label}</span>
										{item.status && (
											<span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 'normal' }}>
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
						<div className="user-actions-row">
							{user && <span className="user-name">{user.apelido || user.username}</span>}
							<button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Alternar tema">
								{isLight ? <Moon size={16} /> : <Sun size={16} />}
							</button>
						</div>
						<button className="btn btn-logout icon" onClick={onLogout}>
							<LogOut size={15} />
							Sair
						</button>
					</div>
				</div>
			</aside>

			{/* Overlay */}
			{sidebarOpen && (
				<div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
			)}

			{/* Main Content */}
			<main className="main-content">
				<Outlet />
			</main>

		</div>
	)
}
