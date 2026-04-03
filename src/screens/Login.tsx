import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
	const { login, isAuthenticated, loading } = useAuth()
	const navigate = useNavigate()

	useEffect(() => {
		document.title = 'Playground - Login'
	}, [])

	useEffect(() => {
		if (!loading && isAuthenticated) {
			navigate('/acompanhamento', { replace: true })
		}
	}, [isAuthenticated, loading, navigate])

	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	async function onSubmit(e: FormEvent) {
		e.preventDefault()
		setError('')
		setSubmitting(true)
		try {
			const ok = await login(username.trim(), password)
			if (!ok) {
				setError('Usuário ou senha inválidos')
				return
			}
			navigate('/acompanhamento', { replace: true })
		} catch {
			setError('Erro ao fazer login. Tente novamente.')
		} finally {
			setSubmitting(false)
		}
	}

	if (loading) {
		return (
			<div className="login-root">
				<div className="login-spinner-wrap">
					<span className="login-spinner" />
				</div>
			</div>
		)
	}

	return (
		<div className="login-root">
			{/* Left panel — branding */}
			<div className="login-brand-panel">
				<div className="login-brand-inner">
					<div className="login-brand-logo">
						<img
							src={`${import.meta.env.BASE_URL}playground_parking_icon.svg`}
							alt="Playground"
							className="login-brand-img"
						/>
					</div>
					<h1 className="login-brand-title">Playground</h1>
					<p className="login-brand-sub">
						Gestão completa do seu espaço de recreação
					</p>
					<ul className="login-feature-list">
						{['Lançamentos em tempo real', 'Controle de caixa', 'Estacionamento', 'Relatórios e dashboard'].map(f => (
							<li key={f} className="login-feature-item">
								<span className="login-feature-dot" />
								{f}
							</li>
						))}
					</ul>
				</div>
				<div className="login-brand-orb login-brand-orb-1" />
				<div className="login-brand-orb login-brand-orb-2" />
			</div>

			{/* Right panel — form */}
			<div className="login-form-panel">
				<div className="login-form-inner">
					<div className="login-form-header">
						<h2 className="login-form-title">Bem-vindo de volta</h2>
						<p className="login-form-subtitle">Acesse sua conta para continuar</p>
					</div>

					<form className="login-form" onSubmit={onSubmit}>
						<label className="login-field">
							<span className="login-label">Usuário</span>
							<input
								className="login-input"
								value={username}
								onChange={e => setUsername(e.target.value)}
								placeholder="Apelido ou nome completo"
								autoComplete="username"
								autoFocus
							/>
						</label>

						<label className="login-field">
							<span className="login-label">Senha</span>
							<input
								className="login-input"
								type="password"
								value={password}
								onChange={e => setPassword(e.target.value)}
								placeholder="••••••••"
								autoComplete="current-password"
							/>
						</label>

						{error && (
							<div className="login-error">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
									<circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
								</svg>
								{error}
							</div>
						)}

						<button className="login-btn" type="submit" disabled={submitting}>
							{submitting ? (
								<><span className="login-spinner login-spinner-sm" /> Entrando…</>
							) : 'Entrar'}
						</button>
					</form>
				</div>
			</div>
		</div>
	)
}
