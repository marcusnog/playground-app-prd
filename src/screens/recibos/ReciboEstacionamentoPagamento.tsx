import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { lancamentosEstacionamentoService, estacionamentosService, parametrosService, formasPagamentoService, type Parametros } from '../../services/entitiesService'
import { PaymentIcon, resolvePaymentKind } from '../../ui/icons'

export default function ReciboEstacionamentoPagamento() {
	const { id } = useParams()
	const [lanc, setLanc] = useState<Awaited<ReturnType<typeof lancamentosEstacionamentoService.get>> | null>(null)
	const [estacionamento, setEstacionamento] = useState<Awaited<ReturnType<typeof estacionamentosService.get>> | null>(null)
	const [params, setParams] = useState<Awaited<ReturnType<typeof parametrosService.get>> | null>(null)
	const [formas, setFormas] = useState<Awaited<ReturnType<typeof formasPagamentoService.list>>>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const idStr = id
		if (!idStr) return
		let cancelled = false
		async function load() {
			setLoading(true)
			try {
				const [l, p, f] = await Promise.all([
					lancamentosEstacionamentoService.get(idStr as string),
					parametrosService.get(),
					formasPagamentoService.list(),
				])
				if (!cancelled) {
					setLanc(l)
					setParams(p)
					setFormas(f || [])
					if (l) {
						const est = await estacionamentosService.get(l.estacionamentoId)
						if (!cancelled) setEstacionamento(est)
					}
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

	if (loading) return <div className="receipt"><h3>Cupom</h3><div>Carregando...</div></div>
	if (!lanc) return <div className="receipt"><h3>Cupom</h3><div>Registro não encontrado</div></div>

	const p = (params ?? {}) as Parametros
	const forma = lanc.formaPagamentoId ? formas.find(f => f.id === lanc.formaPagamentoId) : null
	const pixPayload = forma?.id === 'pix' && p.pixChave
		? `00020126580014BR.GOV.BCB.PIX0136${p.pixChave}5204000053039865802BR5913${(p.empresaNome || 'Empresa').slice(0, 25)}6009${(p.pixCidade || 'Cidade').slice(0, 15)}62070503***6304`
		: ''

	const dataHora = typeof lanc.dataHora === 'string' ? lanc.dataHora : (lanc as { dataHora?: string }).dataHora ?? new Date().toISOString()
	return (
		<div className="receipt">
			{p.empresaLogoUrl ? (
				<div style={{ textAlign: 'center' }}>
					<img alt="logo" src={p.empresaLogoUrl} style={{ height: 40, objectFit: 'contain' }} />
				</div>
			) : null}
			<h3>{p.empresaNome || 'Cupom'}</h3>
			{p.empresaCnpj && <div style={{ textAlign: 'center', marginBottom: 8 }}>CNPJ: {p.empresaCnpj}</div>}
			<div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 12, marginBottom: 12 }}>
				CUPOM DE PAGAMENTO - ESTACIONAMENTO
			</div>
			<div><strong>Estacionamento:</strong> {estacionamento?.nome ?? 'N/A'}</div>
			<div>Data/Hora: {new Date(dataHora).toLocaleString('pt-BR')}</div>
			<div><strong>Placa:</strong> {lanc.placa}</div>
			{lanc.modelo && <div><strong>Modelo:</strong> {lanc.modelo}</div>}
			<div><strong>Valor pago:</strong> R$ {lanc.valor.toFixed(2)}</div>
			{forma && <div>Forma: <PaymentIcon kind={resolvePaymentKind(forma.id)} /> {forma.descricao.toUpperCase()}</div>}
			{forma?.id === 'pix' && pixPayload && (
				<div style={{ textAlign: 'center', marginTop: 8 }}>
					<img alt="PIX QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`} />
					<div style={{ fontSize: 10 }}>Aponte a câmera para pagar</div>
				</div>
			)}
			<hr />
			<small>Obrigado pela preferência.</small>
		</div>
	)
}
