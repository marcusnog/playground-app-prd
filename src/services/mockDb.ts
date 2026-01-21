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
	inicialMinutos?: number | null // null = taxa única sem limite
	valorInicial?: number
	cicloMinutos?: number | null // null = não usa ciclos
	valorCiclo?: number
	regrasCobranca?: RegrasCobranca // Se não tiver, usa regras globais (compatibilidade)
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
	nome: string // Nome do caixa (ex: "Parquinho", "Infláveis")
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
	tipoParente?: string // pai, mae, avo, ava, tio, tia, outro
	whatsappResponsavel: string
	numeroPulseira?: string
	tempoSolicitadoMin: number | null // null -> Tempo Livre
	brinquedoId?: string
	clienteId?: string // ID do cliente cadastrado
	status: 'aberto' | 'pago' | 'cancelado'
	valorCalculado: number
	formaPagamentoId?: string // ID da forma de pagamento (quando pago)
}

export type PermissoesModulo = {
	acompanhamento?: boolean
	lancamento?: boolean
	caixa?: {
		abertura?: boolean
		fechamento?: boolean
		sangria?: boolean
		suprimento?: boolean
	}
	estacionamento?: {
		cadastro?: boolean
		caixa?: {
			abertura?: boolean
			fechamento?: boolean
		}
		lancamento?: boolean
		acompanhamento?: boolean
	}
	relatorios?: boolean
	parametros?: {
		empresa?: boolean
		formasPagamento?: boolean
		brinquedos?: boolean
	}
	clientes?: boolean
}

export type Usuario = {
	id: string
	nomeCompleto: string
	apelido: string
	contato: string
	senha: string // Em produção, deve ser hash
	permissoes: PermissoesModulo
	usaCaixa: boolean
	caixaId?: string // ID do caixa que o usuário pode usar (se usaCaixa for true)
}

export type Estacionamento = {
	id: string
	nome: string // Ex: "Estacionamento 1"
	caixaId: string // ID do caixa associado
	valor: number // Valor do estacionamento
}

export type LancamentoEstacionamento = {
	id: string
	estacionamentoId: string
	placa: string // Obrigatório
	modelo?: string
	telefoneContato?: string
	dataHora: string // Hora/minuto do dispositivo
	valor: number // Valor do estacionamento
	formaPagamentoId?: string
	status: 'aberto' | 'pago' | 'cancelado'
}

const KEY = 'app.mockdb.v1'

type DbShape = {
	formasPagamento: FormaPagamento[]
	brinquedos: Brinquedo[]
	parametros: Parametros
	caixas: Caixa[]
	lancamentos: Lancamento[]
	clientes: Cliente[]
	usuarios: Usuario[]
	estacionamentos: Estacionamento[]
	lancamentosEstacionamento: LancamentoEstacionamento[]
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
	usuarios: [
		{
			id: 'admin',
			nomeCompleto: 'Administrador',
			apelido: 'admin',
			contato: 'admin@exemplo.com',
			senha: 'admin',
			permissoes: {
				acompanhamento: true,
				lancamento: true,
				caixa: {
					abertura: true,
					fechamento: true,
					sangria: true,
					suprimento: true,
				},
				estacionamento: {
					cadastro: true,
					caixa: {
						abertura: true,
						fechamento: true,
					},
					lancamento: true,
					acompanhamento: true,
				},
				relatorios: true,
				parametros: {
					empresa: true,
					formasPagamento: true,
					brinquedos: true,
				},
				clientes: true,
			},
			usaCaixa: false,
		}
	],
	estacionamentos: [],
	lancamentosEstacionamento: [],
}

function load(): DbShape {
	try {
		const raw = localStorage.getItem(KEY)
		if (!raw) return defaultDb
		const parsed = JSON.parse(raw) as Partial<DbShape>
		
		// Garantir que o usuário admin sempre exista
		let usuarios = parsed.usuarios || defaultDb.usuarios
		const adminExists = usuarios.some(u => u.id === 'admin')
		if (!adminExists) {
			usuarios = [...usuarios, defaultDb.usuarios[0]]
		} else {
			// Garantir que o admin tenha todas as permissões
			const admin = usuarios.find(u => u.id === 'admin')
			if (admin) {
				admin.permissoes = {
					acompanhamento: true,
					lancamento: true,
					caixa: {
						abertura: true,
						fechamento: true,
						sangria: true,
						suprimento: true,
					},
					estacionamento: {
						cadastro: true,
						caixa: {
							abertura: true,
							fechamento: true,
						},
						lancamento: true,
						acompanhamento: true,
					},
					relatorios: true,
					parametros: {
						empresa: true,
						formasPagamento: true,
						brinquedos: true,
					},
					clientes: true,
				}
				admin.senha = admin.senha || 'admin' // Garantir senha padrão
			}
		}
		
		// Normalizar permissões antigas para evitar booleans onde deveriam ser objetos
		usuarios = usuarios.map((usuario) => {
			const permissoes = { ...usuario.permissoes }
			
			if (permissoes?.caixa && typeof permissoes.caixa !== 'object') {
				permissoes.caixa = {}
			}
			if (permissoes?.parametros && typeof permissoes.parametros !== 'object') {
				permissoes.parametros = {}
			}
			if (permissoes?.estacionamento && typeof permissoes.estacionamento !== 'object') {
				permissoes.estacionamento = {}
			}
			if (permissoes?.estacionamento?.caixa && typeof permissoes.estacionamento.caixa !== 'object') {
				permissoes.estacionamento.caixa = {}
			}
			
			return {
				...usuario,
				permissoes,
			}
		})
		
		// Garantir que caixas antigos tenham nome
		let caixas = parsed.caixas || defaultDb.caixas
		caixas = caixas.map((c, index) => {
			if (!c.nome) {
				return { ...c, nome: `Caixa ${index + 1}` }
			}
			return c
		})
		
		// Garantir que todos os campos existam, mesclando com defaults
		return { 
			...defaultDb, 
			...parsed,
			// Garantir arrays sempre existam
			formasPagamento: parsed.formasPagamento || defaultDb.formasPagamento,
			brinquedos: parsed.brinquedos || defaultDb.brinquedos,
			caixas: caixas,
			lancamentos: parsed.lancamentos || defaultDb.lancamentos,
			clientes: parsed.clientes || defaultDb.clientes,
			usuarios: usuarios,
			estacionamentos: parsed.estacionamentos || defaultDb.estacionamentos,
			lancamentosEstacionamento: parsed.lancamentosEstacionamento || defaultDb.lancamentosEstacionamento,
			// Garantir parametros sempre existam
			parametros: parsed.parametros || defaultDb.parametros
		}
	} catch {
		return defaultDb
	}
}

function save(db: DbShape) {
	localStorage.setItem(KEY, JSON.stringify(db))
	// Disparar evento customizado para notificar componentes sobre mudanças
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new Event('db-update'))
	}
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


