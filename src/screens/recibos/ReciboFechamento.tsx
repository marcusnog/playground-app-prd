import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { caixasService, parametrosService, lancamentosService, formasPagamentoService, brinquedosService, type Parametros } from '../../services/entitiesService'
import { imprimirRecibo } from '../../utils/printUtils'
import { movimentosDaSessao } from '../../services/utils'

export default function ReciboFechamento() {
	const { id } = useParams()
	const [caixa, setCaixa] = useState<Awaited<ReturnType<typeof caixasService.get>> | null>(null)
	const [params, setParams] = useState<Awaited<ReturnType<typeof parametrosService.get>> | null>(null)
	const [lancamentos, setLancamentos] = useState<Awaited<ReturnType<typeof lancamentosService.list>>>([])
	const [formas, setFormas] = useState<Awaited<ReturnType<typeof formasPagamentoService.list>>>([])
	const [brinquedos, setBrinquedos] = useState<Awaited<ReturnType<typeof brinquedosService.list>>>([])
	const [loading, setLoading] = useState(true)
	const caixaSessionId = useMemo(() => {
		if (!caixa) return ''
		const caixaComSessao = caixa as typeof caixa & {
			sessaoAtualId?: string | null
			aberturaId?: string | null
			ultimaAberturaId?: string | null
		}
		return caixaComSessao.sessaoAtualId || caixaComSessao.aberturaId || caixaComSessao.ultimaAberturaId || ''
	}, [caixa])

	useEffect(() => {
		const idStr = id
		if (!idStr) return
		let cancelled = false
		async function load() {
			setLoading(true)
			try {
				// Etapa 1: buscar caixa para obter a data
				const c = await caixasService.get(idStr as string)
				if (cancelled) return

				// Etapa 2: buscar demais dados em paralelo; o filtro do dia é feito localmente
				const caixaComSessao = c as typeof c & {
					sessaoAtualId?: string | null
					aberturaId?: string | null
					ultimaAberturaId?: string | null
				}
				const sessionId = caixaComSessao.sessaoAtualId || caixaComSessao.aberturaId || caixaComSessao.ultimaAberturaId || ''

				const [p, list, f, b] = await Promise.all([
					parametrosService.get(),
					sessionId
						? lancamentosService.list({ caixaAberturaId: sessionId })
						: lancamentosService.list(),
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

	// Lancamentos já filtrados pela data do caixa (via backend), só precisa filtrar por status
	function dataCaixaLocal(dataCaixa: string): string {
		const d = new Date(dataCaixa.length === 10 ? dataCaixa + 'T00:00:00' : dataCaixa)
		return d.toLocaleDateString('sv')
	}

	const dataCaixa = useMemo(() => {
		if (!caixa?.data) return null
		return dataCaixaLocal(caixa.data)
	}, [caixa])

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function pertenceASessaoDoRecibo(lancamento: any, dataReferencia?: string | null) {
		if (caixaSessionId) {
			return lancamento.caixaAberturaId === caixaSessionId
		}
		if (!dataCaixa || !dataReferencia) return false
		return new Date(dataReferencia).toLocaleDateString('sv') === dataCaixa
	}

	const pagos = useMemo(() => {
		return lancamentos.filter((l) => l.status === 'pago' && pertenceASessaoDoRecibo(l, l.dataHora))
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lancamentos, dataCaixa, caixaSessionId])

	const resumo = useMemo(() => {
		const map = new Map<string, number>()
		for (const l of pagos) {
			if (l.pagamentosJson) {
				try {
					const splits = JSON.parse(l.pagamentosJson) as Array<{ formaPagamentoId: string; descricao: string; valor: number }>
					const somaSplits = splits.reduce((acc, s) => acc + s.valor, 0)
					// Escala proporcional: corrige pagamentos em lote onde o pagamentosJson armazena o total do lote em cada lancamento
					const fator = somaSplits > 0.01 ? l.valorCalculado / somaSplits : 1
					for (const s of splits) {
						const desc = s.descricao || formas.find(f => f.id === s.formaPagamentoId)?.descricao || 'Desconhecido'
						map.set(desc, (map.get(desc) || 0) + s.valor * fator)
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
	}, [pagos, formas])

	const resumoBrinquedos = useMemo(() => {
		const map = new Map<string, { nome: string; quantidade: number; total: number }>()
		for (const l of pagos) {
			const brinqId = l.brinquedoId
			const brinq = brinquedos.find((b) => b.id === brinqId)
			const nome = brinq?.nome || (brinqId ? 'Brinquedo removido' : 'Sem brinquedo')
			const key = brinqId || '__sem__'
			const qtd = l.quantidade ?? 1
			const atual = map.get(key) || { nome, quantidade: 0, total: 0 }
			map.set(key, { nome: atual.nome, quantidade: atual.quantidade + qtd, total: atual.total + (l.valorCalculado || 0) })
		}
		return Array.from(map.values()).sort((a, b) => b.total - a.total)
	}, [pagos, brinquedos])

	const cortesiasDia = useMemo(() => {
		const isCortesia = (lancamento: (typeof pagos)[number]) => {
			if (lancamento.pagamentosJson) {
				try {
					const splits = JSON.parse(lancamento.pagamentosJson) as Array<{ formaPagamentoId?: string; descricao?: string }>
					return splits.some((s) => {
						const descricao = s.descricao || formas.find((f) => f.id === s.formaPagamentoId)?.descricao || ''
						return descricao.toLowerCase().includes('cortesia')
					})
				} catch {
					return false
				}
			}
			if (!lancamento.formaPagamentoId) return false
			const forma = formas.find((f) => f.id === lancamento.formaPagamentoId)
			return String(forma?.descricao || '').toLowerCase().includes('cortesia')
		}

		return pagos
			.filter((l) => isCortesia(l))
			.map((l) => {
				const brinqId = l.brinquedoId
				const brinq = brinquedos.find((b) => b.id === brinqId)
				const brinquedoNome = brinq?.nome || (brinqId ? 'Brinquedo removido' : 'Sem brinquedo')
				const quantidade = l.quantidade ?? 1
				const dataHoraUtilizada = l.updatedAt || l.dataHora
				return { id: l.id, brinquedoNome, quantidade, dataHoraUtilizada }
			})
			.sort((a, b) => new Date(a.dataHoraUtilizada).getTime() - new Date(b.dataHoraUtilizada).getTime())
	}, [pagos, formas, brinquedos])

	const canceladosDia = useMemo(() => {
		return lancamentos
			.filter((l) => l.status === 'cancelado')
			.filter((l) => pertenceASessaoDoRecibo(l, l.updatedAt || l.dataHora))
			.map((l) => {
				const brinqId = l.brinquedoId
				const brinq = brinquedos.find((b) => b.id === brinqId)
				const brinquedoNome = brinq?.nome || (brinqId ? 'Brinquedo removido' : 'Sem brinquedo')
				const quantidade = l.quantidade ?? 1
				const dataHoraCancelamento = l.updatedAt || l.dataHora
				return {
					id: l.id,
					nomeCrianca: l.nomeCrianca,
					nomeResponsavel: l.nomeResponsavel,
					brinquedoNome,
					quantidade,
					dataHoraCancelamento,
				}
			})
			.sort((a, b) => new Date(a.dataHoraCancelamento).getTime() - new Date(b.dataHoraCancelamento).getTime())
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lancamentos, brinquedos, dataCaixa, caixaSessionId])

	const sangriasList = useMemo(() => {
		if (!caixa?.data) return []
		return movimentosDaSessao(caixa.movimentos, caixa.data)
			.filter((m) => m.tipo === 'sangria')
			.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
	}, [caixa])

	const totalSangrias = useMemo(() => sangriasList.reduce((sum, m) => sum + m.valor, 0), [sangriasList])

	const totalSuprimentos = useMemo(() => {
		if (!caixa?.data) return 0
		return movimentosDaSessao(caixa.movimentos, caixa.data)
			.filter((m) => m.tipo === 'suprimento')
			.reduce((sum, m) => sum + m.valor, 0)
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
			<div>Data/Hora Abertura: {dataAberturaStr ? new Date(dataAberturaStr.length === 10 ? dataAberturaStr + 'T00:00:00' : dataAberturaStr).toLocaleString('pt-BR') : '-'}</div>
			<div>Data/Hora Fechamento: {dataFechamentoStr ? new Date(dataFechamentoStr).toLocaleString('pt-BR') : '-'}</div>
			<div>Valor Inicial: R$ {caixa.valorInicial.toFixed(2)}</div>
			<div>Sangrias: - R$ {totalSangrias.toFixed(2)}</div>
			{sangriasList.map((m: { id: string; dataHora: string; valor: number; motivo?: string }) => (
				<div key={m.id}>{new Date(m.dataHora).toLocaleString('pt-BR')} - {m.motivo || '-'}: - R$ {m.valor.toFixed(2)}</div>
			))}
			<div>Suprimentos: + R$ {totalSuprimentos.toFixed(2)}</div>
			<hr />

			<div>Total de Vendas: R$ {totalVendas.toFixed(2)}</div>
			<div>Total de Cancelados: {canceladosDia.length}</div>
			{resumo.map(([forma, total]) => (
				<div key={forma}>{forma}: R$ {total.toFixed(2)}</div>
			))}

			<hr />
			<div><strong>Cancelados:</strong></div>
			{canceladosDia.length > 0 ? (
				<>
					{canceladosDia.map((c) => (
						<div key={c.id}>
							{c.nomeCrianca} - {c.brinquedoNome}: {c.quantidade}x em {new Date(c.dataHoraCancelamento).toLocaleString('pt-BR')}
						</div>
					))}
				</>
			) : (
				<div>Nenhum cancelamento registrado</div>
			)}

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
			<div><strong>Cortesias Usadas:</strong></div>
			{cortesiasDia.length > 0 ? (
				<>
					<div>Total: {cortesiasDia.length}</div>
					{cortesiasDia.map((c) => (
						<div key={c.id}>
							{c.brinquedoNome}: {c.quantidade}x em {new Date(c.dataHoraUtilizada).toLocaleString('pt-BR')}
						</div>
					))}
				</>
			) : (
				<div>Nenhuma cortesia utilizada</div>
			)}

			<hr />
			<div><strong>SALDO FINAL: R$ {saldoFinal.toFixed(2)}</strong></div>

			<hr />
			<div>Comprovante de fechamento de caixa gerado automaticamente.</div>
		</div>
	)
}
