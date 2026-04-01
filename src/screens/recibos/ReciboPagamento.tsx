import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { lancamentosService, parametrosService, formasPagamentoService, type Parametros } from '../../services/entitiesService'
import { PaymentIcon, resolvePaymentKind } from '../../ui/icons'
import { imprimirRecibo } from '../../utils/printUtils'

export default function ReciboPagamento() {
	const { id } = useParams()
	const [lanc, setLanc] = useState<Awaited<ReturnType<typeof lancamentosService.get>> | null>(null)
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
					lancamentosService.get(idStr as string),
					parametrosService.get(),
					formasPagamentoService.list(),
				])
				if (!cancelled) {
					setLanc(l)
					setParams(p)
					setFormas(f || [])
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
		if (!loading && lanc) imprimirRecibo()
	}, [loading, lanc])

	if (loading) return <div id="recibo" className="receipt"><h3>Recibo</h3><div>Carregando...</div></div>
	if (!lanc) return <div id="recibo" className="receipt"><h3>Recibo</h3><div>Registro não encontrado</div></div>

	const p = (params ?? {}) as Parametros

	// Pagamento dividido: ler do pagamentosJson; pagamento único: usar formaPagamentoId
	type SplitItem = { formaPagamentoId: string; descricao: string; valor: number }
	const splits: SplitItem[] = (() => {
		if (lanc.pagamentosJson) {
			try { return JSON.parse(lanc.pagamentosJson) as SplitItem[] } catch { /* fallback */ }
		}
		return []
	})()
	const isSplit = splits.length > 0

	const formaId = lanc.formaPagamentoId
	const forma = formaId ? formas.find(f => f.id === formaId) : null

	// Verifica se alguma forma de pagamento é PIX (split ou único)
	const temPix = isSplit
		? splits.some(s => s.descricao?.toLowerCase().includes('pix'))
		: forma?.descricao.toLowerCase().includes('pix')
	const pixPayload = temPix && p.pixChave
		? `PIX|Key=${encodeURIComponent(p.pixChave)}|Nome=${encodeURIComponent(p.empresaNome || 'Loja')}|Cidade=${encodeURIComponent(p.pixCidade || '')}|Valor=${lanc.valorCalculado.toFixed(2)}|Txid=${encodeURIComponent('TX' + lanc.id)}`
		: ''

	return (
		<div id="recibo" className="receipt">
			{p.empresaLogoUrl ? (
				<div style={{ textAlign: 'center' }}>
					<img alt="logo" src={p.empresaLogoUrl} style={{ height: 40, objectFit: 'contain' }} />
				</div>
			) : null}
			<h3>{p.empresaNome || 'Recibo'}</h3>
			{p.empresaCnpj && <div style={{ textAlign: 'center', marginBottom: 8 }}>CNPJ: {p.empresaCnpj}</div>}
			<div>Recibo de Pagamento</div>
			<div>Hora inicial: {new Date(lanc.dataHora).toLocaleString('pt-BR')}</div>
			<div>Hora final: {(lanc as { updatedAt?: string }).updatedAt
				? new Date((lanc as { updatedAt: string }).updatedAt).toLocaleString('pt-BR')
				: new Date().toLocaleString('pt-BR')}</div>
			<div>Criança: {lanc.nomeCrianca}</div>
			<div>Responsável: {lanc.nomeResponsavel}</div>
			{(lanc as { valorDesconto?: number }).valorDesconto != null && (lanc as { valorDesconto: number }).valorDesconto > 0 && (
				<div>Desconto: R$ {(lanc as { valorDesconto: number }).valorDesconto.toFixed(2)}</div>
			)}
			<div>Valor pago: R$ {lanc.valorCalculado.toFixed(2)}</div>
			{lanc.valorRecebido != null && lanc.valorRecebido > 0 && (
				<>
					<div>Recebido: R$ {lanc.valorRecebido.toFixed(2)}</div>
					<div>Troco: R$ {(lanc.valorRecebido - lanc.valorCalculado).toFixed(2)}</div>
				</>
			)}
			{isSplit ? (
				splits.map((s, i) => (
					<div key={i}>
						Forma: <PaymentIcon kind={resolvePaymentKind(s.descricao)} /> {s.descricao.toUpperCase()} — R$ {s.valor.toFixed(2)}
					</div>
				))
			) : (
				forma && <div>Forma: <PaymentIcon kind={resolvePaymentKind(forma.descricao)} /> {forma.descricao.toUpperCase()}</div>
			)}
			{pixPayload && (
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
