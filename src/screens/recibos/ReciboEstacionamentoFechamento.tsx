import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { caixasService, parametrosService, estacionamentosService, lancamentosEstacionamentoService, formasPagamentoService, type Parametros } from '../../services/entitiesService'
import { PaymentIcon, resolvePaymentKind } from '../../ui/icons'

export default function ReciboEstacionamentoFechamento() {
	const { id } = useParams()
	const [caixa, setCaixa] = useState<Awaited<ReturnType<typeof caixasService.get>> | null>(null)
	const [params, setParams] = useState<Awaited<ReturnType<typeof parametrosService.get>> | null>(null)
	const [estacionamento, setEstacionamento] = useState<Awaited<ReturnType<typeof estacionamentosService.get>> | null>(null)
	const [lancamentos, setLancamentos] = useState<Awaited<ReturnType<typeof lancamentosEstacionamentoService.list>>>([])
	const [formas, setFormas] = useState<Awaited<ReturnType<typeof formasPagamentoService.list>>>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const idStr = id
		if (!idStr) return
		let cancelled = false
		async function load() {
			setLoading(true)
			try {
				const [c, p, estList, lancList, f] = await Promise.all([
					caixasService.get(idStr as string),
					parametrosService.get(),
					estacionamentosService.list(),
					lancamentosEstacionamentoService.list(),
					formasPagamentoService.list(),
				])
				if (!cancelled) {
					setCaixa(c)
					setParams(p)
					setLancamentos(lancList || [])
					setFormas(f || [])
					const est = (estList || []).find((e: { caixaId: string }) => e.caixaId === idStr)
					if (est) {
						const estDetail = await estacionamentosService.get(est.id)
						if (!cancelled) setEstacionamento(estDetail)
					} else {
						setEstacionamento(null)
					}
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
		if (!loading && caixa) setTimeout(() => window.print(), 300)
	}, [loading, caixa])

	const resumo = useMemo(() => {
		if (!caixa || !estacionamento) return []
		const dataStr = typeof caixa.data === 'string' ? caixa.data : (caixa as { data?: string }).data
		if (!dataStr) return []
		const dataCaixa = new Date(dataStr).toDateString()
		const pagos = lancamentos.filter((l) => {
			if (l.status !== 'pago') return false
			if (l.estacionamentoId !== estacionamento.id) return false
			const dataLancamento = new Date(l.dataHora).toDateString()
			return dataLancamento === dataCaixa
		})
		const map = new Map<string, number>()
		for (const l of pagos) {
			const fid = l.formaPagamentoId
			if (!fid) continue
			const desc = formas.find(f => f.id === fid)?.descricao || fid
			map.set(desc, (map.get(desc) || 0) + l.valor)
		}
		return Array.from(map.entries())
	}, [caixa, estacionamento, lancamentos, formas])

	const totalSangrias = useMemo(() => {
		const movs = caixa?.movimentos
		if (!movs || !Array.isArray(movs)) return 0
		return movs.filter((m: { tipo: string }) => m.tipo === 'sangria').reduce((sum: number, m: { valor: number }) => sum + m.valor, 0)
	}, [caixa])

	const totalSuprimentos = useMemo(() => {
		const movs = caixa?.movimentos
		if (!movs || !Array.isArray(movs)) return 0
		return movs.filter((m: { tipo: string }) => m.tipo === 'suprimento').reduce((sum: number, m: { valor: number }) => sum + m.valor, 0)
	}, [caixa])

	const totalVendas = useMemo(() => resumo.reduce((sum, [, total]) => sum + total, 0), [resumo])
	const saldoFinal = (caixa?.valorInicial ?? 0) + totalVendas + totalSuprimentos - totalSangrias
	const dataStr = caixa && (typeof caixa.data === 'string' ? caixa.data : (caixa as { data?: string }).data)

	if (loading) return <div className="receipt"><h3>Comprovante</h3><div>Carregando...</div></div>
	if (!caixa) return <div className="receipt"><h3>Comprovante</h3><div>Registro não encontrado</div></div>

	const p = (params ?? {}) as Parametros
	return (
		<div className="receipt">
			{p.empresaLogoUrl ? (
				<div style={{ textAlign: 'center' }}>
					<img alt="logo" src={p.empresaLogoUrl} style={{ height: 40, objectFit: 'contain' }} />
				</div>
			) : null}
			<h3>{p.empresaNome || 'Comprovante'}</h3>
			{p.empresaCnpj && <div style={{ textAlign: 'center', marginBottom: 8 }}>CNPJ: {p.empresaCnpj}</div>}
			<div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 12, marginBottom: 12 }}>
				COMPROVANTE DE FECHAMENTO DE CAIXA - ESTACIONAMENTO
			</div>

			{estacionamento && <div><strong>Estacionamento:</strong> {estacionamento.nome}</div>}
			<div><strong>Caixa:</strong> {caixa.nome}</div>
			<div><strong>Data de Abertura:</strong> {dataStr ? new Date(dataStr).toLocaleDateString('pt-BR') : '-'}</div>
			<div><strong>Valor Inicial:</strong> R$ {caixa.valorInicial.toFixed(2)}</div>
			<hr />

			<div><strong>Total de Vendas:</strong> R$ {totalVendas.toFixed(2)}</div>
			{resumo.length > 0 && (
				<div style={{ marginLeft: 8, fontSize: '0.9em', marginTop: 4 }}>
					{resumo.map(([forma, total]) => (
						<div key={forma} style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span><PaymentIcon kind={resolvePaymentKind(forma)} /> {forma}:</span>
							<span>R$ {total.toFixed(2)}</span>
						</div>
					))}
				</div>
			)}

			<div style={{ color: 'var(--danger)' }}><strong>Sangrias:</strong> - R$ {totalSangrias.toFixed(2)}</div>
			<div style={{ color: 'var(--success)' }}><strong>Suprimentos:</strong> + R$ {totalSuprimentos.toFixed(2)}</div>

			<hr />
			<div style={{ fontSize: '1.1em', fontWeight: 'bold', marginTop: 8 }}>
				<strong>SALDO FINAL: R$ {saldoFinal.toFixed(2)}</strong>
			</div>

			<hr />
			<small>Comprovante de fechamento de caixa gerado automaticamente.</small>
		</div>
	)
}
