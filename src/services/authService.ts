import { api } from './api'
import endpoints from './apiEndpoints'
import type { Usuario } from './mockDb'

export type LoginResponse = {
	token: string
	user: {
		id: string
		username: string
		apelido: string
		permissoes: Usuario['permissoes']
		usaCaixa: boolean
		caixaId?: string
	}
}

export const authService = {
	async login(username: string, password: string): Promise<LoginResponse | null> {
		try {
			const response = await api.post<LoginResponse>(endpoints.auth.login, {
				username,
				password,
			})
			
			if (response && response.token) {
				api.setToken(response.token)
				return response
			}
			
			return null
		} catch (error) {
			console.error('Erro no login:', error)
			return null
		}
	},

	async logout(): Promise<void> {
		try {
			await api.post(endpoints.auth.logout)
		} catch (error) {
			console.error('Erro no logout:', error)
		} finally {
			api.setToken(null)
		}
	},

	async getCurrentUser() {
		try {
			const response = await api.get<LoginResponse['user']>(endpoints.auth.me)
			return response
		} catch (error) {
			console.error('Erro ao buscar usuário atual:', error)
			return null
		}
	},
}

