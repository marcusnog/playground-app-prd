// API Service - Integração com backend em produção
import { config } from '../config'

const API_BASE_URL = config.apiBaseUrl

export type ApiError = {
	message: string
	status?: number
}

class ApiService {
	private baseUrl: string
	private token: string | null = null

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl
		// Carregar token do localStorage se existir
		if (typeof window !== 'undefined') {
			const authData = localStorage.getItem('app.auth.token')
			if (authData) {
				try {
					const parsed = JSON.parse(authData)
					this.token = parsed.token
				} catch {}
			}
		}
	}

	setToken(token: string | null) {
		this.token = token
		if (token && typeof window !== 'undefined') {
			localStorage.setItem('app.auth.token', JSON.stringify({ token }))
		} else if (typeof window !== 'undefined') {
			localStorage.removeItem('app.auth.token')
		}
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...(options.headers as Record<string, string> || {}),
		}

		if (this.token) {
			headers['Authorization'] = `Bearer ${this.token}`
		}

		try {
			const response = await fetch(url, {
				...options,
				headers,
			})

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({
					message: response.statusText || 'Erro na requisição',
				}))
				throw {
					message: errorData.message || errorData.error || 'Erro na requisição',
					status: response.status,
				} as ApiError
			}

			// Se a resposta estiver vazia, retornar null
			const contentType = response.headers.get('content-type')
			if (!contentType || !contentType.includes('application/json')) {
				return null as T
			}

			return await response.json()
		} catch (error) {
			if (error && typeof error === 'object' && 'message' in error) {
				throw error
			}
			throw {
				message: error instanceof Error ? error.message : 'Erro de conexão',
			} as ApiError
		}
	}

	async get<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'GET' })
	}

	async post<T>(endpoint: string, data?: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined,
		})
	}

	async put<T>(endpoint: string, data?: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined,
		})
	}

	async patch<T>(endpoint: string, data?: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PATCH',
			body: data ? JSON.stringify(data) : undefined,
		})
	}

	async delete<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'DELETE' })
	}
}

export const api = new ApiService(API_BASE_URL)

