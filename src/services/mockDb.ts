// Simple localStorage-backed mock DB

export type FormaPagamento = { 
	id: string
	descricao: string
	status: 'ativo' | 'inativo'
	pixChave?: string
	pixConta?: string
}
export type RegrasCobranca = {
	inicialMinutos: number | null // null = taxa única sem limite
	valorInicial: number
	cicloMinutos: number | null // null = não usa ciclos
	valorCiclo: number
}
export type Brinquedo = { 
	id: string
	nome: string
	regrasCobranca?: RegrasCobranca // Se não tiver, usa regras globais
}
export type Parametros = {
	valorInicialMinutos: number;
	valorInicialReais: number;
	valorCicloMinutos: number;
	valorCicloReais: number;
	empresaNome?: string;
	empresaCnpj?: string;
	empresaLogoUrl?: string;
	pixChave?: string;
	pixCidade?: string;
}
export type CaixaStatus = 'aberto' | 'fechado'
export type MovimentoCaixa = {
	id: string
	dataHora: string
	tipo: 'sangria' | 'suprimento'
	valor: number
	motivo?: string
}
export type Caixa = { 
	id: string
	data: string
	valorInicial: number
	status: CaixaStatus
	movimentos?: MovimentoCaixa[]
}
export type Cliente = {
	id: string
	nomeCompleto: string
	dataNascimento: string // ISO date
	nomePai: string
	nomeMae: string
	telefoneWhatsapp: string
}
export type Lancamento = {
	id: string
	dataHora: string
	nomeCrianca: string
	nomeResponsavel: string
	whatsappResponsavel: string
	numeroPulseira?: string
	tempoSolicitadoMin: number | null // null -> Tempo Livre
	brinquedoId?: string
	clienteId?: string // ID do cliente cadastrado
	status: 'aberto' | 'pago' | 'cancelado'
	valorCalculado: number
}

const KEY = 'app.mockdb.v1'

type DbShape = {
	formasPagamento: FormaPagamento[]
	brinquedos: Brinquedo[]
	parametros: Parametros
	caixas: Caixa[]
	lancamentos: Lancamento[]
	clientes: Cliente[]
}

const defaultDb: DbShape = {
	formasPagamento: [
		{ id: 'dinheiro', descricao: 'Dinheiro', status: 'ativo' },
		{ id: 'pix', descricao: 'PIX', status: 'ativo' },
		{ id: 'debito', descricao: 'Débito', status: 'ativo' },
	],
	brinquedos: [],
	parametros: { valorInicialMinutos: 30, valorInicialReais: 20, valorCicloMinutos: 15, valorCicloReais: 10, empresaNome: 'Parque Infantil', empresaCnpj: '00.000.000/0000-00', empresaLogoUrl: '', pixChave: '', pixCidade: 'Sua Cidade' },
	caixas: [],
	lancamentos: [],
	clientes: [],
}

function load(): DbShape {
	try {
		const raw = localStorage.getItem(KEY)
		if (!raw) return defaultDb
		const parsed = JSON.parse(raw) as Partial<DbShape>
		// Garantir que todos os campos existam, mesclando com defaults
		return { 
			...defaultDb, 
			...parsed,
			// Garantir arrays sempre existam
			formasPagamento: parsed.formasPagamento || defaultDb.formasPagamento,
			brinquedos: parsed.brinquedos || defaultDb.brinquedos,
			caixas: parsed.caixas || defaultDb.caixas,
			lancamentos: parsed.lancamentos || defaultDb.lancamentos,
			clientes: parsed.clientes || defaultDb.clientes,
			// Garantir parametros sempre existam
			parametros: parsed.parametros || defaultDb.parametros
		}
	} catch {
		return defaultDb
	}
}

function save(db: DbShape) {
	localStorage.setItem(KEY, JSON.stringify(db))
}

export const db = {
	get(): DbShape {
		return load()
	},
	set(next: DbShape) {
		save(next)
	},
	update(mutator: (draft: DbShape) => void) {
		const current = load()
		mutator(current)
		save(current)
	},
}

export function calcularValor(param: Parametros, tempoMin: number | null, brinquedo?: Brinquedo): number {
	if (tempoMin == null) return 0
	
	// Se o brinquedo tem regras específicas, usa elas
	const regras = brinquedo?.regrasCobranca
	if (regras) {
		// Taxa única sem limite de tempo
		if (regras.inicialMinutos === null) {
			return regras.valorInicial
		}
		
		// Calcula por tempo e ciclos
		if (tempoMin <= regras.inicialMinutos) return regras.valorInicial
		
		// Se não usa ciclos, retorna apenas o valor inicial
		if (regras.cicloMinutos === null) {
			return regras.valorInicial
		}
		
		const excedente = Math.max(0, tempoMin - regras.inicialMinutos)
		const ciclos = Math.ceil(excedente / Math.max(1, regras.cicloMinutos))
		return regras.valorInicial + ciclos * regras.valorCiclo
	}
	
	// Usa regras globais do parâmetro
	const { valorInicialMinutos, valorInicialReais, valorCicloMinutos, valorCicloReais } = param
	if (tempoMin <= valorInicialMinutos) return valorInicialReais
	const excedente = Math.max(0, tempoMin - valorInicialMinutos)
	const ciclos = Math.ceil(excedente / Math.max(1, valorCicloMinutos))
	return valorInicialReais + ciclos * valorCicloReais
}

export function uid(prefix: string) {
	return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}


