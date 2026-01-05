// Utilitários compartilhados
import type { Parametros, Brinquedo } from './mockDb'

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

