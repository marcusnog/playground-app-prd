// Serviços para todas as entidades do sistema
import { api } from './api'
import endpoints from './apiEndpoints'
import type {
	Caixa,
	Lancamento,
	Cliente,
	Brinquedo,
	FormaPagamento,
	Parametros,
	Usuario,
	Estacionamento,
	LancamentoEstacionamento,
	MovimentoCaixa,
} from './mockDb'

// Re-exportar tipos para facilitar uso
export type {
	Caixa,
	Lancamento,
	Cliente,
	Brinquedo,
	FormaPagamento,
	Parametros,
	Usuario,
	Estacionamento,
	LancamentoEstacionamento,
	MovimentoCaixa,
}

// Serviço de Caixas
export const caixasService = {
	list: async (): Promise<Caixa[]> => {
		return api.get<Caixa[]>(endpoints.caixas.list)
	},

	get: async (id: string): Promise<Caixa> => {
		return api.get<Caixa>(endpoints.caixas.get(id))
	},

	create: async (data: Omit<Caixa, 'id'>): Promise<Caixa> => {
		return api.post<Caixa>(endpoints.caixas.create, data)
	},

	update: async (id: string, data: Partial<Caixa>): Promise<Caixa> => {
		return api.put<Caixa>(endpoints.caixas.update(id), data)
	},

	delete: async (id: string): Promise<void> => {
		return api.delete(endpoints.caixas.delete(id))
	},

	abrir: async (id: string, valorInicial: number, nome?: string, data?: string): Promise<Caixa> => {
		return api.post<Caixa>(endpoints.caixas.abrir, { id, valorInicial, nome, data })
	},

	fechar: async (id: string): Promise<Caixa> => {
		return api.post<Caixa>(endpoints.caixas.fechar, { id })
	},

	sangria: async (id: string, valor: number, motivo?: string): Promise<MovimentoCaixa> => {
		return api.post<MovimentoCaixa>(endpoints.caixas.sangria(id), { valor, motivo })
	},

	suprimento: async (id: string, valor: number, motivo?: string): Promise<MovimentoCaixa> => {
		return api.post<MovimentoCaixa>(endpoints.caixas.suprimento(id), { valor, motivo })
	},

	getMovimentos: async (id: string): Promise<MovimentoCaixa[]> => {
		return api.get<MovimentoCaixa[]>(endpoints.caixas.movimentos(id))
	},
}

// Serviço de Lançamentos
export const lancamentosService = {
	list: async (): Promise<Lancamento[]> => {
		return api.get<Lancamento[]>(endpoints.lancamentos.list)
	},

	get: async (id: string): Promise<Lancamento> => {
		return api.get<Lancamento>(endpoints.lancamentos.get(id))
	},

	create: async (data: Omit<Lancamento, 'id' | 'dataHora' | 'status'>): Promise<Lancamento> => {
		return api.post<Lancamento>(endpoints.lancamentos.create, data)
	},

	update: async (id: string, data: Partial<Lancamento>): Promise<Lancamento> => {
		return api.put<Lancamento>(endpoints.lancamentos.update(id), data)
	},

	pagar: async (id: string, formaPagamentoId: string): Promise<Lancamento> => {
		return api.post<Lancamento>(endpoints.lancamentos.pagar(id), { formaPagamentoId })
	},

	cancelar: async (id: string): Promise<Lancamento> => {
		return api.post<Lancamento>(endpoints.lancamentos.cancelar(id))
	},
}

// Serviço de Clientes
export const clientesService = {
	list: async (): Promise<Cliente[]> => {
		return api.get<Cliente[]>(endpoints.clientes.list)
	},

	get: async (id: string): Promise<Cliente> => {
		return api.get<Cliente>(endpoints.clientes.get(id))
	},

	create: async (data: Omit<Cliente, 'id'>): Promise<Cliente> => {
		return api.post<Cliente>(endpoints.clientes.create, data)
	},

	update: async (id: string, data: Partial<Cliente>): Promise<Cliente> => {
		return api.put<Cliente>(endpoints.clientes.update(id), data)
	},

	delete: async (id: string): Promise<void> => {
		return api.delete(endpoints.clientes.delete(id))
	},

	search: async (query: string): Promise<Cliente[]> => {
		return api.get<Cliente[]>(`${endpoints.clientes.search}?q=${encodeURIComponent(query)}`)
	},
}

// Serviço de Brinquedos
export const brinquedosService = {
	list: async (): Promise<Brinquedo[]> => {
		return api.get<Brinquedo[]>(endpoints.brinquedos.list)
	},

	get: async (id: string): Promise<Brinquedo> => {
		return api.get<Brinquedo>(endpoints.brinquedos.get(id))
	},

	create: async (data: Omit<Brinquedo, 'id'>): Promise<Brinquedo> => {
		return api.post<Brinquedo>(endpoints.brinquedos.create, data)
	},

	update: async (id: string, data: Partial<Brinquedo>): Promise<Brinquedo> => {
		return api.put<Brinquedo>(endpoints.brinquedos.update(id), data)
	},

	delete: async (id: string): Promise<void> => {
		return api.delete(endpoints.brinquedos.delete(id))
	},
}

// Serviço de Formas de Pagamento
export const formasPagamentoService = {
	list: async (): Promise<FormaPagamento[]> => {
		return api.get<FormaPagamento[]>(endpoints.formasPagamento.list)
	},

	get: async (id: string): Promise<FormaPagamento> => {
		return api.get<FormaPagamento>(endpoints.formasPagamento.get(id))
	},

	create: async (data: Omit<FormaPagamento, 'id'>): Promise<FormaPagamento> => {
		return api.post<FormaPagamento>(endpoints.formasPagamento.create, data)
	},

	update: async (id: string, data: Partial<FormaPagamento>): Promise<FormaPagamento> => {
		return api.put<FormaPagamento>(endpoints.formasPagamento.update(id), data)
	},

	delete: async (id: string): Promise<void> => {
		return api.delete(endpoints.formasPagamento.delete(id))
	},
}

// Serviço de Parâmetros
export const parametrosService = {
	get: async (): Promise<Parametros> => {
		return api.get<Parametros>(endpoints.parametros.get)
	},

	update: async (data: Partial<Parametros>): Promise<Parametros> => {
		return api.put<Parametros>(endpoints.parametros.update, data)
	},
}

// Serviço de Usuários
export const usuariosService = {
	list: async (): Promise<Usuario[]> => {
		return api.get<Usuario[]>(endpoints.usuarios.list)
	},

	get: async (id: string): Promise<Usuario> => {
		return api.get<Usuario>(endpoints.usuarios.get(id))
	},

	create: async (data: Omit<Usuario, 'id'>): Promise<Usuario> => {
		return api.post<Usuario>(endpoints.usuarios.create, data)
	},

	update: async (id: string, data: Partial<Usuario>): Promise<Usuario> => {
		return api.put<Usuario>(endpoints.usuarios.update(id), data)
	},

	delete: async (id: string): Promise<void> => {
		return api.delete(endpoints.usuarios.delete(id))
	},
}

// Serviço de Estacionamentos
export const estacionamentosService = {
	list: async (): Promise<Estacionamento[]> => {
		return api.get<Estacionamento[]>(endpoints.estacionamentos.list)
	},

	get: async (id: string): Promise<Estacionamento> => {
		return api.get<Estacionamento>(endpoints.estacionamentos.get(id))
	},

	create: async (data: Omit<Estacionamento, 'id'>): Promise<Estacionamento> => {
		return api.post<Estacionamento>(endpoints.estacionamentos.create, data)
	},

	update: async (id: string, data: Partial<Estacionamento>): Promise<Estacionamento> => {
		return api.put<Estacionamento>(endpoints.estacionamentos.update(id), data)
	},

	delete: async (id: string): Promise<void> => {
		return api.delete(endpoints.estacionamentos.delete(id))
	},
}

// Serviço de Lançamentos de Estacionamento
export const lancamentosEstacionamentoService = {
	list: async (): Promise<LancamentoEstacionamento[]> => {
		return api.get<LancamentoEstacionamento[]>(endpoints.lancamentosEstacionamento.list)
	},

	get: async (id: string): Promise<LancamentoEstacionamento> => {
		return api.get<LancamentoEstacionamento>(endpoints.lancamentosEstacionamento.get(id))
	},

	create: async (data: Omit<LancamentoEstacionamento, 'id' | 'dataHora' | 'status'>): Promise<LancamentoEstacionamento> => {
		return api.post<LancamentoEstacionamento>(endpoints.lancamentosEstacionamento.create, data)
	},


	pagar: async (id: string, formaPagamentoId: string): Promise<LancamentoEstacionamento> => {
		return api.post<LancamentoEstacionamento>(endpoints.lancamentosEstacionamento.pagar(id), { formaPagamentoId })
	},

	cancelar: async (id: string): Promise<LancamentoEstacionamento> => {
		return api.post<LancamentoEstacionamento>(endpoints.lancamentosEstacionamento.cancelar(id))
	},
}

