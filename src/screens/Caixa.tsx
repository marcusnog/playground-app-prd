import { useEffect, useState } from 'react'
import { caixasService, lancamentosService, formasPagamentoService } from '../services/entitiesService'
import type { Caixa } from '../services/entitiesService'
import { PaymentIcon, resolvePaymentKind } from '../ui/icons'

export default function Caixa() {
	const [caixas, setCaixas] = useState<Caixa[]>([])
	const [lancamentos, setLancamentos] = useState<Awaited<ReturnType<typeof lancamentosService.list>>>([])
	const [formasPagamento, setFormasPagamento] = useState<Awaited<ReturnType<typeof formasPagamentoService.list>>>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [valorInicial, setValorInicial] = useState<number>(0)
	const [saving, setSaving] = useState(false)

	const aberto = caixas.find((c) => c.status === 'aberto')

	async function refresh() {
		try {
			setLoading(true)
			setError(null)
			const [caixasData, lancamentosData, formasData] = await Promise.all([
				caixasService.list(),
				lancamentosService.list(),
				formasPagamentoService.list(),
			])
			setCaixas(caixasData ?? [])
			setLancamentos(lancamentosData ?? [])
			setFormasPagamento(formasData ?? [])
		} catch (e) {
			console.error('Erro ao carregar caixa:', e)
			setError('Erro ao carregar dados. Tente novamente.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		refresh()
	}, [])

	async function abrir() {
		if (aberto) return alert('Já existe um caixa aberto')
		try {
			setSaving(true)
			setError(null)
			await caixasService.abrir('', valorInicial, `Caixa ${caixas.length + 1}`)
			setValorInicial(0)
			await refresh()
		} catch (e) {
			console.error('Erro ao abrir caixa:', e)
			setError('Erro ao abrir caixa. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	async function fechar() {
		if (!aberto) return
		try {
			setSaving(true)
			setError(null)
			await caixasService.fechar(aberto.id)
			await refresh()
		} catch (e) {
			console.error('Erro ao fechar caixa:', e)
			setError('Erro ao fechar caixa. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	// Resumo por forma de pagamento usando lançamentos pagos
	const resumo = lancamentos
		.filter((l) => l.status === 'pago' && l.formaPagamentoId)
		.reduce((acc, l) => {
			const forma = l.formaPagamentoId!
			acc.set(forma, (acc.get(forma) || 0) + l.valorCalculado)
			return acc
		}, new Map<string, number>())

	const formasMap = new Map(formasPagamento.map(f => [f.id, f.descricao]))
	const resumoArray = Array.from(resumo.entries()).map(([id, total]) => ({
		id,
		forma: formasMap.get(id) || id,
		total
	}))

	if (loading && caixas.length === 0) {
		return (
			<div className="container" style={{ maxWidth: 800 }}>
				<h2>Caixa</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 800 }}>
			<h2>Caixa</h2>
			{error && (
				<div className="card" style={{ marginBottom: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<p style={{ color: 'var(--danger)' }}>{error}</p>
				</div>
			)}
			<section className="card stack" style={{ marginBottom: 16 }}>
				<h3>Abertura</h3>
				<div>Data: {new Date().toLocaleDateString()}</div>
				<label className="field">Valor inicial (R$)
					<input className="input" type="number" value={valorInicial} onChange={(e) => setValorInicial(Number(e.target.value))} />
				</label>
				<div>Status: {aberto ? <span className="badge on">Caixa Aberto</span> : <span className="badge off">Caixa Fechado</span>}</div>
				<button className="btn primary" onClick={abrir} disabled={!!aberto || saving}>
					{saving ? 'Abrindo...' : 'Abrir'}
				</button>
			</section>
			<section className="card stack">
				<h3>Fechamento</h3>
				<div>Resumo por forma de pagamento:</div>
				<table className="table">
					<thead>
						<tr><th>Forma</th><th>Total (R$)</th></tr>
					</thead>
					<tbody>
					{resumoArray.map(({ id, forma, total }) => (
						<tr key={id}>
							<td><span className="row center"><PaymentIcon kind={resolvePaymentKind(forma)} /> <span>{forma}</span></span></td>
							<td>{total.toFixed(2)}</td>
						</tr>
					))}
					</tbody>
				</table>
				<button className="btn primary" onClick={fechar} disabled={!aberto || saving}>
					{saving ? 'Fechando...' : 'Fechar Caixa'}
				</button>
			</section>
		</div>
	)
}
