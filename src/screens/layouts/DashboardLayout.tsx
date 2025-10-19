import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useEffect } from 'react'

export default function DashboardLayout() {
	const { logout } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()

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
	else if (path.startsWith('/parametros')) pageTitle = 'Parâmetros'
	else if (path.startsWith('/formas-pagamento')) pageTitle = 'Formas de Pagamento'
	else if (path.startsWith('/brinquedos')) pageTitle = 'Brinquedos'
	else if (path.startsWith('/pagamento')) pageTitle = 'Pagamento'
	else if (path.startsWith('/recibo')) pageTitle = 'Recibo'

	useEffect(() => {
		document.title = `Playground - ${pageTitle}`
	}, [pageTitle])

	function onLogout() {
		logout()
		navigate('/login')
	}


	return (
		<div>
			<header className="app-header">
				<Link to="/acompanhamento" className="brand">Parque</Link>
				<nav className="app-nav" style={{ flex: 1 }}>
					<NavLink to="/acompanhamento">Acompanhamento</NavLink>
					<NavLink to="/lancamento">Lançamento</NavLink>
					<NavLink to="/caixa">Caixa</NavLink>
					<NavLink to="/parametros">Parâmetros</NavLink>
					<NavLink to="/formas-pagamento">Formas de Pagamento</NavLink>
					<NavLink to="/brinquedos">Brinquedos</NavLink>
				</nav>
				<div className="row" style={{ alignItems: 'center', marginLeft: 'auto' }}>
					<label className="switch">
						<span className="icon sun">☀️</span>
						<input type="checkbox" onChange={toggleTheme} defaultChecked={isLight} />
						<span className="slider"></span>
						<span className="icon moon">🌙</span>
					</label>
					<button className="btn" onClick={onLogout}>Sair</button>
				</div>
			</header>
			<main className="page container">
				<Outlet />
			</main>
		</div>
	)
}


