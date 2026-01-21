// Utilitários compartilhados
import type { Parametros, Brinquedo } from './mockDb'

export function calcularValor(param: Parametros, tempoMin: number | null, brinquedo?: Brinquedo): number {
	if (tempoMin == null) return 0
	
	// Se o brinquedo tem regras específicas, usa elas
	// Suporta tanto formato antigo (regrasCobranca) quanto novo (campos diretos)
	const regras = brinquedo?.regrasCobranca
	const inicialMinutos = brinquedo?.inicialMinutos ?? regras?.inicialMinutos
	const valorInicial = brinquedo?.valorInicial ?? regras?.valorInicial
	const cicloMinutos = brinquedo?.cicloMinutos ?? regras?.cicloMinutos
	const valorCiclo = brinquedo?.valorCiclo ?? regras?.valorCiclo
	
	if (inicialMinutos !== undefined && valorInicial !== undefined) {
		// Taxa única sem limite de tempo
		if (inicialMinutos === null) {
			return valorInicial
		}
		
		// Calcula por tempo e ciclos
		if (tempoMin <= inicialMinutos) return valorInicial
		
		// Se não usa ciclos, retorna apenas o valor inicial
		if (cicloMinutos === null || cicloMinutos === undefined) {
			return valorInicial
		}
		
		const excedente = Math.max(0, tempoMin - inicialMinutos)
		const ciclos = Math.ceil(excedente / Math.max(1, cicloMinutos))
		return valorInicial + ciclos * (valorCiclo || 0)
	}
	
	// Usa regras globais do parâmetro
	const { valorInicialMinutos, valorInicialReais, valorCicloMinutos, valorCicloReais } = param
	if (tempoMin <= valorInicialMinutos) return valorInicialReais
	const excedente = Math.max(0, tempoMin - valorInicialMinutos)
	const ciclos = Math.ceil(excedente / Math.max(1, valorCicloMinutos))
	return valorInicialReais + ciclos * valorCicloReais
}

