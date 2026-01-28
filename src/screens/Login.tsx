import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export default function Login() {
	const { login, isAuthenticated, loading } = useAuth()
	const navigate = useNavigate()
	
	useEffect(() => {
		document.title = 'Playground - Login'
	}, [])

	// Redirecionar se já estiver autenticado
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
		} catch (err) {
			setError('Erro ao fazer login. Tente novamente.')
		} finally {
			setSubmitting(false)
		}
	}

	// Mostrar loading enquanto verifica autenticação
	if (loading) {
		return (
			<div className="container" style={{ maxWidth: 420, margin: '64px auto' }}>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 420, margin: '64px auto' }}>
			<div className="card">
				<h2>Login</h2>
				<form className="form" onSubmit={onSubmit}>
					<label className="field">
						<span>Usuário</span>
						<input className="input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Apelido ou nome completo" />
					</label>
					<label className="field">
						<span>Senha</span>
						<input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="senha" />
					</label>
					{error && <div style={{ color: '#ef4444', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>{error}</div>}
					<div className="actions">
						<button className="btn primary" type="submit" disabled={submitting}>
							{submitting ? 'Entrando...' : 'Entrar'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}


