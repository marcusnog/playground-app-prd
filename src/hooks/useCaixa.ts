import { useMemo, useState, useEffect } from 'react'
import { db } from '../services/mockDb'

export function useCaixa() {
	const [refresh, setRefresh] = useState(0)
	const caixas = useMemo(() => db.get().caixas, [refresh])
	const caixaAberto = caixas.find((c) => c.status === 'aberto')
	
	// Escutar mudanças no localStorage para atualizar quando o caixa muda
	useEffect(() => {
		function handleStorageChange() {
			setRefresh(prev => prev + 1)
		}
		
		// Escutar mudanças no localStorage
		window.addEventListener('storage', handleStorageChange)
		
		// Também escutar mudanças locais usando um evento customizado
		window.addEventListener('db-update', handleStorageChange)
		
		return () => {
			window.removeEventListener('storage', handleStorageChange)
			window.removeEventListener('db-update', handleStorageChange)
		}
	}, [])
	
	return {
		caixaAberto: !!caixaAberto,
		caixa: caixaAberto,
		isOpen: !!caixaAberto,
		refresh: () => setRefresh(prev => prev + 1),
	}
}
