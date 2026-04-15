import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { lancamentosService, formasPagamentoService, parametrosService, brinquedosService } from '../services/entitiesService'
import { calcularValorExibidoLancamento } from '../services/utils'
import { PaymentIcon, resolvePaymentKind } from '../ui/icons'
import type { Lancamento, FormaPagamento, Parametros as ParametrosType, Brinquedo as BrinquedoType } from '../services/entitiesService'

type PagamentoLinha = { id: string; formaId: string; valor: string }

export default function PagamentoMultiplo() {
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const ids = useMemo(
		() => (searchParams.get('ids') ?? '').split(',').filter(Boolean),
		[searchParams]
	)

	const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
	const [formas, setFormas] = useState<FormaPagamento[]>([])
	const [parametros, setParametros] = useState<ParametrosType | null>(null)
	const [brinquedos, setBrinquedos] = useState<BrinquedoType[]>([])
	const [loading, setLoading] = useState(true)
	const [pagamentos, setPagamentos] = useState<PagamentoLinha[]>([])
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		if (ids.length < 2) {
			navigate('/acompanhamento')
			return
		}
		async function load() {
			try {
				setLoading(true)
				const [lancsData, formasData, paramsData, brinquedosData] = await Promise.all([
					Promise.all(ids.map((id) => lancamentosService.get(id))),
					formasPagamentoService.list(),
					parametrosService.get(),
					brinquedosService.list(),
				])
				setLancamentos(lancsData)
				setFormas(formasData.filter((f) => f.status === 'ativo'))
				setParametros(paramsData)
				setBrinquedos(Array.isArray(brinquedosData) ? brinquedosData : [])
				setPagamentos([{ id: crypto.randomUUID(), formaId: '', valor: '' }])
			} catch {
				alert('Erro ao carregar dados. Tente novamente.')
			} finally {
				setLoading(false)
			}
		}
		load()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	// Usar valorCalculado do banco (evita drift de tempo entre navegação e carregamento)
	const valorTotal = useMemo(
		() => lancamentos.reduce((s, l) => s + l.valorCalculado, 0),
		[lancamentos]
	)

	const pagamentosNum = useMemo(
		() => pagamentos.map((p) => ({
			...p,
			valorNum: parseFloat(String(p.valor || '').replace(',', '.')) || 0,
		})),
		[pagamentos]
	)

	const somaPagamentos = useMemo(
		() => pagamentosNum.reduce((s, p) => s + p.valorNum, 0),
		[pagamentosNum]
	)

	const totalDinheiro = useMemo(() => {
		return pagamentosNum.reduce((s, p) => {
			const f = formas.find((f) => f.id === p.formaId)
			return f?.descricao.toLowerCase().includes('dinheiro') ? s + p.valorNum : s
		}, 0)
	}, [pagamentosNum, formas])

	const troco = useMemo(() => {
		if (totalDinheiro <= 0) return 0
		const nonCash = somaPagamentos - totalDinheiro
		const cashRequired = Math.max(0, valorTotal - nonCash)
		return Math.max(0, totalDinheiro - cashRequired)
	}, [totalDinheiro, somaPagamentos, valorTotal])

	async function finalizar() {
		const linhas = pagamentosNum.filter((p) => p.formaId && p.valorNum > 0)
		if (linhas.length === 0) return alert('Adicione ao menos uma forma de pagamento com valor')

		if (totalDinheiro > 0) {
			if (somaPagamentos < valorTotal) {
				return alert(`Valor insuficiente. Faltam R$ ${(valorTotal - somaPagamentos).toFixed(2)}`)
			}
		} else if (Math.abs(somaPagamentos - valorTotal) > 0.01) {
			return alert(`A soma das formas (R$ ${somaPagamentos.toFixed(2)}) deve ser igual ao valor total (R$ ${valorTotal.toFixed(2)})`)
		}

		let trocoRestante = troco
		const pagamentosAjustados = linhas.map((p) => {
			if (trocoRestante <= 0) return { formaPagamentoId: p.formaId, valor: p.valorNum }
			const f = formas.find((f) => f.id === p.formaId)
			if (f?.descricao.toLowerCase().includes('dinheiro')) {
				const ajuste = Math.min(trocoRestante, p.valorNum)
				trocoRestante -= ajuste
				return { formaPagamentoId: p.formaId, valor: Math.round((p.valorNum - ajuste) * 100) / 100 }
			}
			return { formaPagamentoId: p.formaId, valor: p.valorNum }
		})

		try {
			setSaving(true)
			await lancamentosService.pagarMultiplos(ids, pagamentosAjustados, valorTotal)
			alert('Pagamento concluído com sucesso!')
			navigate('/acompanhamento')
		} catch (error) {
			const msg = error && typeof error === 'object' && 'message' in error
				? String((error as { message?: unknown }).message)
				: ''
			alert(msg || 'Erro ao processar pagamento. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<div className="container" style={{ maxWidth: 600 }}>
				<h2>Pagamento em Lote</h2>
				<div className="card"><div>Carregando...</div></div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 600 }}>
			<h2>Pagamento em Lote</h2>

			{/* Lista de tickets */}
			<div className="card" style={{ marginBottom: 16 }}>
				<strong style={{ display: 'block', marginBottom: 8 }}>{lancamentos.length} tickets selecionados</strong>
				<table className="table">
					<thead>
						<tr>
							<th>Criança</th>
							<th>Brinquedo</th>
							<th>Valor</th>
						</tr>
					</thead>
					<tbody>
						{lancamentos.map((l) => {
							const brinquedo = l.brinquedoId ? brinquedos.find((b) => b.id === l.brinquedoId) : undefined
							const valor = calcularValorExibidoLancamento(l, parametros as ParametrosType | null, brinquedo as BrinquedoType | undefined)
							return (
								<tr key={l.id}>
									<td>{l.nomeCrianca}</td>
									<td>{brinquedo?.nome ?? '-'}</td>
									<td>R$ {valor.toFixed(2)}</td>
								</tr>
							)
						})}
					</tbody>
				</table>
				<div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', marginTop: 8 }}>
					Total: R$ {valorTotal.toFixed(2)}
				</div>
			</div>

			{/* Builder de formas de pagamento */}
			<div className="card">
				<label className="field">
					<span>Formas de pagamento</span>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
						{pagamentos.map((p, idx) => (
							<div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6 }}>
								<label className="field">
									<span>Forma</span>
									<div className="row center" style={{ gap: 8 }}>
										<PaymentIcon kind={resolvePaymentKind(p.formaId)} />
										<select
											className="select"
											value={p.formaId}
											onChange={(e) => setPagamentos((prev) => prev.map((x) => x.id === p.id ? { ...x, formaId: e.target.value } : x))}
										>
											<option value="">Selecione...</option>
											{formas.map((f) => <option key={f.id} value={f.id}>{f.descricao}</option>)}
										</select>
									</div>
								</label>
								<label className="field">
									<span>Valor (R$)</span>
									<input
										className="input"
										type="text"
										placeholder="0,00"
										value={p.valor}
										onFocus={(e) => e.target.select()}
										onChange={(e) => {
											const v = e.target.value.replace(/[^\d,]/g, '')
											setPagamentos((prev) => prev.map((x) => x.id === p.id ? { ...x, valor: v } : x))
										}}
									/>
								</label>
								<div className="row" style={{ gap: 8 }}>
									{pagamentos.length > 1 && (
										<button className="btn" type="button" onClick={() => setPagamentos((prev) => prev.filter((x) => x.id !== p.id))}>
											− Remover
										</button>
									)}
									{idx === pagamentos.length - 1 && (
										<button className="btn" type="button" onClick={() => setPagamentos((prev) => [...prev, { id: crypto.randomUUID(), formaId: '', valor: '' }])}>
											+ Adicionar forma
										</button>
									)}
								</div>
							</div>
						))}
					</div>
					<div className="help" style={{ marginTop: 8 }}>
						Soma: R$ {somaPagamentos.toFixed(2)} / Total: R$ {valorTotal.toFixed(2)}
					</div>
					{troco > 0 && (
						<div style={{ color: 'var(--success)', fontWeight: 'bold', marginTop: 4 }}>
							Troco: R$ {troco.toFixed(2)}
						</div>
					)}
					{totalDinheiro > 0 && somaPagamentos > 0 && somaPagamentos < valorTotal && (
						<div style={{ color: 'var(--danger)', fontSize: '0.9rem', marginTop: 4 }}>
							Valor insuficiente. Faltam R$ {(valorTotal - somaPagamentos).toFixed(2)}
						</div>
					)}
				</label>

				<div className="actions" style={{ justifyContent: 'space-between', marginTop: 16 }}>
					<button className="btn" onClick={() => navigate('/acompanhamento')} disabled={saving}>
						Voltar
					</button>
					<button className="btn primary icon" onClick={finalizar} disabled={saving}>
						{saving ? 'Processando...' : `Confirmar Pagamento (${lancamentos.length} tickets)`}
					</button>
				</div>
			</div>
		</div>
	)
}
