import { useMemo, useState } from 'react'
import { db } from '../services/mockDb'
import { 
	LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
	XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'

export default function Relatorios() {
	const [filtroDataInicio, setFiltroDataInicio] = useState('')
	const [filtroDataFim, setFiltroDataFim] = useState('')
	const [filtroStatus, setFiltroStatus] = useState<'todos' | 'aberto' | 'pago' | 'cancelado'>('todos')
	const [tipoRelatorio, setTipoRelatorio] = useState<'vendas' | 'caixa' | 'clientes'>('vendas')

	const lancamentos = useMemo(() => db.get().lancamentos, [])
	const caixas = useMemo(() => db.get().caixas, [])
	const brinquedos = useMemo(() => db.get().brinquedos, [])

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

		return {
			totalVendas,
			totalLancamentos,
			totalPagos,
			totalCancelados,
			totalAbertos,
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

	const exportarRelatorio = () => {
		const dados = {
			periodo: {
				inicio: filtroDataInicio || 'Todos',
				fim: filtroDataFim || 'Todos'
			},
			vendas: relatorioVendas,
			caixa: relatorioCaixa,
			clientes: relatorioClientes
		}

		const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `relatorio_${new Date().toISOString().split('T')[0]}.json`
		a.click()
		URL.revokeObjectURL(url)
	}

	return (
		<div className="container">
			<h2>Relatórios</h2>
			
			{/* Filtros */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>Filtros</h3>
				<div className="form three">
					<label className="field">
						<span>Data Início</span>
						<input 
							type="date" 
							className="input" 
							value={filtroDataInicio} 
							onChange={(e) => setFiltroDataInicio(e.target.value)} 
						/>
					</label>
					<label className="field">
						<span>Data Fim</span>
						<input 
							type="date" 
							className="input" 
							value={filtroDataFim} 
							onChange={(e) => setFiltroDataFim(e.target.value)} 
						/>
					</label>
					<label className="field">
						<span>Status</span>
						<select 
							className="select" 
							value={filtroStatus} 
							onChange={(e) => setFiltroStatus(e.target.value as any)}
						>
							<option value="todos">Todos</option>
							<option value="aberto">Aberto</option>
							<option value="pago">Pago</option>
							<option value="cancelado">Cancelado</option>
						</select>
					</label>
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
						<button className="btn primary" onClick={exportarRelatorio}>
							📥 Exportar
						</button>
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
										<Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']} />
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
											label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
											outerRadius={80}
											fill="#8884d8"
											dataKey="value"
										>
											{dadosGraficos.formasPagamento.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color} />
											))}
										</Pie>
										<Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']} />
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
											<Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']} />
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
								<div className="empty">Nenhuma venda encontrada</div>
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
				</div>
			)}

			{/* Relatório de Caixa */}
			{tipoRelatorio === 'caixa' && (
				<div className="card">
					<div className="title">
						<h3>Relatório de Caixa</h3>
						<button className="btn primary" onClick={exportarRelatorio}>
							📥 Exportar
						</button>
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
						<button className="btn primary" onClick={exportarRelatorio}>
							📥 Exportar
						</button>
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
											<Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Faturamento']} />
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
											<Tooltip formatter={(value) => [value, 'Lançamentos']} />
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
