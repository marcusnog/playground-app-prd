import { useState, useEffect, useRef } from 'react'
import { caixasService, type Caixa } from '../services/entitiesService'

const POLL_INTERVAL_MS = 60000 // 1 minuto (evitar refresh constante)
const THROTTLE_MS = 2000 // mínimo 2s entre refetches por focus/evento

export function useCaixa() {
	const [caixas, setCaixas] = useState<Caixa[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<Error | null>(null)
	const lastFetchRef = useRef(0)
	const isMountedRef = useRef(true)

	const caixaAberto = caixas.find((c) => c.status === 'aberto')

	const loadCaixas = async (showLoading = false) => {
		const now = Date.now()
		if (!showLoading && now - lastFetchRef.current < THROTTLE_MS) return
		lastFetchRef.current = now
		try {
			if (showLoading) {
				setLoading(true)
				setError(null)
			}
			const data = await caixasService.list()
			if (isMountedRef.current) setCaixas(Array.isArray(data) ? data : [])
		} catch (err) {
			if (isMountedRef.current) {
				setError(err instanceof Error ? err : new Error('Erro ao carregar caixas'))
				console.error('Erro ao carregar caixas:', err)
			}
		} finally {
			if (isMountedRef.current) setLoading(false)
		}
	}

	useEffect(() => {
		isMountedRef.current = true
		loadCaixas(true) // só o carregamento inicial mostra loading

		const interval = setInterval(() => loadCaixas(false), POLL_INTERVAL_MS)

		const handleFocus = () => loadCaixas(false)
		const handleCaixaUpdate = () => loadCaixas(false)

		window.addEventListener('focus', handleFocus)
		window.addEventListener('caixa:updated', handleCaixaUpdate)

		return () => {
			isMountedRef.current = false
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
		refresh: () => loadCaixas(true),
	}
}
