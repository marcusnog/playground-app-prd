// API Endpoints - Mapeamento dos endpoints do backend
// Este arquivo centraliza todas as rotas da API

const endpoints = {
	// Autenticação
	auth: {
		login: '/api/auth/login',
		logout: '/api/auth/logout',
		me: '/api/auth/me',
		refresh: '/api/auth/refresh',
	},

	// Usuários
	usuarios: {
		list: '/api/usuarios',
		get: (id: string) => `/api/usuarios/${id}`,
		create: '/api/usuarios',
		update: (id: string) => `/api/usuarios/${id}`,
		delete: (id: string) => `/api/usuarios/${id}`,
	},

	// Caixas
	caixas: {
		list: '/api/caixas',
		get: (id: string) => `/api/caixas/${id}`,
		create: '/api/caixas',
		update: (id: string) => `/api/caixas/${id}`,
		delete: (id: string) => `/api/caixas/${id}`,
		abrir: (id: string) => `/api/caixas/${id}/abrir`,
		fechar: (id: string) => `/api/caixas/${id}/fechar`,
		movimentos: (id: string) => `/api/caixas/${id}/movimentos`,
		sangria: (id: string) => `/api/caixas/${id}/sangria`,
		suprimento: (id: string) => `/api/caixas/${id}/suprimento`,
	},

	// Lançamentos
	lancamentos: {
		list: '/api/lancamentos',
		get: (id: string) => `/api/lancamentos/${id}`,
		create: '/api/lancamentos',
		update: (id: string) => `/api/lancamentos/${id}`,
		delete: (id: string) => `/api/lancamentos/${id}`,
		pagar: (id: string) => `/api/lancamentos/${id}/pagar`,
		cancelar: (id: string) => `/api/lancamentos/${id}/cancelar`,
	},

	// Clientes
	clientes: {
		list: '/api/clientes',
		get: (id: string) => `/api/clientes/${id}`,
		create: '/api/clientes',
		update: (id: string) => `/api/clientes/${id}`,
		delete: (id: string) => `/api/clientes/${id}`,
		search: '/api/clientes/search',
	},

	// Brinquedos
	brinquedos: {
		list: '/api/brinquedos',
		get: (id: string) => `/api/brinquedos/${id}`,
		create: '/api/brinquedos',
		update: (id: string) => `/api/brinquedos/${id}`,
		delete: (id: string) => `/api/brinquedos/${id}`,
	},

	// Formas de Pagamento
	formasPagamento: {
		list: '/api/formas-pagamento',
		get: (id: string) => `/api/formas-pagamento/${id}`,
		create: '/api/formas-pagamento',
		update: (id: string) => `/api/formas-pagamento/${id}`,
		delete: (id: string) => `/api/formas-pagamento/${id}`,
	},

	// Parâmetros
	parametros: {
		get: '/api/parametros',
		update: '/api/parametros',
	},

	// Estacionamentos
	estacionamentos: {
		list: '/api/estacionamentos',
		get: (id: string) => `/api/estacionamentos/${id}`,
		create: '/api/estacionamentos',
		update: (id: string) => `/api/estacionamentos/${id}`,
		delete: (id: string) => `/api/estacionamentos/${id}`,
	},

	// Lançamentos de Estacionamento
	lancamentosEstacionamento: {
		list: '/api/lancamentos-estacionamento',
		get: (id: string) => `/api/lancamentos-estacionamento/${id}`,
		create: '/api/lancamentos-estacionamento',
		update: (id: string) => `/api/lancamentos-estacionamento/${id}`,
		delete: (id: string) => `/api/lancamentos-estacionamento/${id}`,
		pagar: (id: string) => `/api/lancamentos-estacionamento/${id}/pagar`,
		cancelar: (id: string) => `/api/lancamentos-estacionamento/${id}/cancelar`,
	},

	// Relatórios
	relatorios: {
		vendas: '/api/relatorios/vendas',
		caixa: '/api/relatorios/caixa',
	},
}

export default endpoints

