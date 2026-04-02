// Utilitários compartilhados
import type { Parametros, Brinquedo, Lancamento } from './mockDb'

/** Formata CNPJ para o padrão 00.000.000/0000-00. Aceita string com ou sem máscara. */
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

/** Retorna true se a cobrança usa ciclos adicionais (ex.: 15min + R$10) */
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


/** Retorna descrição detalhada do cálculo de faixas para uso em recibos */
export function detalharValorCiclos(tempoMin: number, brinquedo: Brinquedo): string | null {
	const inicialMinutos = brinquedo.inicialMinutos !== undefined ? brinquedo.inicialMinutos : brinquedo.regrasCobranca?.inicialMinutos
	const cicloMinutos = brinquedo.cicloMinutos !== undefined ? brinquedo.cicloMinutos : brinquedo.regrasCobranca?.cicloMinutos
	const valorCiclo = Number(brinquedo.valorCiclo ?? brinquedo.regrasCobranca?.valorCiclo ?? 0)
	const valorCiclo2: number | undefined = typeof brinquedo.valorCiclo2 === 'number' ? brinquedo.valorCiclo2 : undefined
	const cicloTier2Minutos: number | undefined = typeof brinquedo.cicloTier2Minutos === 'number' ? brinquedo.cicloTier2Minutos : undefined
	if (inicialMinutos == null || cicloMinutos == null || !cicloTier2Minutos || valorCiclo2 === undefined) return null
	const excedente = Math.max(0, tempoMin - Number(inicialMinutos))
	const ciclo = Math.max(1, Number(cicloMinutos))
	const tier1MaxExcedente = Math.max(0, cicloTier2Minutos - Number(inicialMinutos))
	const tol = brinquedo.cicloToleranciaMinutos ?? 0
	const ciclosTier1 = ciclosPagosComTolerancia(Math.min(excedente, tier1MaxExcedente), ciclo, tol)
	const excedenteTier2 = Math.max(0, excedente - tier1MaxExcedente)
	const ciclosTier2 = excedenteTier2 > 0 ? ciclosPagosComTolerancia(excedenteTier2, ciclo, tol) : 0
	const partes: string[] = []
	if (ciclosTier1 > 0) partes.push(`${ciclosTier1}x R$${valorCiclo.toFixed(2)} (até ${cicloTier2Minutos}min)`)
	if (ciclosTier2 > 0) partes.push(`${ciclosTier2}x R$${valorCiclo2.toFixed(2)} (após ${cicloTier2Minutos}min)`)
	return partes.length > 0 ? partes.join(' + ') : null
}

export function calcularValor(param: Parametros, tempoMin: number | null, brinquedo?: Brinquedo): number {
	if (tempoMin == null) return 0

	// Se o brinquedo tem regras específicas, usa elas (API retorna campos diretos; mock pode ter regrasCobranca)
	// IMPORTANTE: usar !== undefined (não ??) para preservar null, que significa "taxa única sem limite de tempo"
	const regras = brinquedo?.regrasCobranca
	const inicialMinutos = brinquedo && brinquedo.inicialMinutos !== undefined ? brinquedo.inicialMinutos : regras?.inicialMinutos
	const valorInicialRaw = brinquedo && brinquedo.valorInicial !== undefined ? brinquedo.valorInicial : regras?.valorInicial
	const valorInicial = typeof valorInicialRaw === 'number' ? valorInicialRaw : Number(valorInicialRaw)
	const cicloMinutos = brinquedo && brinquedo.cicloMinutos !== undefined ? brinquedo.cicloMinutos : regras?.cicloMinutos
	const valorCiclo = Number(brinquedo?.valorCiclo ?? regras?.valorCiclo ?? 0)
	const cicloToleranciaMinutos = brinquedo?.cicloToleranciaMinutos ?? regras?.cicloToleranciaMinutos ?? 0

	// Brinquedo com valor fixo (taxa única) ou com regras próprias
	if (inicialMinutos !== undefined && !Number.isNaN(valorInicial)) {
		// Taxa única sem limite de tempo
		if (inicialMinutos === null) {
			return valorInicial
		}

		// Calcula por tempo e ciclos (inclui tempo 0 = valor inicial do brinquedo)
		if (tempoMin <= inicialMinutos) return valorInicial

		// Se não usa ciclos, retorna apenas o valor inicial
		if (cicloMinutos === null || cicloMinutos === undefined) {
			return valorInicial
		}

		const excedente = Math.max(0, tempoMin - Number(inicialMinutos))
		const ciclo = Math.max(1, Number(cicloMinutos))

		// 2ª faixa de preço: ciclos após cicloTier2Minutos (total) custam valorCiclo2
		const valorCiclo2: number | undefined = typeof brinquedo?.valorCiclo2 === 'number' ? brinquedo.valorCiclo2 : undefined
		const cicloTier2Minutos: number | undefined = typeof brinquedo?.cicloTier2Minutos === 'number' ? brinquedo.cicloTier2Minutos : undefined
		if (cicloTier2Minutos !== undefined && valorCiclo2 !== undefined) {
			const tier1MaxExcedente = Math.max(0, cicloTier2Minutos - Number(inicialMinutos))
			const excedenteTier1 = Math.min(excedente, tier1MaxExcedente)
			const excedenteTier2 = Math.max(0, excedente - tier1MaxExcedente)
			const ciclosTier1 = ciclosPagosComTolerancia(excedenteTier1, ciclo, cicloToleranciaMinutos)
			const ciclosTier2 = excedenteTier2 > 0 ? ciclosPagosComTolerancia(excedenteTier2, ciclo, cicloToleranciaMinutos) : 0
			return Math.round((valorInicial + ciclosTier1 * valorCiclo + ciclosTier2 * valorCiclo2) * 100) / 100
		}

		const ciclos = ciclosPagosComTolerancia(excedente, ciclo, cicloToleranciaMinutos)
		const valorExcedente = ciclos * valorCiclo
		return Math.round((valorInicial + valorExcedente) * 100) / 100
	}
	
	// Usa regras globais do parâmetro
	const { valorInicialMinutos, valorInicialReais, valorCicloMinutos, valorCicloReais, cicloToleranciaMinutos: tolParam } = param
	if (tempoMin <= valorInicialMinutos) return valorInicialReais
	const excedente = Math.max(0, tempoMin - valorInicialMinutos)
	const ciclo = Math.max(1, valorCicloMinutos)
	const tolerancia = tolParam ?? 0
	const ciclos = ciclosPagosComTolerancia(excedente, ciclo, tolerancia)
	const valorExcedente = ciclos * valorCicloReais
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

