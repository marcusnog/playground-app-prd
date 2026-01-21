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
	
	// Verificar se está em produção
	// Em produção, o hostname não será localhost
	const isProduction = typeof window !== 'undefined' 
		? window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
		: import.meta.env.MODE === 'production' || import.meta.env.PROD
	
	if (isProduction) {
		return DEFAULT_PRODUCTION_URL
	}
	
	// Caso contrário, usa localhost (desenvolvimento)
	return DEFAULT_DEVELOPMENT_URL
}

const apiBaseUrl = getApiBaseUrl()

// Log da URL final para debug (sempre visível)
if (typeof window !== 'undefined') {
	console.log('[Config] API Base URL configurada:', apiBaseUrl)
	if (import.meta.env.DEV) {
		console.log('[Config] Ambiente:', {
			MODE: import.meta.env.MODE,
			PROD: import.meta.env.PROD,
			DEV: import.meta.env.DEV,
			hostname: window.location.hostname,
			VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL
		})
	}
}

export const config = {
	apiBaseUrl,
	apiTimeout: 30000, // 30 segundos
}

