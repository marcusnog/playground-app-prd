import { useEffect, useMemo, useState } from 'react'
import { estacionamentosService, lancamentosEstacionamentoService } from '../../services/entitiesService'
import { usePermissions } from '../../hooks/usePermissions'

export default function AcompanhamentoEstacionamento() {
	const [tick, setTick] = useState(0)
	const [filtroStatus, setFiltroStatus] = useState<'abertos' | 'encerrados'>('abertos')
	const [estacionamentoFiltro, setEstacionamentoFiltro] = useState<string>('')
	const [mostrarMensagemPersonalizada, setMostrarMensagemPersonalizada] = useState(false)
	const [mensagemPersonalizada, setMensagemPersonalizada] = useState('')
	const [numeroWhatsapp, setNumeroWhatsapp] = useState<string>('')
	const [estacionamentos, setEstacionamentos] = useState<Awaited<ReturnType<typeof estacionamentosService.list>>>([])
	const [lancamentos, setLancamentos] = useState<Awaited<ReturnType<typeof lancamentosEstacionamentoService.list>>>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const { hasPermission } = usePermissions()

	useEffect(() => {
		async function load() {
			try {
				setLoading(true)
				setError(null)
				const [estData, lancData] = await Promise.all([
					estacionamentosService.list(),
					lancamentosEstacionamentoService.list(),
				])
				setEstacionamentos(estData ?? [])
				setLancamentos(lancData ?? [])
			} catch (e) {
				console.error('Erro ao carregar acompanhamento:', e)
				setError('Erro ao carregar dados. Tente novamente.')
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [tick])

	// Verificar permissão
	if (!hasPermission('estacionamento', 'acompanhamento')) {
		return (
			<div className="container" style={{ maxWidth: 1200 }}>
				<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<h3 style={{ color: 'var(--danger)' }}>Acesso Negado</h3>
					<p>Você não tem permissão para acessar esta funcionalidade.</p>
				</div>
			</div>
		)
	}

	const lancamentosFiltrados = useMemo(() => {
		let filtrados = lancamentos

		// Filtro por estacionamento
		if (estacionamentoFiltro) {
			filtrados = filtrados.filter(l => l.estacionamentoId === estacionamentoFiltro)
		}

		// Filtro por status
		if (filtroStatus === 'abertos') {
			filtrados = filtrados.filter((l) => l.status === 'aberto')
		} else {
			filtrados = filtrados.filter((l) => l.status === 'pago' || l.status === 'cancelado')
		}

		return filtrados.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
	}, [lancamentos, filtroStatus, estacionamentoFiltro])

	useEffect(() => {
		const t = setInterval(() => setTick((x) => x + 1), 1000 * 30)
		return () => clearInterval(t)
	}, [])

	function abrirWhatsapp(numero: string, mensagem: string) {
		const url = `https://wa.me/${encodeURIComponent(numero)}?text=${encodeURIComponent(mensagem)}`
		window.open(url, '_blank')
	}

	function abrirWhatsappComPersonalizacao(numero: string, mensagemPadrao: string) {
		setNumeroWhatsapp(numero)
		setMensagemPersonalizada(mensagemPadrao)
		setMostrarMensagemPersonalizada(true)
	}

	function enviarMensagemPersonalizada() {
		if (!numeroWhatsapp) return
		const mensagem = mensagemPersonalizada.trim() || 'Olá!'
		abrirWhatsapp(numeroWhatsapp, mensagem)
		setMostrarMensagemPersonalizada(false)
		setMensagemPersonalizada('')
		setNumeroWhatsapp('')
	}

	function formatarPlaca(placa: string) {
		if (placa.length === 7) {
			return `${placa.slice(0, 3)}-${placa.slice(3)}`
		}
		return placa
	}

	if (loading) {
		return (
			<div className="container" style={{ maxWidth: 1200 }}>
				<h2>Acompanhamento de Estacionamento</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="container" style={{ maxWidth: 1200 }}>
				<h2>Acompanhamento de Estacionamento</h2>
				<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<p style={{ color: 'var(--danger)' }}>{error}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 1200 }}>
			<h2>Acompanhamento de Estacionamento</h2>

			{/* Filtros */}
			<div className="card" style={{ marginBottom: 16 }}>
				<div className="form two">
					<label className="field">
						<span>Filtrar por Estacionamento</span>
						<select 
							className="select" 
							value={estacionamentoFiltro} 
							onChange={(e) => setEstacionamentoFiltro(e.target.value)}
						>
							<option value="">Todos os estacionamentos</option>
							{estacionamentos.map((e) => (
								<option key={e.id} value={e.id}>
									{e.nome}
								</option>
							))}
						</select>
					</label>

					<label className="field">
						<span>Status</span>
						<select 
							className="select" 
							value={filtroStatus} 
							onChange={(e) => setFiltroStatus(e.target.value as 'abertos' | 'encerrados')}
						>
							<option value="abertos">Abertos</option>
							<option value="encerrados">Encerrados</option>
						</select>
					</label>
				</div>
			</div>

			{/* Lista de Lançamentos */}
			<div className="card">
				<h3>
					{filtroStatus === 'abertos' ? 'Veículos no Estacionamento' : 'Histórico'}
					{' '}({lancamentosFiltrados.length})
				</h3>
				{lancamentosFiltrados.length === 0 ? (
					<div className="empty">Nenhum registro encontrado</div>
				) : (
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Placa</th>
									<th>Modelo</th>
									<th>Estacionamento</th>
									<th>Entrada</th>
									<th>Valor</th>
									<th>Status</th>
									<th>Contato</th>
									<th>Ações</th>
								</tr>
							</thead>
							<tbody>
								{lancamentosFiltrados.map((l) => {
									const est = estacionamentos.find(e => e.id === l.estacionamentoId)
									return (
										<tr key={l.id}>
											<td><strong>{formatarPlaca(l.placa)}</strong></td>
											<td>{l.modelo || '-'}</td>
											<td>{est?.nome || 'N/A'}</td>
											<td>{new Date(l.dataHora).toLocaleString('pt-BR')}</td>
											<td>R$ {l.valor.toFixed(2)}</td>
											<td>
												{l.status === 'aberto' ? (
													<span className="badge on">Aberto</span>
												) : l.status === 'pago' ? (
													<span className="badge" style={{ background: 'var(--success)' }}>Pago</span>
												) : (
													<span className="badge off">Cancelado</span>
												)}
											</td>
											<td>
												{l.telefoneContato ? (
													<span>{l.telefoneContato}</span>
												) : (
													<span style={{ color: 'var(--muted)' }}>-</span>
												)}
											</td>
											<td>
												{l.telefoneContato && l.status === 'aberto' ? (
													<button 
														className="btn" 
														onClick={() => abrirWhatsappComPersonalizacao(l.telefoneContato!, 'Olá! Seu veículo está no estacionamento.')}
														title="Chamar proprietário"
													>
														📞 Chamar
													</button>
												) : (
													<span style={{ color: 'var(--muted)' }}>-</span>
												)}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Modal de Mensagem Personalizada */}
			{mostrarMensagemPersonalizada && (
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(0, 0, 0, 0.5)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 1000
				}} onClick={() => setMostrarMensagemPersonalizada(false)}>
					<div className="card" style={{ maxWidth: 500, width: '90%', margin: 20 }} onClick={(e) => e.stopPropagation()}>
						<h3>Personalizar Mensagem WhatsApp</h3>
						<div className="form">
							<label className="field">
								<span>Mensagem</span>
								<textarea
									className="input"
									value={mensagemPersonalizada}
									onChange={(e) => setMensagemPersonalizada(e.target.value)}
									placeholder="Digite sua mensagem personalizada..."
									rows={5}
									style={{ resize: 'vertical' }}
									autoFocus
								/>
								<span className="help">Personalize a mensagem antes de enviar</span>
							</label>
							<div className="actions">
								<button className="btn" onClick={() => setMostrarMensagemPersonalizada(false)}>
									Cancelar
								</button>
								<button className="btn primary" onClick={enviarMensagemPersonalizada} disabled={!mensagemPersonalizada.trim()}>
									📱 Enviar WhatsApp
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
