import { useState, useEffect } from 'react'
import { caixasService, type Caixa } from '../services/entitiesService'

export function useCaixa() {
	const [caixas, setCaixas] = useState<Caixa[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)

	const caixaAberto = caixas.find((c) => c.status === 'aberto')

	const loadCaixas = async () => {
		try {
			setLoading(true)
			setError(null)
			const data = await caixasService.list()
			setCaixas(data)
		} catch (err) {
			setError(err instanceof Error ? err : new Error('Erro ao carregar caixas'))
			console.error('Erro ao carregar caixas:', err)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadCaixas()
		
		// Polling a cada 30 segundos para atualizar dados
		const interval = setInterval(loadCaixas, 30000)
		
		// Listener para atualizar quando a janela recebe foco (usuário volta para a aba)
		const handleFocus = () => {
			loadCaixas()
		}
		window.addEventListener('focus', handleFocus)
		
		// Listener para eventos customizados de atualização do caixa
		const handleCaixaUpdate = () => {
			loadCaixas()
		}
		window.addEventListener('caixa:updated', handleCaixaUpdate)
		
		return () => {
			clearInterval(interval)
			window.removeEventListener('focus', handleFocus)
			window.removeEventListener('caixa:updated', handleCaixaUpdate)
		}
	}, [])
	
	return {
		caixaAberto: !!caixaAberto,
		caixa: caixaAberto,
		isOpen: !!caixaAberto,
		caixas,
		loading,
		error,
		refresh: loadCaixas,
	}
}
