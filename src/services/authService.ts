import { api } from './api'
import endpoints from './apiEndpoints'
import { config } from '../config'
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

	async validarDesconto(apelido: string, password: string): Promise<boolean> {
		try {
			// Usar fetch direto para evitar que 401 deslogue o operador (o 401 é das credenciais do supervisor)
			const res = await fetch(`${config.apiBaseUrl}${endpoints.auth.validarDesconto}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ apelido, password }),
			})
			if (!res.ok) return false
			return true
		} catch (error) {
			console.error('Erro ao validar desconto:', error)
			return false
		}
	},
}

