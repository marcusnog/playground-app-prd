import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { lancamentosService, brinquedosService } from '../services/entitiesService'
import type { Lancamento, Brinquedo } from '../services/entitiesService'
import {
	AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
	XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import {
	DollarSign, TrendingUp, CheckCircle2, Clock, Target,
	LayoutDashboard
} from 'lucide-react'

const METRIC_ICONS = [
	{ icon: DollarSign, color: '#10b981', bg: 'rgba(16,185,129,.12)', border: 'rgba(16,185,129,.2)' },
	{ icon: TrendingUp,  color: '#6366f1', bg: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.2)' },
	{ icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.2)' },
	{ icon: Clock,       color: '#f59e0b', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.2)' },
	{ icon: Target,      color: '#ec4899', bg: 'rgba(236,72,153,.12)', border: 'rgba(236,72,153,.2)' },
]

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6']

export default function Dashboard() {
	const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('hoje')
	const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
	const [brinquedos, setBrinquedos] = useState<Brinquedo[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		async function load() {
			try {
				setLoading(true)
				setError(null)
				const [lancamentosData, brinquedosData] = await Promise.all([
					lancamentosService.list(),
					brinquedosService.list(),
				])
				setLancamentos(lancamentosData ?? [])
				setBrinquedos(brinquedosData ?? [])
			} catch (e) {
				console.error('Erro ao carregar dashboard:', e)
				setError('Erro ao carregar dados. Tente novamente.')
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [])

	const dadosFiltrados = useMemo(() => {
		const agora = new Date()
		const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
		const inicioSemana = new Date(hoje)
		inicioSemana.setDate(hoje.getDate() - hoje.getDay())
		const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

		let dataInicio: Date
		switch (periodo) {
			case 'hoje':   dataInicio = hoje; break
			case 'semana': dataInicio = inicioSemana; break
			case 'mes':    dataInicio = inicioMes; break
			default:       dataInicio = new Date(0)
		}

		return lancamentos.filter(l => new Date(l.dataHora) >= dataInicio)
	}, [lancamentos, periodo])

	const metricas = useMemo(() => {
		const totalVendas = dadosFiltrados.filter(l => l.status === 'pago').reduce((acc, l) => acc + l.valorCalculado, 0)
		const totalLancamentos = dadosFiltrados.length
		const lancamentosPagos = dadosFiltrados.filter(l => l.status === 'pago').length
		const lancamentosAbertos = dadosFiltrados.filter(l => l.status === 'aberto').length
		const ticketMedio = lancamentosPagos > 0 ? totalVendas / lancamentosPagos : 0
		return { totalVendas, totalLancamentos, lancamentosPagos, lancamentosAbertos, ticketMedio }
	}, [dadosFiltrados])

	const dadosGraficos = useMemo(() => {
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

		const statusLancamentos = dadosFiltrados.reduce((acc, l) => {
			acc[l.status] = (acc[l.status] || 0) + 1
			return acc
		}, {} as Record<string, number>)
		const statusArray = Object.entries(statusLancamentos).map(([status, quantidade]) => ({
			status: status === 'aberto' ? 'Aberto' : status === 'pago' ? 'Pago' : 'Cancelado',
			quantidade
		}))

		return { vendasPorDia: vendasPorDiaArray, vendasPorBrinquedo: vendasPorBrinquedoArray, statusLancamentos: statusArray }
	}, [dadosFiltrados, brinquedos])

	if (loading) {
		return (
			<div className="container">
				<div className="dash-header">
					<div className="dash-title-row">
						<LayoutDashboard size={22} style={{ color: 'var(--primary)' }} />
						<h2 style={{ margin: 0 }}>Dashboard</h2>
					</div>
				</div>
				<div className="dashboard-grid">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="metric-card" style={{ opacity: .5 }}>
							<div className="metric-icon" style={{ background: 'var(--border)' }} />
							<div className="metric-content">
								<div style={{ height: 22, background: 'var(--border)', borderRadius: 4, marginBottom: 6, width: '70%' }} />
								<div style={{ height: 14, background: 'var(--border)', borderRadius: 4, width: '50%' }} />
							</div>
						</div>
					))}
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="container">
				<h2>Dashboard</h2>
				<div className="card" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid var(--danger)' }}>
					<p style={{ color: 'var(--danger)', margin: 0 }}>{error}</p>
				</div>
			</div>
		)
	}

	const metricItems = [
		{ label: 'Total de Vendas',       value: `R$ ${metricas.totalVendas.toFixed(2)}` },
		{ label: 'Total de Lançamentos',  value: String(metricas.totalLancamentos) },
		{ label: 'Lançamentos Pagos',     value: String(metricas.lancamentosPagos) },
		{ label: 'Em Aberto',             value: String(metricas.lancamentosAbertos) },
		{ label: 'Ticket Médio',          value: `R$ ${metricas.ticketMedio.toFixed(2)}` },
	]

	return (
		<div className="container">
			<div className="dash-header">
				<div className="dash-title-row">
					<LayoutDashboard size={22} style={{ color: 'var(--primary)' }} />
					<h2 style={{ margin: 0 }}>Dashboard</h2>
				</div>
				<div className="periodo-selector">
					<select
						className="select"
						value={periodo}
						onChange={e => setPeriodo(e.target.value as 'hoje' | 'semana' | 'mes' | 'todos')}
					>
						<option value="hoje">Hoje</option>
						<option value="semana">Esta Semana</option>
						<option value="mes">Este Mês</option>
						<option value="todos">Todos</option>
					</select>
				</div>
			</div>

			{/* Metric cards */}
			<div className="dashboard-grid">
				{metricItems.map((m, i) => {
					const { icon: Icon, color, bg, border } = METRIC_ICONS[i]
					return (
						<div key={m.label} className="metric-card">
							<div className="metric-icon" style={{ background: bg, border: `1px solid ${border}` }}>
								<Icon size={20} color={color} />
							</div>
							<div className="metric-content">
								<div className="metric-value">{m.value}</div>
								<div className="metric-label">{m.label}</div>
							</div>
						</div>
					)
				})}
			</div>

			{/* Charts */}
			<div className="charts-grid">
				<div className="card chart-card">
					<h3>Vendas por Dia</h3>
					<div className="chart-container">
						<ResponsiveContainer width="100%" height={260}>
							<AreaChart data={dadosGraficos.vendasPorDia}>
								<defs>
									<linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#10b981" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
								<XAxis dataKey="data" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
								<YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} />
								<Tooltip
									contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
									formatter={(value: number | string) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']}
								/>
								<Area type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2} fill="url(#colorVendas)" />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="card chart-card">
					<h3>Vendas por Brinquedo</h3>
					<div className="chart-container">
						<ResponsiveContainer width="100%" height={260}>
							<BarChart data={dadosGraficos.vendasPorBrinquedo}>
								<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
								<XAxis dataKey="nome" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
								<YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} />
								<Tooltip
									contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
									formatter={(value: number | string) => [`R$ ${Number(value).toFixed(2)}`, 'Vendas']}
								/>
								<Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>

				<div className="card chart-card">
					<h3>Status dos Lançamentos</h3>
					<div className="chart-container">
						<ResponsiveContainer width="100%" height={260}>
							<PieChart>
								<Pie
									data={dadosGraficos.statusLancamentos}
									cx="50%"
									cy="50%"
									labelLine={false}
									label={((props: { status?: string; percent?: number }) =>
										`${props.status ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`) as (props: unknown) => ReactNode}
									outerRadius={90}
									dataKey="quantidade"
								>
									{dadosGraficos.statusLancamentos.map((_, index) => (
										<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
									))}
								</Pie>
								<Tooltip
									contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
								/>
							</PieChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
		</div>
	)
}
