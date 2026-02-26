import { useState, useEffect, useMemo } from 'react'
import { useCaixa } from '../../hooks/useCaixa'
import { caixasService, lancamentosService, formasPagamentoService } from '../../services/entitiesService'
import { PaymentIcon, resolvePaymentKind } from '../../ui/icons'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../../hooks/usePermissions'

export default function Fechamento() {
	const { caixas, refresh } = useCaixa()
	const navigate = useNavigate()
	const { hasPermission, canUseCaixa, user } = usePermissions()
	const [loading, setLoading] = useState(false)
	const [lancamentos, setLancamentos] = useState<any[]>([])
	const [formasPagamento, setFormasPagamento] = useState<any[]>([])

	const caixasAbertos = useMemo(
		() => caixas.filter((c) => c.status === 'aberto'),
		[caixas]
	)
	const caixasPermitidos = useMemo(
		() => caixasAbertos.filter((c) => canUseCaixa(c.id)),
		[caixasAbertos, canUseCaixa]
	)

	const defaultSelectedId = useMemo(() => {
		if (caixasPermitidos.length === 0) return ''
		if (user?.usaCaixa && user.caixaId && caixasPermitidos.some((c) => c.id === user.caixaId)) {
			return user.caixaId
		}
		return caixasPermitidos[0]?.id ?? ''
	}, [caixasPermitidos, user?.usaCaixa, user?.caixaId])

	const [selectedId, setSelectedId] = useState(defaultSelectedId)

	useEffect(() => {
		setSelectedId((prev) => {
			if (caixasPermitidos.some((c) => c.id === prev)) return prev
			return defaultSelectedId
		})
	}, [caixasPermitidos, defaultSelectedId])

	const selectedCaixa = useMemo(
		() => caixasPermitidos.find((c) => c.id === selectedId),
		[caixasPermitidos, selectedId]
	)

	useEffect(() => {
		async function loadData() {
			if (!selectedCaixa) return
			try {
				setLoading(true)
				const [lancs, formas] = await Promise.all([
					lancamentosService.list(),
					formasPagamentoService.list()
				])
				setLancamentos(lancs)
				setFormasPagamento(formas)
			} catch (error) {
				console.error('Erro ao carregar dados:', error)
			} finally {
				setLoading(false)
			}
		}
		loadData()
	}, [selectedCaixa])

	// Resumo por forma de pagamento usando lancamentos pagos do dia
	const resumo = useMemo(() => {
		if (!selectedCaixa) return []
		
		const dataCaixa = new Date(selectedCaixa.data).toDateString()
		const pagos = lancamentos.filter((l) => {
			if (l.status !== 'pago') return false
			const dataLancamento = new Date(l.dataHora).toDateString()
			return dataLancamento === dataCaixa
		})
		
		const map = new Map<string, { nome: string, total: number }>()
		for (const l of pagos) {
			const formaId = l.formaPagamentoId as string | undefined
			if (!formaId) continue
			const forma = formasPagamento.find(f => f.id === formaId)
			const nomeForma = forma?.descricao || 'Desconhecido'
			const atual = map.get(formaId) || { nome: nomeForma, total: 0 }
			map.set(formaId, { nome: atual.nome, total: atual.total + l.valorCalculado })
		}
		return Array.from(map.values()).map(v => [v.nome, v.total] as [string, number])
	}, [selectedCaixa, lancamentos, formasPagamento])

	// Calcular totais de sangrias e suprimentos
	const totalSangrias = useMemo(() => {
		if (!selectedCaixa || !selectedCaixa.movimentos) return 0
		return selectedCaixa.movimentos
			.filter(m => m.tipo === 'sangria')
			.reduce((sum, m) => sum + m.valor, 0)
	}, [selectedCaixa])

	const totalSuprimentos = useMemo(() => {
		if (!selectedCaixa || !selectedCaixa.movimentos) return 0
		return selectedCaixa.movimentos
			.filter(m => m.tipo === 'suprimento')
			.reduce((sum, m) => sum + m.valor, 0)
	}, [selectedCaixa])

	// Calcular totais
	const totalVendas = useMemo(() => {
		return resumo.reduce((sum, [, total]) => sum + total, 0)
	}, [resumo])

	const saldoFinal = (selectedCaixa?.valorInicial || 0) + totalVendas + totalSuprimentos - totalSangrias

	// Verificar permissão
	if (!hasPermission('caixa', 'fechamento')) {
		return (
			<div className="container" style={{ maxWidth: 800 }}>
				<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<h3 style={{ color: 'var(--danger)' }}>Acesso Negado</h3>
					<p>Você não tem permissão para acessar esta funcionalidade.</p>
				</div>
			</div>
		)
	}

	// Sem caixas permitidos para fechar
	if (caixasPermitidos.length === 0) {
		return (
			<div className="container" style={{ maxWidth: 800 }}>
				<h2>Fechamento de Caixa</h2>
				<div className="card">
					<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
						<div className="row center" style={{ gap: 8 }}>
							<span style={{ fontSize: '1.2rem' }}>⚠️</span>
							<div>
								<strong style={{ color: 'var(--danger)' }}>Nenhum caixa disponível</strong>
								<div className="subtitle">
									{caixasAbertos.length > 0
										? 'Não há caixa aberto que você pode fechar. Verifique os caixas associados ao seu usuário.'
										: 'Não há caixa aberto para fechar.'}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}

	async function fechar() {
		if (!selectedCaixa) return alert('Selecione um caixa para fechar')
		if (!confirm('Deseja realmente fechar o caixa?')) return
		
		try {
			setLoading(true)
			await caixasService.fechar(selectedCaixa.id)
			await refresh()
			// Disparar evento para atualizar outros componentes que usam useCaixa
			window.dispatchEvent(new Event('caixa:updated'))
			// Navegar para o comprovante de fechamento
			navigate(`/recibo/fechamento/${selectedCaixa.id}`)
		} catch (error) {
			console.error('Erro ao fechar caixa:', error)
			alert('Erro ao fechar caixa. Tente novamente.')
		} finally {
			setLoading(false)
		}
	}

	function imprimir() {
		window.print()
	}

	return (
		<div className="container" style={{ maxWidth: 800 }}>
			<h2>Fechamento de Caixa</h2>
			
			{!selectedCaixa ? (
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
							<div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
								{caixasPermitidos.length > 1 && (
									<label className="row center" style={{ gap: 8 }}>
										<span>Caixa:</span>
										<select
											className="input"
											value={selectedId}
											onChange={(e) => setSelectedId(e.target.value)}
											style={{ minWidth: 140 }}
										>
											{caixasPermitidos.map((c) => (
												<option key={c.id} value={c.id}>
													{c.nome}
												</option>
											))}
										</select>
									</label>
								)}
								{caixasPermitidos.length === 1 && (
									<span style={{ color: 'var(--muted)' }}>CAIXA: {selectedCaixa.nome}</span>
								)}
								<button className="btn" onClick={imprimir}>🖨️ Imprimir</button>
							</div>
						</div>
						
						<div className="grid-2" style={{ marginBottom: 16 }}>
							<div className="card">
								<h4>Informações do Caixa</h4>
								<div className="stack">
									<div><strong>Caixa:</strong> {selectedCaixa.nome}</div>
									<div><strong>Data de Abertura:</strong> {new Date(selectedCaixa.data).toLocaleDateString('pt-BR')}</div>
									<div><strong>Valor Inicial:</strong> R$ {selectedCaixa.valorInicial.toFixed(2)}</div>
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
							{selectedCaixa.movimentos && selectedCaixa.movimentos.filter(m => m.tipo === 'sangria').length > 0 ? (
								<div className="table-wrap">
									<table className="table">
										<thead>
											<tr><th>Hora</th><th>Valor</th><th>Motivo</th></tr>
										</thead>
										<tbody>
											{selectedCaixa.movimentos
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
							{selectedCaixa.movimentos && selectedCaixa.movimentos.filter(m => m.tipo === 'suprimento').length > 0 ? (
								<div className="table-wrap">
									<table className="table">
										<thead>
											<tr><th>Hora</th><th>Valor</th><th>Motivo</th></tr>
										</thead>
										<tbody>
											{selectedCaixa.movimentos
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
						<button className="btn" onClick={imprimir} disabled={loading}>🖨️ Imprimir Relatório</button>
						<button className="btn primary" onClick={fechar} disabled={loading}>
							{loading ? 'Fechando...' : '🔒 Fechar Caixa'}
						</button>
					</div>
				</>
			)}
		</div>
	)
}

