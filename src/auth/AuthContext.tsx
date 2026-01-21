import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService, type LoginResponse } from '../services/authService'
import { api } from '../services/api'

type User = {
	id: string
	username: string
	apelido: string
	permissoes: LoginResponse['user']['permissoes']
	usaCaixa: boolean
	caixaId?: string
}

type AuthContextValue = {
	user: User | null
	isAuthenticated: boolean
	login: (username: string, password: string) => Promise<boolean>
	logout: () => void
	loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_STORAGE_KEY = 'app.auth.user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function loadUser() {
			try {
				// Primeiro, verificar se há token salvo e restaurá-lo
				const authData = localStorage.getItem('app.auth.token')
				if (authData) {
					try {
						const parsed = JSON.parse(authData)
						if (parsed.token) {
							// Restaurar token na API
							api.setToken(parsed.token)
						}
					} catch {}
				}

				// Tentar buscar usuário atual da API
				const currentUser = await authService.getCurrentUser()
				if (currentUser) {
					setUser(currentUser)
					// Salvar no localStorage também para referência
					localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser))
				} else {
					// Fallback: tentar carregar do localStorage
					const raw = localStorage.getItem(AUTH_STORAGE_KEY)
					if (raw) {
						try {
							const saved = JSON.parse(raw)
							// Verificar se há token antes de usar dados do localStorage
							if (authData) {
								setUser(saved)
							}
						} catch {}
					}
				}
			} catch (error) {
				console.error('Erro ao carregar usuário:', error)
				// Fallback: tentar carregar do localStorage apenas se houver token
				try {
					const authData = localStorage.getItem('app.auth.token')
					if (authData) {
						const raw = localStorage.getItem(AUTH_STORAGE_KEY)
						if (raw) {
							const saved = JSON.parse(raw)
							setUser(saved)
						}
					}
				} catch {}
			} finally {
				setLoading(false)
			}
		}
		
		loadUser()

		// Ouvir evento de logout para limpar estado
		const handleLogout = () => {
			setUser(null)
			localStorage.removeItem(AUTH_STORAGE_KEY)
		}
		window.addEventListener('auth:logout', handleLogout)
		
		return () => {
			window.removeEventListener('auth:logout', handleLogout)
		}
	}, [])

	const login = useCallback(async (username: string, password: string) => {
		if (!username || !password) return false
		
		setLoading(true)
		try {
			const response = await authService.login(username, password)
			
			if (!response || !response.user) {
				setLoading(false)
				return false
			}
			
			const nextUser: User = {
				id: response.user.id,
				username: response.user.username,
				apelido: response.user.apelido,
				permissoes: response.user.permissoes,
				usaCaixa: response.user.usaCaixa,
				caixaId: response.user.caixaId,
			}
			
			setUser(nextUser)
			localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
			setLoading(false)
			return true
		} catch (error) {
			console.error('Erro no login:', error)
			setLoading(false)
			return false
		}
	}, [])

	const logout = useCallback(async () => {
		setLoading(true)
		try {
			await authService.logout()
		} catch (error) {
			console.error('Erro no logout:', error)
		} finally {
			setUser(null)
			localStorage.removeItem(AUTH_STORAGE_KEY)
			setLoading(false)
		}
	}, [])

	const value = useMemo<AuthContextValue>(() => ({
		user,
		isAuthenticated: !!user,
		login,
		logout,
		loading,
	}), [login, logout, user, loading])

	return (
		<AuthContext.Provider value={value}>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const ctx = useContext(AuthContext)
	if (!ctx) throw new Error('useAuth must be used within AuthProvider')
	return ctx
}


