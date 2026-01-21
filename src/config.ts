// Configuração da aplicação
// Permite usar variáveis de ambiente ou valores padrão

// URL padrão do backend em produção (Render)
const DEFAULT_PRODUCTION_URL = 'https://playground-backend-ijgt.onrender.com'
// URL padrão do backend em desenvolvimento
const DEFAULT_DEVELOPMENT_URL = 'http://localhost:3001'

// Determina a URL base da API
// Prioridade: VITE_API_BASE_URL > produção > desenvolvimento
function getApiBaseUrl(): string {
	// Se a variável de ambiente estiver definida, usa ela
	if (import.meta.env.VITE_API_BASE_URL) {
		return import.meta.env.VITE_API_BASE_URL
	}
	
	// Se estiver em modo produção (build), usa a URL de produção
	if (import.meta.env.MODE === 'production' || import.meta.env.PROD) {
		return DEFAULT_PRODUCTION_URL
	}
	
	// Caso contrário, usa localhost (desenvolvimento)
	return DEFAULT_DEVELOPMENT_URL
}

export const config = {
	apiBaseUrl: getApiBaseUrl(),
	apiTimeout: 30000, // 30 segundos
}

