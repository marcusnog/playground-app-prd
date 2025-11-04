import { useMemo, useState } from 'react'
import { db } from '../services/mockDb'
import { 
	AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
	XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'

export default function Dashboard() {
	const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('hoje')
	
	const lancamentos = useMemo(() => db.get().lancamentos, [])
	const brinquedos = useMemo(() => db.get().brinquedos, [])
	
	// Filtrar dados por período
	const dadosFiltrados = useMemo(() => {
		const agora = new Date()
		const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
		const inicioSemana = new Date(hoje)
		inicioSemana.setDate(hoje.getDate() - hoje.getDay())
		const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
		
		let dataInicio: Date
		switch (periodo) {
			case 'hoje':
				dataInicio = hoje
				break
			case 'semana':
				dataInicio = inicioSemana
				break
			case 'mes':
				dataInicio = inicioMes
				break
			default:
				dataInicio = new Date(0)
		}
		
		return lancamentos.filter(l => new Date(l.dataHora) >= dataInicio)
	}, [lancamentos, periodo])
	
	// Métricas principais
	const metricas = useMemo(() => {
		const totalVendas = dadosFiltrados
			.filter(l => l.status === 'pago')
			.reduce((acc, l) => acc + l.valorCalculado, 0)
		
		const totalLancamentos = dadosFiltrados.length
		const lancamentosPagos = dadosFiltrados.filter(l => l.status === 'pago').length
		const lancamentosAbertos = dadosFiltrados.filter(l => l.status === 'aberto').length
		
		const ticketMedio = lancamentosPagos > 0 ? totalVendas / lancamentosPagos : 0
		
		return {
			totalVendas,
			totalLancamentos,
			lancamentosPagos,
			lancamentosAbertos,
			ticketMedio
		}
	}, [dadosFiltrados])
	
	// Dados para gráficos
	const dadosGraficos = useMemo(() => {
		// Vendas por dia
		const vendasPorDia = dadosFiltrados
			.filter(l => l.status === 'pago')
			.reduce((acc, l) => {
				const data = new Date(l.dataHora).toISOString().split('T')[0]
				acc[data] = (acc[data] || 0) + l.valorCalculado
				return acc
			}, {} as Record<string, number>)
		
		const vendasPorDiaArray = Object.entries(vendasPorDia)
			.map(([data, valor]) => ({ data, valor }))
			.sort((a, b) => a.data.localeCompare(b.data))
		
		// Vendas por brinquedo
		const vendasPorBrinquedo = dadosFiltrados
			.filter(l => l.status === 'pago' && l.brinquedoId)
			.reduce((acc, l) => {
				const brinquedo = brinquedos.find(b => b.id === l.brinquedoId)
				const nome = brinquedo?.nome || 'Sem brinquedo'
				acc[nome] = (acc[nome] || 0) + l.valorCalculado
				return acc
			}, {} as Record<string, number>)
		
		const vendasPorBrinquedoArray = Object.entries(vendasPorBrinquedo)
			.map(([nome, valor]) => ({ nome, valor }))
			.sort((a, b) => b.valor - a.valor)
		
		// Status dos lançamentos
		const statusLancamentos = dadosFiltrados.reduce((acc, l) => {
			acc[l.status] = (acc[l.status] || 0) + 1
			return acc
		}, {} as Record<string, number>)
		
		const statusArray = Object.entries(statusLancamentos)
			.map(([status, quantidade]) => ({ 
				status: status === 'aberto' ? 'Aberto' : 
						status === 'pago' ? 'Pago' : 'Cancelado',
				quantidade 
			}))
		
		return {
			vendasPorDia: vendasPorDiaArray,
			vendasPorBrinquedo: vendasPorBrinquedoArray,
			statusLancamentos: statusArray
		}
	}, [dadosFiltrados, brinquedos])
	
	const cores = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00']
	
	return (
		<div className="container">
			<div className="title">
				<h2>Dashboard</h2>
				<div className="periodo-selector">
					<select 
						className="select" 
						value={periodo} 
						onChange={(e) => setPeriodo(e.target.value as any)}
					>
						<option value="hoje">Hoje</option>
						<option value="semana">Esta Semana</option>
						<option value="mes">Este Mês</option>
						<option value="todos">Todos</option>
					</select>
				</div>
			</div>
			
			{/* Métricas Principais */}
			<div className="dashboard-grid">
				<div className="card metric-card">
					<div className="metric-icon">💰</div>
					<div className="metric-content">
						<div className="metric-value">R$ {metricas.totalVendas.toFixed(2)}</div>
						<div className="metric-label">Total de Vendas</div>
					</div>
				</div>
				
				<div className="card metric-card">
					<div className="metric-icon">📊</div>
					<div className="metric-content">
						<div className="metric-value">{metricas.totalLancamentos}</div>
						<div className="metric-label">Total de Lançamentos</div>
					</div>
				</div>
				
				<div className="card metric-card">
					<div className="metric-icon">✅</div>
					<div className="metric-content">
						<div className="metric-value">{metricas.lancamentosPagos}</div>
						<div className="metric-label">Lançamentos Pagos</div>
					</div>
				</div>
				
				<div className="card metric-card">
					<div className="metric-icon">⏳</div>
					<div className="metric-content">
						<div className="metric-value">{metricas.lancamentosAbertos}</div>
						<div className="metric-label">Em Aberto</div>
					</div>
				</div>
				
				<div className="card metric-card">
					<div className="metric-icon">🎯</div>
					<div className="metric-content">
						<div className="metric-value">R$ {metricas.ticketMedio.toFixed(2)}</div>
						<div className="metric-label">Ticket Médio</div>
					</div>
				</div>
			</div>
			
			{/* Gráficos */}
			<div className="charts-grid">
				{/* Vendas por Dia */}
				<div className="card chart-card">
					<h3>Vendas por Dia</h3>
					<div className="chart-container">
						<ResponsiveContainer width="100%" height={300}>
							<AreaChart data={dadosGraficos.vendasPorDia}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="data" />
								<YAxis />
								<Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']} />
								<Area 
									type="monotone" 
									dataKey="valor" 
									stroke="#8884d8" 
									fill="#8884d8" 
									fillOpacity={0.6}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>
				
				{/* Vendas por Brinquedo */}
				<div className="card chart-card">
					<h3>Vendas por Brinquedo</h3>
					<div className="chart-container">
						<ResponsiveContainer width="100%" height={300}>
							<BarChart data={dadosGraficos.vendasPorBrinquedo}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="nome" />
								<YAxis />
								<Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']} />
								<Bar dataKey="valor" fill="#82ca9d" />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
				
				{/* Status dos Lançamentos */}
				<div className="card chart-card">
					<h3>Status dos Lançamentos</h3>
					<div className="chart-container">
						<ResponsiveContainer width="100%" height={300}>
							<PieChart>
								<Pie
									data={dadosGraficos.statusLancamentos}
									cx="50%"
									cy="50%"
									labelLine={false}
									label={(props: any) => `${props.status} ${(props.percent * 100).toFixed(0)}%`}
									outerRadius={80}
									fill="#8884d8"
									dataKey="quantidade"
								>
									{dadosGraficos.statusLancamentos.map((_, index) => (
										<Cell key={`cell-${index}`} fill={cores[index % cores.length]} />
									))}
								</Pie>
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
		</div>
	)
}
