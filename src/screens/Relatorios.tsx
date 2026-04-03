import { useEffect, useMemo, useState } from 'react'
import { lancamentosService, caixasService, brinquedosService } from '../services/entitiesService'
import type { Lancamento, Caixa, Brinquedo } from '../services/entitiesService'
import { 
	LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
	XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export default function Relatorios() {
	const [draftDataInicio, setDraftDataInicio] = useState('')
	const [draftDataFim, setDraftDataFim] = useState('')
	const [draftStatus, setDraftStatus] = useState<'todos' | 'aberto' | 'pago' | 'cancelado'>('todos')
	const [filtroDataInicio, setFiltroDataInicio] = useState('')
	const [filtroDataFim, setFiltroDataFim] = useState('')
	const [filtroStatus, setFiltroStatus] = useState<'todos' | 'aberto' | 'pago' | 'cancelado'>('todos')
	const [tipoRelatorio, setTipoRelatorio] = useState<'vendas' | 'caixa' | 'clientes'>('vendas')

	const aplicarFiltros = () => {
		setFiltroDataInicio(draftDataInicio)
		setFiltroDataFim(draftDataFim)
		setFiltroStatus(draftStatus)
	}

	const limparFiltros = () => {
		setDraftDataInicio('')
		setDraftDataFim('')
		setDraftStatus('todos')
		setFiltroDataInicio('')
		setFiltroDataFim('')
		setFiltroStatus('todos')
	}

	const temFiltrosAplicados = filtroDataInicio || filtroDataFim || filtroStatus !== 'todos'

	const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
	const [caixas, setCaixas] = useState<Caixa[]>([])
	const [brinquedos, setBrinquedos] = useState<Brinquedo[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		async function loadData() {
			try {
				setLoading(true)
				setError(null)
				const [lancamentosData, caixasData, brinquedosData] = await Promise.all([
					lancamentosService.list(),
					caixasService.list(),
					brinquedosService.list(),
				])
				setLancamentos(lancamentosData ?? [])
				setCaixas(caixasData ?? [])
				setBrinquedos(brinquedosData ?? [])
			} catch (err) {
				console.error('Erro ao carregar dados para relatórios:', err)
				setError('Erro ao carregar dados. Tente novamente.')
			} finally {
				setLoading(false)
			}
		}
		loadData()
	}, [])

	// Filtrar lançamentos
	const lancamentosFiltrados = useMemo(() => {
		let filtrados = lancamentos

		// Filtro por data
		if (filtroDataInicio) {
			filtrados = filtrados.filter(l => new Date(l.dataHora) >= new Date(filtroDataInicio))
		}
		if (filtroDataFim) {
			filtrados = filtrados.filter(l => new Date(l.dataHora) <= new Date(filtroDataFim + 'T23:59:59'))
		}

		// Filtro por status
		if (filtroStatus !== 'todos') {
			filtrados = filtrados.filter(l => l.status === filtroStatus)
		}

		return filtrados
	}, [lancamentos, filtroDataInicio, filtroDataFim, filtroStatus])

	// Relatório de Vendas
	const relatorioVendas = useMemo(() => {
		const vendas = lancamentosFiltrados.filter(l => l.status === 'pago')
		
		const totalVendas = vendas.reduce((sum, l) => sum + l.valorCalculado, 0)
		const totalLancamentos = lancamentosFiltrados.length
		const totalPagos = vendas.length
		const totalCancelados = lancamentosFiltrados.filter(l => l.status === 'cancelado').length
		const totalAbertos = lancamentosFiltrados.filter(l => l.status === 'aberto').length

		// Vendas por forma de pagamento
		const vendasPorForma = new Map<string, number>()
		vendas.forEach(l => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const forma = (l as any).formaPagamentoId as string | undefined
			if (forma) {
				vendasPorForma.set(forma, (vendasPorForma.get(forma) || 0) + l.valorCalculado)
			}
		})

		// Vendas por brinquedo
		const vendasPorBrinquedo = new Map<string, number>()
		vendas.forEach(l => {
			if (l.brinquedoId) {
				const brinquedo = brinquedos.find(b => b.id === l.brinquedoId)
				const nome = brinquedo?.nome || 'Não especificado'
				vendasPorBrinquedo.set(nome, (vendasPorBrinquedo.get(nome) || 0) + l.valorCalculado)
			}
		})

		const cancelados = lancamentosFiltrados
			.filter(l => l.status === 'cancelado')
			.map(l => ({
				id: l.id,
				nomeCrianca: l.nomeCrianca,
				nomeResponsavel: l.nomeResponsavel,
				brinquedo: l.brinquedoId ? (brinquedos.find(b => b.id === l.brinquedoId)?.nome ?? 'Brinquedo removido') : '-',
				dataHora: l.dataHora,
			}))

		return {
			totalVendas,
			totalLancamentos,
			totalPagos,
			totalCancelados,
			totalAbertos,
			cancelados,
			vendasPorForma: Array.from(vendasPorForma.entries()),
			vendasPorBrinquedo: Array.from(vendasPorBrinquedo.entries())
		}
	}, [lancamentosFiltrados, brinquedos])

	// Relatório de Caixa
	const relatorioCaixa = useMemo(() => {
		const caixasFiltrados = caixas.filter(c => {
			if (filtroDataInicio && new Date(c.data) < new Date(filtroDataInicio)) return false
			if (filtroDataFim && new Date(c.data) > new Date(filtroDataFim + 'T23:59:59')) return false
			return true
		})

		const caixasAbertos = caixasFiltrados.filter(c => c.status === 'aberto')
		const caixasFechados = caixasFiltrados.filter(c => c.status === 'fechado')
		const totalValorInicial = caixasFiltrados.reduce((sum, c) => sum + c.valorInicial, 0)

		return {
			totalCaixas: caixasFiltrados.length,
			caixasAbertos: caixasAbertos.length,
			caixasFechados: caixasFechados.length,
			totalValorInicial
		}
	}, [caixas, filtroDataInicio, filtroDataFim])

	// Relatório de Clientes
	const relatorioClientes = useMemo(() => {
		const clientes = new Map<string, { nome: string; total: number; lancamentos: number }>()
		
		lancamentosFiltrados.forEach(l => {
			const key = l.whatsappResponsavel || l.nomeResponsavel
			if (clientes.has(key)) {
				const cliente = clientes.get(key)!
				cliente.total += l.valorCalculado
				cliente.lancamentos += 1
			} else {
				clientes.set(key, {
					nome: l.nomeResponsavel,
					total: l.valorCalculado,
					lancamentos: 1
				})
			}
		})

		const clientesArray = Array.from(clientes.values()).sort((a, b) => b.total - a.total)
		const totalClientes = clientesArray.length
		const totalFaturamento = clientesArray.reduce((sum, c) => sum + c.total, 0)

		return {
			totalClientes,
			totalFaturamento,
			topClientes: clientesArray.slice(0, 10)
		}
	}, [lancamentosFiltrados])

	// Dados para gráficos
	const dadosGraficos = useMemo(() => {
		// Vendas por dia (últimos 30 dias)
		const vendasPorDia = new Map<string, number>()
		const lancamentosPagos = lancamentosFiltrados.filter(l => l.status === 'pago')
		
		lancamentosPagos.forEach(l => {
			const data = new Date(l.dataHora).toISOString().split('T')[0]
			vendasPorDia.set(data, (vendasPorDia.get(data) || 0) + l.valorCalculado)
		})

		// Gerar array dos últimos 30 dias
		const ultimos30Dias = []
		for (let i = 29; i >= 0; i--) {
			const data = new Date()
			data.setDate(data.getDate() - i)
			const dataStr = data.toISOString().split('T')[0]
			ultimos30Dias.push({
				data: dataStr,
				vendas: vendasPorDia.get(dataStr) || 0,
				formatada: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
			})
		}

		// Dados para gráfico de pizza (formas de pagamento)
		const dadosPizza = relatorioVendas.vendasPorForma.map(([forma, total]) => ({
			name: forma,
			value: total,
			color: forma === 'dinheiro' ? '#10b981' : forma === 'pix' ? '#3b82f6' : '#f59e0b'
		}))

		// Dados para gráfico de barras (brinquedos)
		const dadosBarras = relatorioVendas.vendasPorBrinquedo.map(([brinquedo, total]) => ({
			brinquedo: brinquedo.length > 15 ? brinquedo.substring(0, 15) + '...' : brinquedo,
			vendas: total
		}))

		// Dados para gráfico de clientes
		const dadosClientes = relatorioClientes.topClientes.slice(0, 5).map((cliente) => ({
			cliente: cliente.nome.length > 10 ? cliente.nome.substring(0, 10) + '...' : cliente.nome,
			total: cliente.total,
			lancamentos: cliente.lancamentos
		}))

		return {
			vendasPorDia: ultimos30Dias,
			formasPagamento: dadosPizza,
			brinquedos: dadosBarras,
			clientes: dadosClientes
		}
	}, [lancamentosFiltrados, relatorioVendas, relatorioClientes])

	const periodoLabel = filtroDataInicio || filtroDataFim
		? `${filtroDataInicio || '...'} a ${filtroDataFim || '...'}`
		: 'Todos'

	const exportarPDF = () => {
		const doc = new jsPDF()
		doc.setFontSize(16)
		doc.text('Relatório', 14, 20)
		doc.setFontSize(10)
		doc.text(`Período: ${periodoLabel}`, 14, 28)
		let y = 38

		if (tipoRelatorio === 'vendas') {
			doc.setFontSize(12)
			doc.text('Resumo de Vendas', 14, y)
			y += 8
			doc.setFontSize(10)
			doc.text(`Total Lançamentos: ${relatorioVendas.totalLancamentos} | Pago: ${relatorioVendas.totalPagos} | Cancelado: ${relatorioVendas.totalCancelados} | Aberto: ${relatorioVendas.totalAbertos}`, 14, y)
			y += 6
			doc.text(`Faturamento Total: R$ ${relatorioVendas.totalVendas.toFixed(2)}`, 14, y)
			y += 12

			if (relatorioVendas.vendasPorForma.length > 0) {
				autoTable(doc, {
					startY: y,
					head: [['Forma de Pagamento', 'Total (R$)']],
					body: relatorioVendas.vendasPorForma.map(([forma, total]) => [forma, total.toFixed(2)]),
				})
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				y = (doc as any).lastAutoTable.finalY + 10
			}
			if (relatorioVendas.vendasPorBrinquedo.length > 0) {
				autoTable(doc, {
					startY: y,
					head: [['Brinquedo', 'Total (R$)']],
					body: relatorioVendas.vendasPorBrinquedo.map(([b, total]) => [b, total.toFixed(2)]),
				})
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				y = (doc as any).lastAutoTable.finalY + 10
			}
			if (relatorioVendas.cancelados.length > 0) {
				doc.setFontSize(12)
				doc.text('Lançamentos Cancelados', 14, y)
				y += 6
				autoTable(doc, {
					startY: y,
					head: [['Criança', 'Responsável', 'Brinquedo', 'Data/Hora']],
					body: relatorioVendas.cancelados.map(c => [
						c.nomeCrianca,
						c.nomeResponsavel,
						c.brinquedo,
						new Date(c.dataHora).toLocaleString('pt-BR'),
					]),
				})
			}
		} else if (tipoRelatorio === 'caixa') {
			doc.setFontSize(12)
			doc.text('Resumo de Caixa', 14, y)
			y += 8
			doc.setFontSize(10)
			doc.text(`Total Caixas: ${relatorioCaixa.totalCaixas} | Abertos: ${relatorioCaixa.caixasAbertos} | Fechados: ${relatorioCaixa.caixasFechados}`, 14, y)
			y += 6
			doc.text(`Valor Inicial Total: R$ ${relatorioCaixa.totalValorInicial.toFixed(2)}`, 14, y)
		} else {
			doc.setFontSize(12)
			doc.text('Resumo de Clientes', 14, y)
			y += 8
			doc.setFontSize(10)
			doc.text(`Total Clientes: ${relatorioClientes.totalClientes} | Faturamento: R$ ${relatorioClientes.totalFaturamento.toFixed(2)}`, 14, y)
			y += 12
			if (relatorioClientes.topClientes.length > 0) {
				autoTable(doc, {
					startY: y,
					head: [['Cliente', 'Lançamentos', 'Total (R$)']],
					body: relatorioClientes.topClientes.map(c => [c.nome, String(c.lancamentos), c.total.toFixed(2)]),
				})
			}
		}

		doc.save(`relatorio_${tipoRelatorio}_${new Date().toISOString().split('T')[0]}.pdf`)
	}

	const exportarXLSX = () => {
		const wb = XLSX.utils.book_new()

		const wsVendas = XLSX.utils.aoa_to_sheet([
			['Relatório de Vendas', ''],
			['Período', periodoLabel],
			[],
			['Resumo', ''],
			['Total Lançamentos', relatorioVendas.totalLancamentos],
			['Total Pago', relatorioVendas.totalPagos],
			['Total Cancelado', relatorioVendas.totalCancelados],
			['Total Aberto', relatorioVendas.totalAbertos],
			['Faturamento Total', relatorioVendas.totalVendas.toFixed(2)],
			[],
			['Forma de Pagamento', 'Total'],
			...relatorioVendas.vendasPorForma.map(([f, t]) => [f, t]),
			[],
			['Brinquedo', 'Total'],
			...relatorioVendas.vendasPorBrinquedo.map(([b, t]) => [b, t]),
		])
		XLSX.utils.book_append_sheet(wb, wsVendas, 'Vendas')

		if (relatorioVendas.cancelados.length > 0) {
			const wsCancelados = XLSX.utils.aoa_to_sheet([
				['Lançamentos Cancelados', ''],
				['Período', periodoLabel],
				[],
				['Criança', 'Responsável', 'Brinquedo', 'Data/Hora'],
				...relatorioVendas.cancelados.map(c => [
					c.nomeCrianca,
					c.nomeResponsavel,
					c.brinquedo,
					new Date(c.dataHora).toLocaleString('pt-BR'),
				]),
			])
			XLSX.utils.book_append_sheet(wb, wsCancelados, 'Cancelados')
		}

		const wsCaixa = XLSX.utils.aoa_to_sheet([
			['Relatório de Caixa', ''],
			['Período', periodoLabel],
			[],
			['Total Caixas', relatorioCaixa.totalCaixas],
			['Caixas Abertos', relatorioCaixa.caixasAbertos],
			['Caixas Fechados', relatorioCaixa.caixasFechados],
			['Valor Inicial Total', relatorioCaixa.totalValorInicial.toFixed(2)],
		])
		XLSX.utils.book_append_sheet(wb, wsCaixa, 'Caixa')

		const wsClientes = XLSX.utils.aoa_to_sheet([
			['Relatório de Clientes', ''],
			['Período', periodoLabel],
			[],
			['Total Clientes', relatorioClientes.totalClientes],
			['Faturamento Total', relatorioClientes.totalFaturamento.toFixed(2)],
			[],
			['Cliente', 'Lançamentos', 'Total'],
			...relatorioClientes.topClientes.map(c => [c.nome, c.lancamentos, c.total.toFixed(2)]),
		])
		XLSX.utils.book_append_sheet(wb, wsClientes, 'Clientes')

		XLSX.writeFile(wb, `relatorio_${new Date().toISOString().split('T')[0]}.xlsx`)
	}

	if (loading) {
		return (
			<div className="container">
				<h2>Relatórios</h2>
				<div className="card">
					<div>Carregando dados...</div>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="container">
				<h2>Relatórios</h2>
				<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<p style={{ color: 'var(--danger)' }}>{error}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="container">
			<h2>Relatórios</h2>
			
			{/* Filtros */}
			<div className="card" style={{ marginBottom: 16 }}>
				<div className="title" style={{ marginBottom: 12 }}>
					<h3>Filtros</h3>
					{temFiltrosAplicados && (
						<span className="badge on">Filtros aplicados</span>
					)}
				</div>
				<div className="form three">
					<label className="field">
						<span>Data Início</span>
						<input 
							type="date" 
							className="input" 
							value={draftDataInicio} 
							onChange={(e) => setDraftDataInicio(e.target.value)} 
						/>
					</label>
					<label className="field">
						<span>Data Fim</span>
						<input 
							type="date" 
							className="input" 
							value={draftDataFim} 
							onChange={(e) => setDraftDataFim(e.target.value)} 
						/>
					</label>
					<label className="field">
						<span>Status</span>
						<select 
							className="select" 
							value={draftStatus} 
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							onChange={(e) => setDraftStatus(e.target.value as any)}
						>
							<option value="todos">Todos</option>
							<option value="aberto">Aberto</option>
							<option value="pago">Pago</option>
							<option value="cancelado">Cancelado</option>
						</select>
					</label>
				</div>
				<div className="row" style={{ marginTop: 12, gap: 8 }}>
					<button className="btn primary" onClick={aplicarFiltros}>
						🔍 Aplicar filtros
					</button>
					<button className="btn" onClick={limparFiltros}>
						Limpar
					</button>
				</div>
			</div>

			{/* Tipo de Relatório */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>Tipo de Relatório</h3>
				<div className="row" style={{ gap: 12 }}>
					<button 
						className={`btn ${tipoRelatorio === 'vendas' ? 'primary' : ''}`}
						onClick={() => setTipoRelatorio('vendas')}
					>
						💰 Vendas
					</button>
					<button 
						className={`btn ${tipoRelatorio === 'caixa' ? 'primary' : ''}`}
						onClick={() => setTipoRelatorio('caixa')}
					>
						📊 Caixa
					</button>
					<button 
						className={`btn ${tipoRelatorio === 'clientes' ? 'primary' : ''}`}
						onClick={() => setTipoRelatorio('clientes')}
					>
						👥 Clientes
					</button>
				</div>
			</div>

			{/* Relatório de Vendas */}
			{tipoRelatorio === 'vendas' && (
				<div className="card">
					<div className="title">
						<h3>Relatório de Vendas</h3>
						<div className="row" style={{ gap: 8 }}>
							<button className="btn primary" onClick={exportarPDF}>
								📄 PDF
							</button>
							<button className="btn primary" onClick={exportarXLSX}>
								📊 Excel
							</button>
						</div>
					</div>
					
					{/* Dashboard com Gráficos */}
					<div className="dashboard-grid" style={{ marginBottom: 24 }}>
						{/* Gráfico de Vendas por Dia */}
						<div className="card">
							<h4>Vendas dos Últimos 30 Dias</h4>
							<div style={{ height: 300 }}>
								<ResponsiveContainer width="100%" height="100%">
									<AreaChart data={dadosGraficos.vendasPorDia}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="formatada" />
										<YAxis />
										<Tooltip formatter={(value: number | string) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']} />
										<Area type="monotone" dataKey="vendas" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
									</AreaChart>
								</ResponsiveContainer>
							</div>
						</div>

						{/* Gráfico de Pizza - Formas de Pagamento */}
						<div className="card">
							<h4>Vendas por Forma de Pagamento</h4>
							<div style={{ height: 300 }}>
								<ResponsiveContainer width="100%" height="100%">
									<PieChart>
										<Pie
											data={dadosGraficos.formasPagamento}
											cx="50%"
											cy="50%"
											labelLine={false}
											// eslint-disable-next-line @typescript-eslint/no-explicit-any
									label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
											outerRadius={80}
											fill="#8884d8"
											dataKey="value"
										>
											{dadosGraficos.formasPagamento.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color} />
											))}
										</Pie>
										<Tooltip formatter={(value: number | string) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']} />
									</PieChart>
								</ResponsiveContainer>
							</div>
						</div>

						{/* Gráfico de Barras - Brinquedos */}
						{dadosGraficos.brinquedos.length > 0 && (
							<div className="card">
								<h4>Vendas por Brinquedo</h4>
								<div style={{ height: 300 }}>
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={dadosGraficos.brinquedos} layout="horizontal">
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis type="number" />
											<YAxis dataKey="brinquedo" type="category" width={100} />
											<Tooltip formatter={(value: number | string) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']} />
											<Bar dataKey="vendas" fill="#3b82f6" />
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>
						)}
					</div>

					{/* Resumos em Cards */}
					<div className="grid-2" style={{ marginBottom: 16 }}>
						<div className="card">
							<h4>Resumo Geral</h4>
							<div className="stack">
								<div><strong>Total de Lançamentos:</strong> {relatorioVendas.totalLancamentos}</div>
								<div><strong>Total Pago:</strong> {relatorioVendas.totalPagos}</div>
								<div><strong>Total Cancelado:</strong> {relatorioVendas.totalCancelados}</div>
								<div><strong>Total Aberto:</strong> {relatorioVendas.totalAbertos}</div>
								<div><strong>Faturamento Total:</strong> R$ {relatorioVendas.totalVendas.toFixed(2)}</div>
							</div>
						</div>
						
						<div className="card">
							<h4>Vendas por Forma de Pagamento</h4>
							{relatorioVendas.vendasPorForma.length > 0 ? (
								<table className="table">
									<thead>
										<tr><th>Forma</th><th>Total</th></tr>
									</thead>
									<tbody>
										{relatorioVendas.vendasPorForma.map(([forma, total]) => (
											<tr key={forma}>
												<td>{forma}</td>
												<td>R$ {total.toFixed(2)}</td>
											</tr>
										))}
									</tbody>
								</table>
							) : (
								<div className="empty">
									Nenhuma venda encontrada. O relatório considera apenas lançamentos com status &quot;Pago&quot;.
									{temFiltrosAplicados && ' Verifique se há dados no período e status selecionados.'}
								</div>
							)}
						</div>
					</div>

					{relatorioVendas.vendasPorBrinquedo.length > 0 && (
						<div className="card">
							<h4>Vendas por Brinquedo</h4>
							<table className="table">
								<thead>
									<tr><th>Brinquedo</th><th>Total</th></tr>
								</thead>
								<tbody>
									{relatorioVendas.vendasPorBrinquedo.map(([brinquedo, total]) => (
										<tr key={brinquedo}>
											<td>{brinquedo}</td>
											<td>R$ {total.toFixed(2)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{relatorioVendas.cancelados.length > 0 && (
						<div className="card">
							<h4>Lançamentos Cancelados ({relatorioVendas.totalCancelados})</h4>
							<div className="table-wrap">
								<table className="table">
									<thead>
										<tr><th>Criança</th><th>Responsável</th><th>Brinquedo</th><th>Data/Hora</th></tr>
									</thead>
									<tbody>
										{relatorioVendas.cancelados.map(c => (
											<tr key={c.id}>
												<td>{c.nomeCrianca}</td>
												<td>{c.nomeResponsavel}</td>
												<td>{c.brinquedo}</td>
												<td>{new Date(c.dataHora).toLocaleString('pt-BR')}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Relatório de Caixa */}
			{tipoRelatorio === 'caixa' && (
				<div className="card">
					<div className="title">
						<h3>Relatório de Caixa</h3>
						<div className="row" style={{ gap: 8 }}>
							<button className="btn primary" onClick={exportarPDF}>
								📄 PDF
							</button>
							<button className="btn primary" onClick={exportarXLSX}>
								📊 Excel
							</button>
						</div>
					</div>
					
					<div className="grid-2">
						<div className="card">
							<h4>Resumo de Caixas</h4>
							<div className="stack">
								<div><strong>Total de Caixas:</strong> {relatorioCaixa.totalCaixas}</div>
								<div><strong>Caixas Abertos:</strong> {relatorioCaixa.caixasAbertos}</div>
								<div><strong>Caixas Fechados:</strong> {relatorioCaixa.caixasFechados}</div>
								<div><strong>Valor Inicial Total:</strong> R$ {relatorioCaixa.totalValorInicial.toFixed(2)}</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Relatório de Clientes */}
			{tipoRelatorio === 'clientes' && (
				<div className="card">
					<div className="title">
						<h3>Relatório de Clientes</h3>
						<div className="row" style={{ gap: 8 }}>
							<button className="btn primary" onClick={exportarPDF}>
								📄 PDF
							</button>
							<button className="btn primary" onClick={exportarXLSX}>
								📊 Excel
							</button>
						</div>
					</div>
					
					{/* Dashboard com Gráficos de Clientes */}
					<div className="dashboard-grid" style={{ marginBottom: 24 }}>
						{/* Gráfico de Barras - Top 5 Clientes */}
						{dadosGraficos.clientes.length > 0 && (
							<div className="card">
								<h4>Top 5 Clientes por Faturamento</h4>
								<div style={{ height: 300 }}>
									<ResponsiveContainer width="100%" height="100%">
										<BarChart data={dadosGraficos.clientes}>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="cliente" />
											<YAxis />
											<Tooltip formatter={(value: number | string) => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento']} />
											<Bar dataKey="total" fill="#10b981" />
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>
						)}

						{/* Gráfico de Linha - Lançamentos por Cliente */}
						{dadosGraficos.clientes.length > 0 && (
							<div className="card">
								<h4>Lançamentos por Cliente</h4>
								<div style={{ height: 300 }}>
									<ResponsiveContainer width="100%" height="100%">
										<LineChart data={dadosGraficos.clientes}>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="cliente" />
											<YAxis />
											<Tooltip formatter={(value: number | string) => [value, 'Lançamentos']} />
											<Line type="monotone" dataKey="lancamentos" stroke="#3b82f6" strokeWidth={2} />
										</LineChart>
									</ResponsiveContainer>
								</div>
							</div>
						)}
					</div>
					
					<div className="grid-2" style={{ marginBottom: 16 }}>
						<div className="card">
							<h4>Resumo de Clientes</h4>
							<div className="stack">
								<div><strong>Total de Clientes:</strong> {relatorioClientes.totalClientes}</div>
								<div><strong>Faturamento Total:</strong> R$ {relatorioClientes.totalFaturamento.toFixed(2)}</div>
								<div><strong>Ticket Médio:</strong> R$ {relatorioClientes.totalClientes > 0 ? (relatorioClientes.totalFaturamento / relatorioClientes.totalClientes).toFixed(2) : '0,00'}</div>
							</div>
						</div>
					</div>

					{relatorioClientes.topClientes.length > 0 && (
						<div className="card">
							<h4>Top 10 Clientes</h4>
							<table className="table">
								<thead>
									<tr><th>Cliente</th><th>Lançamentos</th><th>Total Gasto</th></tr>
								</thead>
								<tbody>
									{relatorioClientes.topClientes.map((cliente, index) => (
										<tr key={index}>
											<td>{cliente.nome}</td>
											<td>{cliente.lancamentos}</td>
											<td>R$ {cliente.total.toFixed(2)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
