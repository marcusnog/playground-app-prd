// Shared utilities
import type { Parametros, Brinquedo, Lancamento } from './mockDb'

/** Formats CNPJ to 00.000.000/0000-00. Accepts masked or unmasked text. */
export function formatarCnpj(valor: string | undefined | null): string {
	if (!valor) return ''
	const digitos = valor.replace(/\D/g, '').slice(0, 14)
	if (digitos.length === 0) return ''
	if (digitos.length <= 2) return digitos
	if (digitos.length <= 5) return `${digitos.slice(0, 2)}.${digitos.slice(2)}`
	if (digitos.length <= 8) return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`
	if (digitos.length <= 12) return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`
	return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`
}

/** Returns true when the charge uses extra cycles. */
export function temCiclosCobranca(brinquedo?: Brinquedo | null, param?: Parametros | null): boolean {
	if (brinquedo) {
		const regras = brinquedo.regrasCobranca
		const cicloMinutos = brinquedo.cicloMinutos ?? regras?.cicloMinutos
		return cicloMinutos != null && cicloMinutos !== undefined
	}
	return !!param?.valorCicloMinutos
}

function ciclosPagosComTolerancia(excedente: number, cicloMinutos: number, tolerancia: number): number {
	const ciclo = Math.max(1, cicloMinutos)
	const ciclosCompletos = Math.floor(excedente / ciclo)
	const restoNoCiclo = excedente % ciclo
	const tol = tolerancia ?? 0
	if (restoNoCiclo === 0) return ciclosCompletos
	if (restoNoCiclo <= tol) return ciclosCompletos
	return ciclosCompletos + 1
}

const MARCO_CICLO_FIXO_MINUTOS = 60
const VALOR_CICLO_FIXO_REAIS = 10

type DetalheCiclo = {
	quantidade: number
	valor: number
	descricao?: string
}

function calcularDetalhesCiclos(
	excedente: number,
	cicloMinutos: number,
	tolerancia: number,
	valorCiclo: number,
	opts?: {
		valorCiclo2?: number
		cicloTier2Minutos?: number
		inicialMinutos?: number
	}
): DetalheCiclo[] {
	if (excedente <= 0) return []

	const ciclo = Math.max(1, Number(cicloMinutos))
	const ciclosPagos = ciclosPagosComTolerancia(excedente, ciclo, tolerancia)
	const valorBase = Number(valorCiclo)
	const valorTier2 = typeof opts?.valorCiclo2 === 'number' ? Number(opts.valorCiclo2) : undefined
	const tier1MaxExcedente = typeof opts?.cicloTier2Minutos === 'number' && typeof opts?.inicialMinutos === 'number'
		? Math.max(0, Number(opts.cicloTier2Minutos) - Number(opts.inicialMinutos))
		: undefined
	const detalhes: DetalheCiclo[] = []

	for (let cicloIndex = 1; cicloIndex <= ciclosPagos; cicloIndex += 1) {
		const inicioCicloExcedente = (cicloIndex - 1) * ciclo
		const fimCicloExcedente = cicloIndex * ciclo
		const fechaMarcoFixo = fimCicloExcedente > 0 && fimCicloExcedente % MARCO_CICLO_FIXO_MINUTOS === 0
		const valorAtual = fechaMarcoFixo
			? VALOR_CICLO_FIXO_REAIS
			: valorTier2 !== undefined && tier1MaxExcedente !== undefined && inicioCicloExcedente >= tier1MaxExcedente
				? valorTier2
				: valorBase
		const descricao = fechaMarcoFixo ? `fechamento ${fimCicloExcedente}min` : undefined
		const ultimoDetalhe = detalhes[detalhes.length - 1]

		if (ultimoDetalhe && ultimoDetalhe.valor === valorAtual && ultimoDetalhe.descricao === descricao) {
			ultimoDetalhe.quantidade += 1
			continue
		}

		detalhes.push({
			quantidade: 1,
			valor: valorAtual,
			descricao,
		})
	}

	return detalhes
}

function calcularValorExcedentePorCiclos(
	excedente: number,
	cicloMinutos: number,
	tolerancia: number,
	valorCiclo: number,
	opts?: {
		valorCiclo2?: number
		cicloTier2Minutos?: number
		inicialMinutos?: number
	}
): number {
	const detalhes = calcularDetalhesCiclos(excedente, cicloMinutos, tolerancia, valorCiclo, opts)
	const total = detalhes.reduce((acc, detalhe) => acc + detalhe.quantidade * detalhe.valor, 0)
	return Math.round(total * 100) / 100
}

/** Returns a breakdown string for receipts when tier 2 or the 60-minute override is active. */
export function detalharValorCiclos(tempoMin: number, brinquedo: Brinquedo): string | null {
	const inicialMinutos = brinquedo.inicialMinutos !== undefined ? brinquedo.inicialMinutos : brinquedo.regrasCobranca?.inicialMinutos
	const cicloMinutos = brinquedo.cicloMinutos !== undefined ? brinquedo.cicloMinutos : brinquedo.regrasCobranca?.cicloMinutos
	const valorCiclo = Number(brinquedo.valorCiclo ?? brinquedo.regrasCobranca?.valorCiclo ?? 0)
	const valorCiclo2: number | undefined = typeof brinquedo.valorCiclo2 === 'number' ? brinquedo.valorCiclo2 : undefined
	const cicloTier2Minutos: number | undefined = typeof brinquedo.cicloTier2Minutos === 'number' ? brinquedo.cicloTier2Minutos : undefined
	if (inicialMinutos == null || cicloMinutos == null) return null

	const excedente = Math.max(0, tempoMin - Number(inicialMinutos))
	const tier1MaxExcedente = cicloTier2Minutos !== undefined
		? Math.max(0, cicloTier2Minutos - Number(inicialMinutos))
		: undefined
	const tol = brinquedo.cicloToleranciaMinutos ?? 0
	const detalhes = calcularDetalhesCiclos(excedente, Number(cicloMinutos), tol, valorCiclo, {
		inicialMinutos: Number(inicialMinutos),
		cicloTier2Minutos: cicloTier2Minutos ?? undefined,
		valorCiclo2,
	})
	const temMarcoFixo = detalhes.some((detalhe) => detalhe.descricao !== undefined)
	const temFaixa2 = tier1MaxExcedente !== undefined && valorCiclo2 !== undefined && excedente > tier1MaxExcedente
	if (!temMarcoFixo && !temFaixa2) return null

	return detalhes
		.map((detalhe) => `${detalhe.quantidade}x R$${detalhe.valor.toFixed(2)}${detalhe.descricao ? ` (${detalhe.descricao})` : ''}`)
		.join(' + ')
}

export function calcularValor(param: Parametros, tempoMin: number | null, brinquedo?: Brinquedo): number {
	if (tempoMin == null) return 0

	// Preserve null because it means a fixed fee without time limit.
	const regras = brinquedo?.regrasCobranca
	const inicialMinutos = brinquedo && brinquedo.inicialMinutos !== undefined ? brinquedo.inicialMinutos : regras?.inicialMinutos
	const valorInicialRaw = brinquedo && brinquedo.valorInicial !== undefined ? brinquedo.valorInicial : regras?.valorInicial
	const valorInicial = typeof valorInicialRaw === 'number' ? valorInicialRaw : Number(valorInicialRaw)
	const cicloMinutos = brinquedo && brinquedo.cicloMinutos !== undefined ? brinquedo.cicloMinutos : regras?.cicloMinutos
	const valorCiclo = Number(brinquedo?.valorCiclo ?? regras?.valorCiclo ?? 0)
	const cicloToleranciaMinutos = brinquedo?.cicloToleranciaMinutos ?? regras?.cicloToleranciaMinutos ?? 0

	if (inicialMinutos !== undefined && !Number.isNaN(valorInicial)) {
		if (inicialMinutos === null) {
			return valorInicial
		}

		if (tempoMin <= inicialMinutos) return valorInicial

		if (cicloMinutos === null || cicloMinutos === undefined) {
			return valorInicial
		}

		const excedente = Math.max(0, tempoMin - Number(inicialMinutos))
		const valorCiclo2: number | undefined = typeof brinquedo?.valorCiclo2 === 'number' ? brinquedo.valorCiclo2 : undefined
		const cicloTier2Minutos: number | undefined = typeof brinquedo?.cicloTier2Minutos === 'number' ? brinquedo.cicloTier2Minutos : undefined
		const valorExcedente = calcularValorExcedentePorCiclos(excedente, Number(cicloMinutos), cicloToleranciaMinutos, valorCiclo, {
			inicialMinutos: Number(inicialMinutos),
			cicloTier2Minutos,
			valorCiclo2,
		})
		return Math.round((valorInicial + valorExcedente) * 100) / 100
	}

	const { valorInicialMinutos, valorInicialReais, valorCicloMinutos, valorCicloReais, cicloToleranciaMinutos: tolParam } = param
	if (tempoMin <= valorInicialMinutos) return valorInicialReais
	const excedente = Math.max(0, tempoMin - valorInicialMinutos)
	const tolerancia = tolParam ?? 0
	const valorExcedente = calcularValorExcedentePorCiclos(excedente, valorCicloMinutos, tolerancia, valorCicloReais)
	return Math.round((valorInicialReais + valorExcedente) * 100) / 100
}

export function calcularValorExibidoLancamento(
	lancamento: Lancamento,
	parametros?: Parametros | null,
	brinquedo?: Brinquedo | null,
	agora: Date = new Date()
): number {
	if (lancamento.status !== 'aberto') return lancamento.valorCalculado ?? 0
	if (!parametros) return lancamento.valorCalculado ?? 0

	const isQuantidade = lancamento.quantidade != null || lancamento.nomeCrianca === 'Quantidade'
	if (isQuantidade) return lancamento.valorCalculado ?? 0

	const decorridoMin = Math.max(
		0,
		Math.floor((agora.getTime() - new Date(lancamento.dataHora).getTime()) / 60000)
	)
	const temCiclos = temCiclosCobranca(brinquedo, parametros)
	const minutosParaValor = lancamento.tempoSolicitadoMin == null
		? decorridoMin
		: temCiclos ? decorridoMin : Math.min(decorridoMin, lancamento.tempoSolicitadoMin)

	return calcularValor(parametros, minutosParaValor, brinquedo ?? undefined)
}
