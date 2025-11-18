import { useMemo, useState } from 'react'
import { db, type Caixa } from '../services/mockDb'
import { PaymentIcon, resolvePaymentKind } from '../ui/icons'

export default function Caixa() {
	const [_, force] = useState(0)
	const caixas = useMemo(() => db.get().caixas, [_])
	const aberto = caixas.find((c) => c.status === 'aberto')
	const [valorInicial, setValorInicial] = useState<number>(0)

	function refresh() { force((x) => x + 1 as unknown as number) }

	function abrir() {
		if (aberto) return alert('Já existe um caixa aberto')
		db.update((d) => {
			d.caixas.push({ 
				id: String(Date.now()), 
				nome: `Caixa ${d.caixas.length + 1}`,
				data: new Date().toISOString(), 
				valorInicial, 
				status: 'aberto',
				movimentos: []
			})
		})
		setValorInicial(0)
		refresh()
	}

	function fechar() {
		if (!aberto) return
		db.update((d) => {
			const c = d.caixas.find((x) => x.id === aberto.id)
			if (c) c.status = 'fechado'
		})
		refresh()
	}

	// resumo por forma de pagamento usando lancamentos pagos
	const resumo = useMemo(() => {
		const d = db.get()
		const pagos = d.lancamentos.filter((l) => l.status === 'pago')
		const map = new Map<string, number>()
		for (const l of pagos) {
			const forma = (l as any).formaPagamentoId as string | undefined
			if (!forma) continue
			map.set(forma, (map.get(forma) || 0) + l.valorCalculado)
		}
		return Array.from(map.entries())
	}, [_])

	return (
		<div className="container" style={{ maxWidth: 800 }}>
			<h2>Caixa</h2>
			<section className="card stack" style={{ marginBottom: 16 }}>
				<h3>Abertura</h3>
				<div>Data: {new Date().toLocaleDateString()}</div>
				<label className="field">Valor inicial (R$)
					<input className="input" type="number" value={valorInicial} onChange={(e) => setValorInicial(Number(e.target.value))} />
				</label>
				<div>Status: {aberto ? <span className="badge on">Caixa Aberto</span> : <span className="badge off">Caixa Fechado</span>}</div>
				<button className="btn primary" onClick={abrir} disabled={!!aberto}>Abrir</button>
			</section>
			<section className="card stack">
				<h3>Fechamento</h3>
				<div>Resumo por forma de pagamento:</div>
				<table className="table">
					<thead>
						<tr><th>Forma</th><th>Total (R$)</th></tr>
					</thead>
					<tbody>
					{resumo.map(([forma, total]) => (
						<tr key={forma}><td><span className="row center"><PaymentIcon kind={resolvePaymentKind(forma)} /> <span>{forma}</span></span></td><td>{total.toFixed(2)}</td></tr>
						))}
					</tbody>
				</table>
				<button className="btn primary" onClick={fechar} disabled={!aberto}>Fechar Caixa</button>
			</section>
		</div>
	)
}


