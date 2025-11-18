import { useMemo, useState } from 'react'
import { db } from '../../services/mockDb'
import { PaymentIcon, resolvePaymentKind } from '../../ui/icons'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../../hooks/usePermissions'

export default function CaixaFechamento() {
	const [_, force] = useState(0)
	const estacionamentos = useMemo(() => db.get().estacionamentos, [_])
	const caixas = useMemo(() => db.get().caixas, [_])
	const [estacionamentoSelecionado, setEstacionamentoSelecionado] = useState<string>('')
	const navigate = useNavigate()
	const { hasPermission } = usePermissions()

	// Verificar permissão
	if (!hasPermission('estacionamento', 'caixa', 'fechamento')) {
		return (
			<div className="container" style={{ maxWidth: 800 }}>
				<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<h3 style={{ color: 'var(--danger)' }}>Acesso Negado</h3>
					<p>Você não tem permissão para acessar esta funcionalidade.</p>
				</div>
			</div>
		)
	}

	function refresh() { force((x) => x + 1 as unknown as number) }

	// Buscar caixa do estacionamento selecionado
	const estacionamento = useMemo(() => 
		estacionamentos.find(e => e.id === estacionamentoSelecionado),
		[estacionamentos, estacionamentoSelecionado]
	)
	
	const caixaEstacionamento = useMemo(() => {
		if (!estacionamento) return null
		return caixas.find(c => c.id === estacionamento.caixaId)
	}, [estacionamento, caixas])

	const caixaAberto = caixaEstacionamento?.status === 'aberto'

	// Resumo por forma de pagamento usando lançamentos pagos do dia
	const resumo = useMemo(() => {
		const d = db.get()
		if (!caixaEstacionamento || !estacionamento) return []
		
		const dataCaixa = new Date(caixaEstacionamento.data).toDateString()
		const pagos = d.lancamentosEstacionamento.filter((l) => {
			if (l.status !== 'pago') return false
			if (l.estacionamentoId !== estacionamento.id) return false
			const dataLancamento = new Date(l.dataHora).toDateString()
			return dataLancamento === dataCaixa
		})
		
		const map = new Map<string, number>()
		for (const l of pagos) {
			const forma = l.formaPagamentoId
			if (!forma) continue
			map.set(forma, (map.get(forma) || 0) + l.valor)
		}
		return Array.from(map.entries())
	}, [_, caixaEstacionamento, estacionamento])

	// Calcular totais de sangrias e suprimentos
	const totalSangrias = useMemo(() => {
		if (!caixaEstacionamento || !caixaEstacionamento.movimentos) return 0
		return caixaEstacionamento.movimentos
			.filter(m => m.tipo === 'sangria')
			.reduce((sum, m) => sum + m.valor, 0)
	}, [caixaEstacionamento])

	const totalSuprimentos = useMemo(() => {
		if (!caixaEstacionamento || !caixaEstacionamento.movimentos) return 0
		return caixaEstacionamento.movimentos
			.filter(m => m.tipo === 'suprimento')
			.reduce((sum, m) => sum + m.valor, 0)
	}, [caixaEstacionamento])

	const totalVendas = useMemo(() => {
		return resumo.reduce((sum, [, total]) => sum + total, 0)
	}, [resumo])

	const saldoFinal = (caixaEstacionamento?.valorInicial || 0) + totalVendas + totalSuprimentos - totalSangrias

	function fechar() {
		if (!estacionamentoSelecionado) {
			return alert('Selecione um estacionamento')
		}
		if (!caixaEstacionamento || !caixaAberto) {
			return alert('Não há caixa aberto para fechar')
		}
		if (!confirm('Deseja realmente fechar o caixa?')) return
		
		const caixaId = caixaEstacionamento.id
		db.update((d) => {
			const c = d.caixas.find((x) => x.id === caixaId)
			if (c) c.status = 'fechado'
		})
		refresh()
		alert('Caixa fechado com sucesso!')
		navigate(`/recibo/estacionamento/fechamento/${caixaId}`)
	}

	function imprimir() {
		window.print()
	}

	return (
		<div className="container" style={{ maxWidth: 800 }}>
			<h2>Fechamento de Caixa - Estacionamento</h2>
			
			<label className="field" style={{ marginBottom: 16 }}>
				<span>Selecione o Estacionamento *</span>
				<select 
					className="select" 
					value={estacionamentoSelecionado} 
					onChange={(e) => setEstacionamentoSelecionado(e.target.value)}
				>
					<option value="">Selecione um estacionamento...</option>
					{estacionamentos.map((e) => {
						const caixa = caixas.find(c => c.id === e.caixaId)
						return (
							<option key={e.id} value={e.id}>
								{e.nome} - Caixa: {caixa?.nome || 'N/A'} ({caixa?.status === 'aberto' ? 'Aberto' : 'Fechado'})
							</option>
						)
					})}
				</select>
			</label>

			{!caixaAberto || !caixaEstacionamento ? (
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
							<h3>Resumo do Dia - {estacionamento?.nome}</h3>
							<div className="row" style={{ gap: 8 }}>
								<button className="btn" onClick={imprimir}>🖨️ Imprimir</button>
							</div>
						</div>
						
						<div className="grid-2" style={{ marginBottom: 16 }}>
							<div className="card">
								<h4>Informações do Caixa</h4>
								<div className="stack">
									<div><strong>Caixa:</strong> {caixaEstacionamento.nome}</div>
									<div><strong>Data de Abertura:</strong> {new Date(caixaEstacionamento.data).toLocaleDateString('pt-BR')}</div>
									<div><strong>Valor Inicial:</strong> R$ {caixaEstacionamento.valorInicial.toFixed(2)}</div>
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

					<div className="actions no-print">
						<button className="btn" onClick={imprimir}>🖨️ Imprimir Relatório</button>
						<button className="btn primary" onClick={fechar}>🔒 Fechar Caixa</button>
					</div>
				</>
			)}
		</div>
	)
}

