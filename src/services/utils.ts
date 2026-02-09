// Utilitários compartilhados
import type { Parametros, Brinquedo } from './mockDb'

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
		const ciclos = Math.ceil(excedente / Math.max(1, Number(cicloMinutos)))
		return valorInicial + ciclos * valorCiclo
	}
	
	// Usa regras globais do parâmetro
	const { valorInicialMinutos, valorInicialReais, valorCicloMinutos, valorCicloReais } = param
	if (tempoMin <= valorInicialMinutos) return valorInicialReais
	const excedente = Math.max(0, tempoMin - valorInicialMinutos)
	const ciclos = Math.ceil(excedente / Math.max(1, valorCicloMinutos))
	return valorInicialReais + ciclos * valorCicloReais
}

