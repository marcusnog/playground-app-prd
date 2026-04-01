import { useState, useEffect, useMemo } from 'react'
import { useCaixa } from '../../hooks/useCaixa'
import { caixasService, lancamentosService, formasPagamentoService, brinquedosService, parametrosService } from '../../services/entitiesService'
import { imprimirRecibo } from '../../utils/printUtils'
import { PaymentIcon, resolvePaymentKind } from '../../ui/icons'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '../../hooks/usePermissions'

export default function Fechamento() {
	const { caixas, refresh } = useCaixa()
	const navigate = useNavigate()
	const { hasPermission, canUseCaixa, user } = usePermissions()
	const [loading, setLoading] = useState(false)
	const [params, setParams] = useState<{ empresaNome?: string; empresaCnpj?: string } | null>(null)
	const [lancamentos, setLancamentos] = useState<any[]>([])
	const [formasPagamento, setFormasPagamento] = useState<any[]>([])
	const [brinquedos, setBrinquedos] = useState<any[]>([])

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
		parametrosService.get().then(p => setParams(p))
	}, [])
	useEffect(() => {
		async function loadData() {
			if (!selectedCaixa) return
			try {
				setLoading(true)
				const [lancs, formas, brinqs] = await Promise.all([
					lancamentosService.list(),
					formasPagamentoService.list(),
					brinquedosService.list()
				])
				setLancamentos(lancs)
				setFormasPagamento(formas)
				setBrinquedos(Array.isArray(brinqs) ? brinqs : [])
			} catch (error) {
				console.error('Erro ao carregar dados:', error)
			} finally {
				setLoading(false)
			}
		}
		loadData()
	}, [selectedCaixa])

	// Retorna "YYYY-MM-DD" da data do caixa interpretada como horário local
	function dataCaixaLocal(dataCaixa: string): string {
		// "2026-04-01" sem hora é parseado como UTC pelo JS — forçar local adicionando T00:00:00
		const d = new Date(dataCaixa.length === 10 ? dataCaixa + 'T00:00:00' : dataCaixa)
		return d.toLocaleDateString('sv') // 'sv' retorna YYYY-MM-DD no horário local
	}

	// Resumo por forma de pagamento usando lancamentos pagos do dia
	const resumo = useMemo(() => {
		if (!selectedCaixa) return []

		const dataCaixa = dataCaixaLocal(selectedCaixa.data)
		const pagos = lancamentos.filter((l) => {
			if (l.status !== 'pago') return false
			return new Date(l.dataHora).toLocaleDateString('sv') === dataCaixa
		})

		const map = new Map<string, { nome: string, total: number }>()
		for (const l of pagos) {
			// Pagamento dividido: distribuir cada forma pelo valor real do pagamentosJson
			if (l.pagamentosJson) {
				try {
					const splits = JSON.parse(l.pagamentosJson) as Array<{ formaPagamentoId: string; descricao: string; valor: number }>
					for (const s of splits) {
						const nome = s.descricao || formasPagamento.find(f => f.id === s.formaPagamentoId)?.descricao || 'Desconhecido'
						const atual = map.get(s.formaPagamentoId) || { nome, total: 0 }
						map.set(s.formaPagamentoId, { nome: atual.nome, total: atual.total + s.valor })
					}
					continue
				} catch { /* fallback abaixo */ }
			}
			const formaId = l.formaPagamentoId as string | undefined
			if (!formaId) continue
			const forma = formasPagamento.find(f => f.id === formaId)
			const nomeForma = forma?.descricao || 'Desconhecido'
			const atual = map.get(formaId) || { nome: nomeForma, total: 0 }
			map.set(formaId, { nome: atual.nome, total: atual.total + l.valorCalculado })
		}
		return Array.from(map.values()).map(v => [v.nome, v.total] as [string, number])
	}, [selectedCaixa, lancamentos, formasPagamento])

	// Cortesias do dia (lançamentos pagos cuja forma de pagamento contém "cortesia")
	const cortesiasDia = useMemo(() => {
		if (!selectedCaixa) return []
		const dataCaixa = dataCaixaLocal(selectedCaixa.data)
		const isCortesia = (formaPagamentoId?: string) => {
			if (!formaPagamentoId) return false
			const forma = formasPagamento.find((f) => f.id === formaPagamentoId)
			return String(forma?.descricao || '').toLowerCase().includes('cortesia')
		}

		const pagosCortesia = lancamentos.filter((l) => {
			if (l.status !== 'pago') return false
			if (new Date(l.dataHora).toLocaleDateString('sv') !== dataCaixa) return false
			return isCortesia(l.formaPagamentoId)
		})

		return pagosCortesia
			.map((l) => {
				const brinqId = l.brinquedoId as string | undefined
				const brinq = brinquedos.find((b) => b.id === brinqId)
				const brinquedoNome = brinq?.nome || (brinqId ? 'Brinquedo removido' : 'Sem brinquedo')
				const quantidade = (l.quantidade as number | undefined) ?? 1
				const dataHoraUtilizada = (l.updatedAt as string | undefined) || l.dataHora
				return { id: l.id as string, brinquedoNome, quantidade, dataHoraUtilizada }
			})
			.sort((a, b) => new Date(a.dataHoraUtilizada).getTime() - new Date(b.dataHoraUtilizada).getTime())
	}, [selectedCaixa, lancamentos, formasPagamento, brinquedos])

	// Resumo por brinquedo usando lancamentos pagos do dia
	const resumoBrinquedos = useMemo(() => {
		if (!selectedCaixa) return []
		const dataCaixa = dataCaixaLocal(selectedCaixa.data)
		const pagos = lancamentos.filter((l) => {
			if (l.status !== 'pago') return false
			return new Date(l.dataHora).toLocaleDateString('sv') === dataCaixa
		})
		const map = new Map<string, { nome: string; total: number }>()
		for (const l of pagos) {
			const brinqId = l.brinquedoId as string | undefined
			const brinq = brinquedos.find((b) => b.id === brinqId)
			const nomeBrinq = brinq?.nome || (brinqId ? 'Brinquedo removido' : 'Sem brinquedo')
			const key = brinqId || '__sem_brinquedo__'
			const atual = map.get(key) || { nome: nomeBrinq, total: 0 }
			map.set(key, { nome: atual.nome, total: atual.total + (l.valorCalculado || 0) })
		}
		return Array.from(map.values())
			.sort((a, b) => b.total - a.total)
			.map((v) => [v.nome, v.total] as [string, number])
	}, [selectedCaixa, lancamentos, brinquedos])

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

	const sangriasList = useMemo(() => {
		if (!selectedCaixa?.movimentos) return []
		return selectedCaixa.movimentos
			.filter((m: { tipo: string }) => m.tipo === 'sangria')
			.sort((a: { dataHora: string }, b: { dataHora: string }) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())
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
		if (!selectedCaixa) return
		const p = params || {}
		const dataAberturaStr = selectedCaixa.data ? new Date(selectedCaixa.data).toLocaleString('pt-BR') : '-'
		const html = `
			<h3>${p.empresaNome || 'Comprovante'}</h3>
			${p.empresaCnpj ? `<div style="text-align:center;margin-bottom:8px">CNPJ: ${p.empresaCnpj}</div>` : ''}
			<div>Comprovante de Fechamento de Caixa</div>
			<div>Caixa: ${selectedCaixa.nome}</div>
			<div>Data/Hora Abertura: ${dataAberturaStr}</div>
			<div>Data/Hora Fechamento: -</div>
			<div>Valor Inicial: R$ ${selectedCaixa.valorInicial.toFixed(2)}</div>
			<hr />
			<div>Total de Vendas: R$ ${totalVendas.toFixed(2)}</div>
			${resumo.map(([forma, total]) => `<div>${forma}: R$ ${total.toFixed(2)}</div>`).join('')}
			<div>Sangrias: - R$ ${totalSangrias.toFixed(2)}</div>
			${sangriasList.map((m: { id: string; dataHora: string; valor: number; motivo?: string }) =>
				`<div>${new Date(m.dataHora).toLocaleString('pt-BR')} - ${m.motivo || '-'}: - R$ ${m.valor.toFixed(2)}</div>`
			).join('')}
			<div>Suprimentos: + R$ ${totalSuprimentos.toFixed(2)}</div>
			<hr />
			<div><strong>SALDO FINAL: R$ ${saldoFinal.toFixed(2)}</strong></div>
			<hr />
			<div>Comprovante de fechamento de caixa gerado automaticamente.</div>
		`
		imprimirRecibo(html)
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

					{/* Cortesias */}
					<div className="card" style={{ marginBottom: 16 }}>
						<h3>Cortesia</h3>
						<div className="subtitle" style={{ marginBottom: 8 }}>
							Caixa: {selectedCaixa.nome}
						</div>
						{cortesiasDia.length > 0 ? (
							<div className="table-wrap">
								<table className="table">
									<thead>
										<tr>
											<th>Brinquedo</th>
											<th>Quantidade</th>
											<th>Data/Hora utilizada</th>
										</tr>
									</thead>
									<tbody>
										{cortesiasDia.map((c) => (
											<tr key={c.id}>
												<td>{c.brinquedoNome}</td>
												<td>{c.quantidade}</td>
												<td>{new Date(c.dataHoraUtilizada).toLocaleString('pt-BR')}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="empty">Nenhuma cortesia utilizada hoje</div>
						)}
					</div>

					{/* Vendas por Brinquedos */}
					<div className="card" style={{ marginBottom: 16 }}>
						<h3>Vendas por Brinquedos</h3>
						{resumoBrinquedos.length > 0 ? (
							<div className="table-wrap">
								<table className="table">
									<thead>
										<tr><th>Brinquedo</th><th>Total (R$)</th></tr>
									</thead>
									<tbody>
										{resumoBrinquedos.map(([nome, total], i) => (
											<tr key={`${nome}-${i}`}>
												<td>{nome}</td>
												<td>R$ {total.toFixed(2)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className="empty">Nenhuma venda por brinquedo hoje</div>
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

