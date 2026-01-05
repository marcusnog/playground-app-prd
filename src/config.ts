// Configuração da aplicação
// Permite usar variáveis de ambiente ou valores padrão

export const config = {
	apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://playground-backend-ijgt.onrender.com',
	apiTimeout: 30000, // 30 segundos
}

