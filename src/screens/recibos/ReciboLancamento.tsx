import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { lancamentosService, parametrosService } from '../../services/entitiesService'
import { calcularValorExibidoLancamento, detalharValorCiclos } from '../../services/utils'
import { imprimirRecibo } from '../../utils/printUtils'
import type { Brinquedo } from '../../services/mockDb'

export default function ReciboLancamento() {
	const { id } = useParams()
	const [lanc, setLanc] = useState<Awaited<ReturnType<typeof lancamentosService.get>> | null>(null)
	const [params, setParams] = useState<Awaited<ReturnType<typeof parametrosService.get>> | null>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const lid = id
		if (!lid) return
		let cancelled = false
		async function load() {
			setLoading(true)
			try {
				const [l, p] = await Promise.all([
					lancamentosService.get(lid!), // lid já verificado acima
					parametrosService.get(),
				])
				if (!cancelled) {
					setLanc(l)
					setParams(p)
				}
			} catch (e) {
				if (!cancelled) setLanc(null)
			} finally {
				if (!cancelled) setLoading(false)
			}
		}
		load()
		return () => { cancelled = true }
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id as string])

	useEffect(() => {
		if (!loading && lanc) imprimirRecibo()
	}, [loading, lanc])

	if (loading) return <div id="recibo" className="receipt"><h3>Recibo</h3><div>Carregando...</div></div>
	if (!lanc) return <div id="recibo" className="receipt"><h3>Recibo</h3><div>Registro não encontrado</div></div>

	type ParametrosReceipt = { empresaLogoUrl?: string; empresaNome?: string; empresaCnpj?: string }
	const p: ParametrosReceipt = params || {}
	const brinquedoNome = (lanc as { brinquedo?: { nome?: string } }).brinquedo?.nome || null
	const brinquedo = (lanc as { brinquedo?: Brinquedo }).brinquedo
	const contato = (lanc as { whatsappResponsavel?: string }).whatsappResponsavel
	const tempoSolicitado = (lanc as { tempoSolicitadoMin?: number | null }).tempoSolicitadoMin
	const valorExibido = tempoSolicitado != null
		? (lanc.valorCalculado ?? 0)
		: calcularValorExibidoLancamento(lanc, params, brinquedo)
	return (
		<div id="recibo" className="receipt">
			{p.empresaLogoUrl ? (
				<div style={{ textAlign: 'center' }}>
					<img alt="logo" src={p.empresaLogoUrl} style={{ height: 40, objectFit: 'contain' }} />
				</div>
			) : null}
			<h3>{p.empresaNome || 'Recibo'}</h3>
			{p.empresaCnpj && <div style={{ textAlign: 'center', marginBottom: 8 }}>CNPJ: {p.empresaCnpj}</div>}
			<div>Recibo de Lançamento</div>
			<div>Hora inicial: {new Date(lanc.dataHora).toLocaleString('pt-BR')}</div>
			<div>Criança: {lanc.nomeCrianca}</div>
			<div>Responsável: {lanc.nomeResponsavel}</div>
			{contato && <div>Contato: {contato}</div>}
			{brinquedoNome && <div>Brinquedo: {brinquedoNome}</div>}
			{lanc.numeroPulseira && <div>Pulseira: {lanc.numeroPulseira}</div>}
			{(lanc as { quantidade?: number }).quantidade != null
				? <div>Quantidade: {(lanc as { quantidade?: number }).quantidade}</div>
				: (() => {
					const ti = (lanc as { tempoInicialMin?: number | null }).tempoInicialMin
					const ta = (lanc as { tempoAdicionalMin?: number | null }).tempoAdicionalMin
					const showSplit = ti != null && ta != null && ta > 0
					return (
						<div>Tempo: {lanc.tempoSolicitadoMin == null
							? 'Tempo Livre'
							: showSplit ? `${ti} min + ${ta} min adicional = ${lanc.tempoSolicitadoMin} min` : `${lanc.tempoSolicitadoMin} min`
						}</div>
					)
				})()
			}
			<div>Valor: R$ {valorExibido.toFixed(2)}</div>
			{(() => {
				const brinq = brinquedo
				const tempo = (lanc as { tempoSolicitadoMin?: number | null }).tempoSolicitadoMin
				if (!brinq || tempo == null) return null
				const detalhe = detalharValorCiclos(tempo, brinq)
				return detalhe ? <div style={{ fontSize: 11 }}>Ciclos: {detalhe}</div> : null
			})()}
			<hr />
			<small>Apresente este cupom no caixa.</small>
		</div>
	)
}
