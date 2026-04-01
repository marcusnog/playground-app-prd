import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { caixasService, parametrosService, lancamentosService, formasPagamentoService, brinquedosService, type Parametros } from '../../services/entitiesService'
import { imprimirRecibo } from '../../utils/printUtils'

export default function ReciboFechamento() {
	const { id } = useParams()
	const [caixa, setCaixa] = useState<Awaited<ReturnType<typeof caixasService.get>> | null>(null)
	const [params, setParams] = useState<Awaited<ReturnType<typeof parametrosService.get>> | null>(null)
	const [lancamentos, setLancamentos] = useState<Awaited<ReturnType<typeof lancamentosService.list>>>([])
	const [formas, setFormas] = useState<Awaited<ReturnType<typeof formasPagamentoService.list>>>([])
	const [brinquedos, setBrinquedos] = useState<Awaited<ReturnType<typeof brinquedosService.list>>>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const idStr = id
		if (!idStr) return
		let cancelled = false
		async function load() {
			setLoading(true)
			try {
				const [c, p, list, f, b] = await Promise.all([
					caixasService.get(idStr as string),
					parametrosService.get(),
					lancamentosService.list(),
					formasPagamentoService.list(),
					brinquedosService.list(),
				])
				if (!cancelled) {
					setCaixa(c)
					setParams(p)
					setLancamentos(list || [])
					setFormas(f || [])
					setBrinquedos(Array.isArray(b) ? b : [])
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

	const resumo = useMemo(() => {
		if (!caixa) return []
		const dataStr = typeof caixa.data === 'string' ? caixa.data : (caixa as { data?: string }).data
		if (!dataStr) return []
		// Forçar parse como horário local para evitar deslocamento de fuso UTC-3
		const dataCaixa = new Date(dataStr.length === 10 ? dataStr + 'T00:00:00' : dataStr).toLocaleDateString('sv')
		const pagos = lancamentos.filter((l) => {
			if (l.status !== 'pago') return false
			return new Date(l.dataHora).toLocaleDateString('sv') === dataCaixa
		})
		const map = new Map<string, number>()
		for (const l of pagos) {
			// Split payment: distribuir cada forma pelo valor real do pagamentosJson
			if (l.pagamentosJson) {
				try {
					const splits = JSON.parse(l.pagamentosJson) as Array<{ formaPagamentoId: string; descricao: string; valor: number }>
					for (const s of splits) {
						const desc = s.descricao || formas.find(f => f.id === s.formaPagamentoId)?.descricao || 'Desconhecido'
						map.set(desc, (map.get(desc) || 0) + s.valor)
					}
					continue
				} catch { /* fallback abaixo */ }
			}
			const fid = l.formaPagamentoId
			if (!fid) continue
			const desc = formas.find(f => f.id === fid)?.descricao || fid
			map.set(desc, (map.get(desc) || 0) + l.valorCalculado)
		}
		return Array.from(map.entries())
	}, [caixa, lancamentos, formas])

	const resumoBrinquedos = useMemo(() => {
		if (!caixa) return []
		const dataStr = typeof caixa.data === 'string' ? caixa.data : (caixa as { data?: string }).data
		if (!dataStr) return []
		const dataCaixa = new Date(dataStr.length === 10 ? dataStr + 'T00:00:00' : dataStr).toLocaleDateString('sv')
		const pagos = lancamentos.filter((l) => {
			if (l.status !== 'pago') return false
			return new Date(l.dataHora).toLocaleDateString('sv') === dataCaixa
		})
		const map = new Map<string, { nome: string; quantidade: number; total: number }>()
		for (const l of pagos) {
			const brinqId = (l as { brinquedoId?: string }).brinquedoId
			const brinq = brinquedos.find((b) => b.id === brinqId)
			const nome = brinq?.nome || (brinqId ? 'Brinquedo removido' : 'Sem brinquedo')
			const key = brinqId || '__sem__'
			const qtd = (l as { quantidade?: number }).quantidade ?? 1
			const atual = map.get(key) || { nome, quantidade: 0, total: 0 }
			map.set(key, { nome: atual.nome, quantidade: atual.quantidade + qtd, total: atual.total + (l.valorCalculado || 0) })
		}
		return Array.from(map.values()).sort((a, b) => b.total - a.total)
	}, [caixa, lancamentos, brinquedos])

	const sangriasList = useMemo(() => {
		const movs = caixa?.movimentos
		if (!movs || !Array.isArray(movs)) return []
		return movs
			.filter((m: { tipo: string }) => m.tipo === 'sangria')
			.sort((a: { dataHora: string }, b: { dataHora: string }) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
	}, [caixa])

	const totalSangrias = useMemo(() => sangriasList.reduce((sum: number, m: { valor: number }) => sum + m.valor, 0), [sangriasList])

	const totalSuprimentos = useMemo(() => {
		const movs = caixa?.movimentos
		if (!movs || !Array.isArray(movs)) return 0
		return movs.filter((m: { tipo: string }) => m.tipo === 'suprimento').reduce((sum: number, m: { valor: number }) => sum + m.valor, 0)
	}, [caixa])

	const totalVendas = useMemo(() => resumo.reduce((sum, [, total]) => sum + total, 0), [resumo])

	const saldoFinal = (caixa?.valorInicial ?? 0) + totalVendas + totalSuprimentos - totalSangrias
	const dataAberturaStr = caixa && (typeof caixa.data === 'string' ? caixa.data : (caixa as { data?: string }).data)
	const dataFechamentoStr = caixa && (caixa as { updatedAt?: string }).updatedAt

	if (loading) return <div id="recibo" className="receipt"><h3>Comprovante</h3><div>Carregando...</div></div>
	if (!caixa) return <div id="recibo" className="receipt"><h3>Comprovante</h3><div>Registro não encontrado</div></div>

	const p = (params ?? {}) as Parametros
	return (
		<div id="recibo" className="receipt">
			<h3>{p.empresaNome || 'Comprovante'}</h3>
			{p.empresaCnpj && <div style={{ textAlign: 'center', marginBottom: 8 }}>CNPJ: {p.empresaCnpj}</div>}
			<div>Comprovante de Fechamento de Caixa</div>
			<div>Caixa: {caixa.nome}</div>
			<div>Data/Hora Abertura: {dataAberturaStr ? new Date(dataAberturaStr).toLocaleString('pt-BR') : '-'}</div>
			<div>Data/Hora Fechamento: {dataFechamentoStr ? new Date(dataFechamentoStr).toLocaleString('pt-BR') : '-'}</div>
			<div>Valor Inicial: R$ {caixa.valorInicial.toFixed(2)}</div>
			<hr />

			<div>Total de Vendas: R$ {totalVendas.toFixed(2)}</div>
			{resumo.map(([forma, total]) => (
				<div key={forma}>{forma}: R$ {total.toFixed(2)}</div>
			))}

			{resumoBrinquedos.length > 0 && (
				<>
					<hr />
					<div><strong>Brinquedos:</strong></div>
					{resumoBrinquedos.map((b) => (
						<div key={b.nome}>{b.nome}: {b.quantidade}x R$ {b.total.toFixed(2)}</div>
					))}
				</>
			)}

			<hr />
			<div>Sangrias: - R$ {totalSangrias.toFixed(2)}</div>
			{sangriasList.map((m: { id: string; dataHora: string; valor: number; motivo?: string }) => (
				<div key={m.id}>{new Date(m.dataHora).toLocaleString('pt-BR')} - {m.motivo || '-'}: - R$ {m.valor.toFixed(2)}</div>
			))}
			<div>Suprimentos: + R$ {totalSuprimentos.toFixed(2)}</div>

			<hr />
			<div><strong>SALDO FINAL: R$ {saldoFinal.toFixed(2)}</strong></div>

			<hr />
			<div>Comprovante de fechamento de caixa gerado automaticamente.</div>
		</div>
	)
}
