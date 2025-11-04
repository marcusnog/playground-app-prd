import { useMemo, useState } from 'react'
import { db } from '../../services/mockDb'
import { PaymentIcon, resolvePaymentKind } from '../../ui/icons'
import { useNavigate } from 'react-router-dom'

export default function Fechamento() {
	const [_, force] = useState(0)
	const caixas = useMemo(() => db.get().caixas, [_])
	const aberto = caixas.find((c) => c.status === 'aberto')
	const navigate = useNavigate()

	function refresh() { force((x) => x + 1 as unknown as number) }

	// Resumo por forma de pagamento usando lancamentos pagos do dia
	const resumo = useMemo(() => {
		const d = db.get()
		if (!aberto) return []
		
		const dataCaixa = new Date(aberto.data).toDateString()
		const pagos = d.lancamentos.filter((l) => {
			if (l.status !== 'pago') return false
			const dataLancamento = new Date(l.dataHora).toDateString()
			return dataLancamento === dataCaixa
		})
		
		const map = new Map<string, number>()
		for (const l of pagos) {
			const forma = (l as any).formaPagamentoId as string | undefined
			if (!forma) continue
			map.set(forma, (map.get(forma) || 0) + l.valorCalculado)
		}
		return Array.from(map.entries())
	}, [_, aberto])

	// Calcular totais de sangrias e suprimentos
	const totalSangrias = useMemo(() => {
		if (!aberto || !aberto.movimentos) return 0
		return aberto.movimentos
			.filter(m => m.tipo === 'sangria')
			.reduce((sum, m) => sum + m.valor, 0)
	}, [aberto])

	const totalSuprimentos = useMemo(() => {
		if (!aberto || !aberto.movimentos) return 0
		return aberto.movimentos
			.filter(m => m.tipo === 'suprimento')
			.reduce((sum, m) => sum + m.valor, 0)
	}, [aberto])

	// Calcular totais
	const totalVendas = useMemo(() => {
		return resumo.reduce((sum, [, total]) => sum + total, 0)
	}, [resumo])

	const saldoFinal = (aberto?.valorInicial || 0) + totalVendas + totalSuprimentos - totalSangrias

	function fechar() {
		if (!aberto) return alert('Não há caixa aberto para fechar')
		if (!confirm('Deseja realmente fechar o caixa?')) return
		
		db.update((d) => {
			const c = d.caixas.find((x) => x.id === aberto.id)
			if (c) c.status = 'fechado'
		})
		refresh()
		alert('Caixa fechado com sucesso!')
		navigate('/caixa/abertura')
	}

	function imprimir() {
		window.print()
	}

	return (
		<div className="container" style={{ maxWidth: 800 }}>
			<h2>Fechamento de Caixa</h2>
			
			{!aberto ? (
				<div className="card">
					<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
						<div className="row center" style={{ gap: 8 }}>
							<span style={{ fontSize: '1.2rem' }}>⚠️</span>
							<div>
								<strong style={{ color: 'var(--danger)' }}>Caixa Fechado</strong>
								<div className="subtitle">Não há caixa aberto para fechar</div>
							</div>
						</div>
					</div>
				</div>
			) : (
				<>
					{/* Resumo do Dia */}
					<div className="card" style={{ marginBottom: 16 }}>
						<div className="title">
							<h3>Resumo do Dia</h3>
							<div className="row" style={{ gap: 8 }}>
								<button className="btn" onClick={imprimir}>🖨️ Imprimir</button>
							</div>
						</div>
						
						<div className="grid-2" style={{ marginBottom: 16 }}>
							<div className="card">
								<h4>Informações do Caixa</h4>
								<div className="stack">
									<div><strong>Data de Abertura:</strong> {new Date(aberto.data).toLocaleDateString('pt-BR')}</div>
									<div><strong>Valor Inicial:</strong> R$ {aberto.valorInicial.toFixed(2)}</div>
									<div><strong>Status:</strong> <span className="badge on">Aberto</span></div>
								</div>
							</div>
							
							<div className="card">
								<h4>Totais</h4>
								<div className="stack">
									<div><strong>Total de Vendas:</strong> R$ {totalVendas.toFixed(2)}</div>
									<div style={{ color: 'var(--danger)' }}><strong>Sangrias:</strong> - R$ {totalSangrias.toFixed(2)}</div>
									<div style={{ color: 'var(--success)' }}><strong>Suprimentos:</strong> + R$ {totalSuprimentos.toFixed(2)}</div>
									<div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: 8 }}>
										<strong>Saldo Final:</strong> R$ {saldoFinal.toFixed(2)}
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Resumo por Forma de Pagamento */}
					<div className="card" style={{ marginBottom: 16 }}>
						<h3>Vendas por Forma de Pagamento</h3>
						{resumo.length > 0 ? (
							<div className="table-wrap">
								<table className="table">
									<thead>
										<tr><th>Forma</th><th>Total (R$)</th></tr>
									</thead>
									<tbody>
										{resumo.map(([forma, total]) => (
											<tr key={forma}>
												<td>
													<span className="row center">
														<PaymentIcon kind={resolvePaymentKind(forma)} /> 
														<span>{forma}</span>
													</span>
												</td>
												<td>R$ {total.toFixed(2)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="empty">Nenhuma venda registrada hoje</div>
						)}
					</div>

					{/* Sangrias e Suprimentos */}
					<div className="grid-2" style={{ marginBottom: 16 }}>
						{/* Sangrias */}
						<div className="card">
							<h3 style={{ color: 'var(--danger)' }}>Sangrias (-)</h3>
							{aberto.movimentos && aberto.movimentos.filter(m => m.tipo === 'sangria').length > 0 ? (
								<div className="table-wrap">
									<table className="table">
										<thead>
											<tr><th>Hora</th><th>Valor</th><th>Motivo</th></tr>
										</thead>
										<tbody>
											{aberto.movimentos
												.filter(m => m.tipo === 'sangria')
												.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
												.map((mov) => (
													<tr key={mov.id}>
														<td>{new Date(mov.dataHora).toLocaleTimeString('pt-BR')}</td>
														<td style={{ color: 'var(--danger)' }}>- R$ {mov.valor.toFixed(2)}</td>
														<td>{mov.motivo || '-'}</td>
													</tr>
												))}
										</tbody>
									</table>
								</div>
							) : (
								<div className="empty">Nenhuma sangria registrada</div>
							)}
							<div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
								<strong>Total: - R$ {totalSangrias.toFixed(2)}</strong>
							</div>
						</div>

						{/* Suprimentos */}
						<div className="card">
							<h3 style={{ color: 'var(--success)' }}>Suprimentos (+)</h3>
							{aberto.movimentos && aberto.movimentos.filter(m => m.tipo === 'suprimento').length > 0 ? (
								<div className="table-wrap">
									<table className="table">
										<thead>
											<tr><th>Hora</th><th>Valor</th><th>Motivo</th></tr>
										</thead>
										<tbody>
											{aberto.movimentos
												.filter(m => m.tipo === 'suprimento')
												.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
												.map((mov) => (
													<tr key={mov.id}>
														<td>{new Date(mov.dataHora).toLocaleTimeString('pt-BR')}</td>
														<td style={{ color: 'var(--success)' }}>+ R$ {mov.valor.toFixed(2)}</td>
														<td>{mov.motivo || '-'}</td>
													</tr>
												))}
										</tbody>
									</table>
								</div>
							) : (
								<div className="empty">Nenhum suprimento registrado</div>
							)}
							<div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
								<strong>Total: + R$ {totalSuprimentos.toFixed(2)}</strong>
							</div>
						</div>
					</div>

					<div className="actions no-print">
						<button className="btn" onClick={imprimir}>🖨️ Imprimir Relatório</button>
						<button className="btn primary" onClick={fechar}>🔒 Fechar Caixa</button>
					</div>
				</>
			)}
		</div>
	)
}

