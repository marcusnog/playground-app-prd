import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { db, type Usuario } from '../services/mockDb'

type User = {
	id: string
	username: string
	apelido: string
	permissoes: Usuario['permissoes']
	usaCaixa: boolean
	caixaId?: string
}

type AuthContextValue = {
	user: User | null
	isAuthenticated: boolean
	login: (username: string, password: string) => Promise<boolean>
	logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_STORAGE_KEY = 'app.auth.user'

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<User | null>(null)

	useEffect(() => {
		try {
			const raw = localStorage.getItem(AUTH_STORAGE_KEY)
			if (raw) {
				const saved = JSON.parse(raw)
				// Verificar se o usuário ainda existe no banco
				const usuarios = db.get().usuarios
				const usuario = usuarios.find(u => u.id === saved.id)
				if (usuario) {
					setUser({
						id: usuario.id,
						username: usuario.apelido,
						apelido: usuario.apelido,
						permissoes: usuario.permissoes,
						usaCaixa: usuario.usaCaixa,
						caixaId: usuario.caixaId,
					})
				} else {
					localStorage.removeItem(AUTH_STORAGE_KEY)
				}
			}
		} catch {}
	}, [])

	const login = useCallback(async (username: string, password: string) => {
		if (!username || !password) return false
		
		// Buscar usuário no banco de dados
		const usuarios = db.get().usuarios
		const usuario = usuarios.find(u => 
			(u.apelido.toLowerCase() === username.toLowerCase() || 
			 u.nomeCompleto.toLowerCase() === username.toLowerCase()) &&
			u.senha === password
		)
		
		if (!usuario) return false
		
		const nextUser: User = {
			id: usuario.id,
			username: usuario.apelido,
			apelido: usuario.apelido,
			permissoes: usuario.permissoes,
			usaCaixa: usuario.usaCaixa,
			caixaId: usuario.caixaId,
		}
		
		setUser(nextUser)
		localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
		return true
	}, [])

	const logout = useCallback(() => {
		setUser(null)
		localStorage.removeItem(AUTH_STORAGE_KEY)
	}, [])

	const value = useMemo<AuthContextValue>(() => ({
		user,
		isAuthenticated: !!user,
		login,
		logout,
	}), [login, logout, user])

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


