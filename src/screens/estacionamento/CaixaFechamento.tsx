import { useEffect, useMemo, useState } from 'react'
import { estacionamentosService, caixasService, lancamentosEstacionamentoService, formasPagamentoService } from '../../services/entitiesService'
import { PaymentIcon, resolvePaymentKind } from '../../ui/icons'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../../hooks/usePermissions'

export default function CaixaFechamento() {
	const [estacionamentos, setEstacionamentos] = useState<Awaited<ReturnType<typeof estacionamentosService.list>>>([])
	const [caixas, setCaixas] = useState<Awaited<ReturnType<typeof caixasService.list>>>([])
	const [lancamentos, setLancamentos] = useState<Awaited<ReturnType<typeof lancamentosEstacionamentoService.list>>>([])
	const [formasPagamento, setFormasPagamento] = useState<Awaited<ReturnType<typeof formasPagamentoService.list>>>([])
	const [estacionamentoSelecionado, setEstacionamentoSelecionado] = useState<string>('')
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const navigate = useNavigate()
	const { hasPermission } = usePermissions()

	useEffect(() => {
		async function load() {
			try {
				setLoading(true)
				setError(null)
				const [estData, caixasData, lancData, formasData] = await Promise.all([
					estacionamentosService.list(),
					caixasService.list(),
					lancamentosEstacionamentoService.list(),
					formasPagamentoService.list(),
				])
				setEstacionamentos(estData ?? [])
				setCaixas(caixasData ?? [])
				setLancamentos(lancData ?? [])
				setFormasPagamento(formasData ?? [])
			} catch (e) {
				console.error('Erro ao carregar fechamento:', e)
				setError('Erro ao carregar dados. Tente novamente.')
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [])

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

	const estacionamento = estacionamentos.find(e => e.id === estacionamentoSelecionado)
	
	const caixaEstacionamento = estacionamento
		? caixas.find(c => c.id === estacionamento.caixaId)
		: null

	const caixaAberto = caixaEstacionamento?.status === 'aberto'

	// Resumo por forma de pagamento usando lançamentos pagos do dia
	const resumo = useMemo(() => {
		if (!caixaEstacionamento || !estacionamento) return []
		
		const dataCaixa = new Date(caixaEstacionamento.data).toDateString()
		const pagos = lancamentos.filter((l) => {
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
	}, [lancamentos, caixaEstacionamento, estacionamento])

	const formasMap = new Map(formasPagamento.map(f => [f.id, f.descricao]))

	// Calcular totais de sangrias e suprimentos
	const totalSangrias = useMemo(() => {
		if (!caixaEstacionamento?.movimentos) return 0
		return caixaEstacionamento.movimentos
			.filter(m => m.tipo === 'sangria')
			.reduce((sum, m) => sum + m.valor, 0)
	}, [caixaEstacionamento])

	const totalSuprimentos = useMemo(() => {
		if (!caixaEstacionamento?.movimentos) return 0
		return caixaEstacionamento.movimentos
			.filter(m => m.tipo === 'suprimento')
			.reduce((sum, m) => sum + m.valor, 0)
	}, [caixaEstacionamento])

	const totalVendas = resumo.reduce((sum, [, total]) => sum + total, 0)

	const saldoFinal = (caixaEstacionamento?.valorInicial || 0) + totalVendas + totalSuprimentos - totalSangrias

	async function fechar() {
		if (!estacionamentoSelecionado) {
			return alert('Selecione um estacionamento')
		}
		if (!caixaEstacionamento || !caixaAberto) {
			return alert('Não há caixa aberto para fechar')
		}
		if (!confirm('Deseja realmente fechar o caixa?')) return
		
		try {
			setSaving(true)
			setError(null)
			const caixaId = caixaEstacionamento.id
			await caixasService.fechar(caixaId)
			alert('Caixa fechado com sucesso!')
			navigate(`/recibo/estacionamento/fechamento/${caixaId}`)
		} catch (e) {
			console.error('Erro ao fechar caixa:', e)
			setError('Erro ao fechar caixa. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	function imprimir() {
		window.print()
	}

	if (loading) {
		return (
			<div className="container" style={{ maxWidth: 800 }}>
				<h2>Fechamento de Caixa - Estacionamento</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	if (error && !estacionamentoSelecionado) {
		return (
			<div className="container" style={{ maxWidth: 800 }}>
				<h2>Fechamento de Caixa - Estacionamento</h2>
				<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<p style={{ color: 'var(--danger)' }}>{error}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 800 }}>
			<h2>Fechamento de Caixa - Estacionamento</h2>
			{error && (
				<div className="card" style={{ marginBottom: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<p style={{ color: 'var(--danger)' }}>{error}</p>
				</div>
			)}
			
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
										{resumo.map(([formaId, total]) => (
											<tr key={formaId}>
												<td>
													<span className="row center">
														<PaymentIcon kind={resolvePaymentKind(formasMap.get(formaId) || formaId)} /> 
														<span>{formasMap.get(formaId) || formaId}</span>
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
						<button className="btn primary" onClick={fechar} disabled={saving}>
							{saving ? 'Fechando...' : '🔒 Fechar Caixa'}
						</button>
					</div>
				</>
			)}
		</div>
	)
}
