import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { caixasService, parametrosService, estacionamentosService, type Parametros } from '../../services/entitiesService'
import { imprimirRecibo } from '../../utils/printUtils'

export default function ReciboEstacionamentoAbertura() {
	const { id } = useParams()
	const [caixa, setCaixa] = useState<Awaited<ReturnType<typeof caixasService.get>> | null>(null)
	const [params, setParams] = useState<Awaited<ReturnType<typeof parametrosService.get>> | null>(null)
	const [estacionamento, setEstacionamento] = useState<Awaited<ReturnType<typeof estacionamentosService.get>> | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const idStr = id
		if (!idStr) return
		let cancelled = false
		async function load() {
			setLoading(true)
			try {
				const [c, p, list] = await Promise.all([
					caixasService.get(idStr as string),
					parametrosService.get(),
					estacionamentosService.list(),
				])
				if (!cancelled) {
					setCaixa(c)
					setParams(p)
					const est = (list || []).find((e: { caixaId: string }) => e.caixaId === idStr)
					setEstacionamento(est ?? null)
				}
			} catch (e) {
				if (!cancelled) setCaixa(null)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		load()
		return () => { cancelled = true }
	}, [id])

	useEffect(() => {
		if (!loading && caixa) imprimirRecibo()
	}, [loading, caixa])

	if (loading) return <div id="recibo" className="receipt"><h3>Comprovante</h3><div>Carregando...</div></div>
	if (!caixa) return <div id="recibo" className="receipt"><h3>Comprovante</h3><div>Registro não encontrado</div></div>

	const p = (params ?? {}) as Parametros
	const dataStr = typeof caixa.data === 'string' ? caixa.data : (caixa as { data?: string }).data ?? new Date().toISOString()
	return (
		<div id="recibo" className="receipt">
			{p.empresaLogoUrl ? (
				<div style={{ textAlign: 'center' }}>
					<img alt="logo" src={p.empresaLogoUrl} style={{ height: 40, objectFit: 'contain' }} />
				</div>
			) : null}
			<h3>{p.empresaNome || 'Comprovante'}</h3>
			{p.empresaCnpj && <div style={{ textAlign: 'center', marginBottom: 8 }}>CNPJ: {p.empresaCnpj}</div>}
			<div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 12, marginBottom: 12 }}>
				COMPROVANTE DE ABERTURA DE CAIXA - ESTACIONAMENTO
			</div>
			{estacionamento && <div><strong>Estacionamento:</strong> {estacionamento.nome}</div>}
			<div><strong>Caixa:</strong> {caixa.nome}</div>
			<div>Data/Hora: {new Date(dataStr).toLocaleString('pt-BR')}</div>
			<div>Valor Inicial: R$ {caixa.valorInicial.toFixed(2)}</div>
			<div>Status: {caixa.status === 'aberto' ? 'ABERTO' : 'FECHADO'}</div>
			<hr />
			<small>Comprovante de abertura de caixa gerado automaticamente.</small>
		</div>
	)
}
