// Utilitários compartilhados
import type { Parametros, Brinquedo } from './mockDb'

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

export function calcularValor(param: Parametros, tempoMin: number | null, brinquedo?: Brinquedo): number {
	if (tempoMin == null) return 0

	// Se o brinquedo tem regras específicas, usa elas (API retorna campos diretos; mock pode ter regrasCobranca)
	const regras = brinquedo?.regrasCobranca
	const inicialMinutos = brinquedo?.inicialMinutos ?? regras?.inicialMinutos
	const valorInicial = Number(brinquedo?.valorInicial ?? regras?.valorInicial)
	const cicloMinutos = brinquedo?.cicloMinutos ?? regras?.cicloMinutos
	const valorCiclo = Number(brinquedo?.valorCiclo ?? regras?.valorCiclo ?? 0)

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
		const valorExcedente = excedente * (valorCiclo / ciclo)
		return Math.round((valorInicial + valorExcedente) * 100) / 100
	}
	
	// Usa regras globais do parâmetro
	const { valorInicialMinutos, valorInicialReais, valorCicloMinutos, valorCicloReais } = param
	if (tempoMin <= valorInicialMinutos) return valorInicialReais
	const excedente = Math.max(0, tempoMin - valorInicialMinutos)
	const ciclo = Math.max(1, valorCicloMinutos)
	const valorExcedente = excedente * (valorCicloReais / ciclo)
	return Math.round((valorInicialReais + valorExcedente) * 100) / 100
}

