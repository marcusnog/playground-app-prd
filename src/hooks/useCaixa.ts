import { useMemo } from 'react'
import { db } from '../services/mockDb'

export function useCaixa() {
	const caixas = useMemo(() => db.get().caixas, [])
	const caixaAberto = caixas.find((c) => c.status === 'aberto')
	
	return {
		caixaAberto: !!caixaAberto,
		caixa: caixaAberto,
		isOpen: !!caixaAberto,
	}
}
