import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { lancamentosService, parametrosService } from '../../services/entitiesService'

export default function ReciboLancamento() {
	const { id } = useParams()
	const [lanc, setLanc] = useState<Awaited<ReturnType<typeof lancamentosService.get>>>(null)
	const [params, setParams] = useState<Awaited<ReturnType<typeof parametrosService.get>>>(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (!id) return
		let cancelled = false
		async function load() {
			setLoading(true)
			try {
				const [l, p] = await Promise.all([
					lancamentosService.get(id),
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
	}, [id])

	useEffect(() => {
		if (!loading && lanc) setTimeout(() => window.print(), 300)
	}, [loading, lanc])

	if (loading) return <div className="receipt"><h3>Recibo</h3><div>Carregando...</div></div>
	if (!lanc) return <div className="receipt"><h3>Recibo</h3><div>Registro não encontrado</div></div>

	const p = params || {}
	return (
		<div className="receipt">
			{p.empresaLogoUrl ? (
				<div style={{ textAlign: 'center' }}>
					<img alt="logo" src={p.empresaLogoUrl} style={{ height: 40, objectFit: 'contain' }} />
				</div>
			) : null}
			<h3>{p.empresaNome || 'Recibo'}</h3>
			{p.empresaCnpj && <div style={{ textAlign: 'center', marginBottom: 8 }}>CNPJ: {p.empresaCnpj}</div>}
			<div>Recibo de Lançamento</div>
			<div>Data/Hora: {new Date(lanc.dataHora).toLocaleString('pt-BR')}</div>
			<div>Criança: {lanc.nomeCrianca}</div>
			<div>Responsável: {lanc.nomeResponsavel}</div>
			{lanc.numeroPulseira && <div>Pulseira: {lanc.numeroPulseira}</div>}
			<div>Tempo: {lanc.tempoSolicitadoMin == null ? 'Tempo Livre' : `${lanc.tempoSolicitadoMin} min`}</div>
			<div>Valor: R$ {lanc.valorCalculado.toFixed(2)}</div>
			<hr />
			<small>Apresente este cupom no caixa.</small>
		</div>
	)
}
