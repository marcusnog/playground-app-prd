import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { calcularValorExibidoLancamento } from '../services/utils'
import { brinquedosService, lancamentosService, parametrosService } from '../services/entitiesService'
import type { Brinquedo as BrinquedoType, Lancamento, Parametros as ParametrosType } from '../services/entitiesService'

export default function Acompanhamento() {
	const [tick, setTick] = useState(0)
	const [filtroStatus, setFiltroStatus] = useState<'abertos' | 'encerrados'>('abertos')
	const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
	const [parametros, setParametros] = useState<ParametrosType | null>(null)
	const [brinquedos, setBrinquedos] = useState<BrinquedoType[]>([])
	const [loading, setLoading] = useState(true)
	const [mostrarMensagemPersonalizada, setMostrarMensagemPersonalizada] = useState(false)
	const [mensagemPersonalizada, setMensagemPersonalizada] = useState('')
	const [numeroWhatsapp, setNumeroWhatsapp] = useState<string>('')
	const hoje = new Date().toLocaleDateString('sv')
	const [filtroDataInicio, setFiltroDataInicio] = useState(hoje)
	const [filtroDataFim, setFiltroDataFim] = useState(hoje)
	const [filtroNome, setFiltroNome] = useState('')

	const lancamentosFiltrados = useMemo(() => {
		let lista: Lancamento[]
		if (filtroStatus === 'abertos') {
			lista = lancamentos.filter((l) => l.status === 'aberto')
			const now = Date.now()
			lista = [...lista].sort((a, b) => {
				const decA = Math.floor((now - new Date(a.dataHora).getTime()) / 60000)
				const decB = Math.floor((now - new Date(b.dataHora).getTime()) / 60000)
				const alvoA = a.tempoSolicitadoMin ?? Infinity
				const alvoB = b.tempoSolicitadoMin ?? Infinity
				const restanteA = isFinite(alvoA) ? Math.max(0, alvoA - decA) : Infinity
				const restanteB = isFinite(alvoB) ? Math.max(0, alvoB - decB) : Infinity
				return restanteA - restanteB
			})
		} else {
			lista = lancamentos.filter((l) => l.status === 'pago' || l.status === 'cancelado')
			if (filtroDataInicio) {
				lista = lista.filter((l) => new Date(l.dataHora).toLocaleDateString('sv') >= filtroDataInicio)
			}
			if (filtroDataFim) {
				lista = lista.filter((l) => new Date(l.dataHora).toLocaleDateString('sv') <= filtroDataFim)
			}
			lista = [...lista].sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
		}
		if (filtroNome.trim()) {
			const termo = filtroNome.trim().toLowerCase()
			lista = lista.filter(
				(l) =>
					l.nomeCrianca?.toLowerCase().includes(termo) ||
					l.nomeResponsavel?.toLowerCase().includes(termo)
			)
		}
		return lista
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tick, filtroStatus, lancamentos, filtroDataInicio, filtroDataFim, filtroNome])

	const resumoEncerrados = useMemo(() => {
		const pagos = lancamentosFiltrados.filter((l) => l.status === 'pago')
		const cancelados = lancamentosFiltrados.filter((l) => l.status === 'cancelado')
		return {
			total: lancamentosFiltrados.length,
			pagos: pagos.length,
			cancelados: cancelados.length,
			totalPago: pagos.reduce((acc, l) => acc + (l.valorCalculado || 0), 0),
		}
	}, [lancamentosFiltrados])

	useEffect(() => {
		async function loadData() {
			try {
				setLoading(true)
				const [lancamentosData, parametrosData, brinquedosData] = await Promise.all([
					lancamentosService.list(),
					parametrosService.get(),
					brinquedosService.list(),
				])
				setLancamentos(lancamentosData)
				setParametros(parametrosData)
				setBrinquedos(brinquedosData)
			} catch (error) {
				console.error('Erro ao carregar dados:', error)
			} finally {
				setLoading(false)
			}
		}

		loadData()

		const tRefresh = setInterval(loadData, 1000 * 30)
		const tTick = setInterval(() => setTick((x) => x + 1), 1000 * 10)
		return () => {
			clearInterval(tRefresh)
			clearInterval(tTick)
		}
	}, [])

	function minutosDecorridos(iso: string) {
		const ms = Date.now() - new Date(iso).getTime()
		return Math.max(0, Math.floor(ms / 60000))
	}

	function formatarHora(iso: string) {
		return new Date(iso).toLocaleTimeString('pt-BR', {
			hour: '2-digit',
			minute: '2-digit',
		})
	}

	function formatarData(iso: string) {
		return new Date(iso).toLocaleDateString('pt-BR')
	}

	function abrirWhatsapp(numero: string, texto: string) {
		const url = `https://wa.me/${encodeURIComponent(numero)}?text=${encodeURIComponent(texto)}`
		window.open(url, '_blank')
	}

	function abrirWhatsappComPersonalizacao(numero: string, textoPadrao: string) {
		setNumeroWhatsapp(numero)
		setMensagemPersonalizada(textoPadrao)
		setMostrarMensagemPersonalizada(true)
	}

	function enviarMensagemPersonalizada() {
		if (!numeroWhatsapp) return
		const mensagem = mensagemPersonalizada.trim() || 'Ola!'
		abrirWhatsapp(numeroWhatsapp, mensagem)
		setMostrarMensagemPersonalizada(false)
		setMensagemPersonalizada('')
		setNumeroWhatsapp('')
	}

	async function atualizarHoraMinuto(lancamentoId: string, novaDataHora: Date) {
		try {
			await lancamentosService.update(lancamentoId, {
				dataHora: novaDataHora.toISOString(),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			} as any)
			const lancamentosData = await lancamentosService.list()
			setLancamentos(lancamentosData)
		} catch (error) {
			console.error('Erro ao atualizar hora/minuto:', error)
			alert('Erro ao atualizar hora/minuto. Tente novamente.')
		}
	}

	if (loading) {
		return (
			<div className="container wide">
				<h2>Acompanhamento</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	return (
		<div className="container wide">
			<div className="acompanhamento-topbar">
				<div>
					<h2 style={{ marginBottom: 6 }}>Acompanhamento</h2>
					<div className="subtitle">
						{filtroStatus === 'abertos'
							? `${lancamentosFiltrados.length} em andamento`
							: `${lancamentosFiltrados.length} encerrados no periodo selecionado`}
					</div>
				</div>

				<div className="acompanhamento-toggle">
					<button
						className={`btn icon ${filtroStatus === 'abertos' ? 'primary' : ''}`}
						onClick={() => { setFiltroStatus('abertos'); setFiltroNome('') }}
					>
						Em Andamento
					</button>
					<button
						className={`btn icon ${filtroStatus === 'encerrados' ? 'primary' : ''}`}
						onClick={() => { setFiltroStatus('encerrados'); setFiltroNome('') }}
					>
						Encerrados
					</button>
				</div>
			</div>

			{filtroStatus === 'abertos' && (
				<div style={{ marginBottom: 12 }}>
					<input
						type="text"
						className="input"
						placeholder="Buscar por nome da crianca ou responsavel..."
						value={filtroNome}
						onChange={(e) => setFiltroNome(e.target.value)}
						style={{ maxWidth: 400 }}
					/>
				</div>
			)}

			{filtroStatus === 'encerrados' && (
				<>
					<div className="card acompanhamento-filtros-card">
						<div className="acompanhamento-filtros-head">
							<div>
								<div className="acompanhamento-eyebrow">Consulta de encerramentos</div>
								<div className="subtitle">Filtre pagamentos e cancelamentos por data para localizar atendimentos com mais rapidez.</div>
							</div>
							<button
								className="btn"
								type="button"
								onClick={() => {
									setFiltroDataInicio(hoje)
									setFiltroDataFim(hoje)
								}}
							>
								Hoje
							</button>
						</div>

						<div className="acompanhamento-filtros-grid">
							<label className="field">
								<span>Data inicial</span>
								<input
									type="date"
									className="input"
									value={filtroDataInicio}
									onChange={(e) => setFiltroDataInicio(e.target.value)}
								/>
							</label>
							<label className="field">
								<span>Data final</span>
								<input
									type="date"
									className="input"
									value={filtroDataFim}
									onChange={(e) => setFiltroDataFim(e.target.value)}
								/>
							</label>
							<label className="field">
								<span>Nome</span>
								<input
									type="text"
									className="input"
									placeholder="Crianca ou responsavel..."
									value={filtroNome}
									onChange={(e) => setFiltroNome(e.target.value)}
								/>
							</label>
						</div>
					</div>

					<div className="acompanhamento-metricas">
						<div className="card acompanhamento-metrica">
							<span className="acompanhamento-metrica-label">Encerrados</span>
							<strong>{resumoEncerrados.total}</strong>
						</div>
						<div className="card acompanhamento-metrica">
							<span className="acompanhamento-metrica-label">Pagos</span>
							<strong>{resumoEncerrados.pagos}</strong>
						</div>
						<div className="card acompanhamento-metrica">
							<span className="acompanhamento-metrica-label">Cancelados</span>
							<strong>{resumoEncerrados.cancelados}</strong>
						</div>
						<div className="card acompanhamento-metrica">
							<span className="acompanhamento-metrica-label">Valor recebido</span>
							<strong>R$ {resumoEncerrados.totalPago.toFixed(2)}</strong>
						</div>
					</div>
				</>
			)}

			{filtroStatus === 'encerrados' && lancamentosFiltrados.length === 0 ? (
				<div className="card acompanhamento-empty-state">
					<div className="acompanhamento-empty-icon">[ ]</div>
					<h3>Nenhum encerramento encontrado</h3>
					<p>
						Nao ha registros pagos ou cancelados entre {formatarData(`${filtroDataInicio}T00:00:00`)} e {formatarData(`${filtroDataFim}T00:00:00`)}.
					</p>
					<p className="subtitle">Ajuste o periodo ou use o filtro de hoje para consultar outro intervalo.</p>
				</div>
			) : (
				<div className={`card table-wrap ${filtroStatus === 'encerrados' ? 'acompanhamento-table-card' : ''}`}>
					<table className="table">
						<thead>
							<tr>
								<th>Crianca</th>
								<th>Responsavel</th>
								<th>Brinquedo</th>
								<th>Hora inicial</th>
								<th>Hora final</th>
								<th>Tempo</th>
								<th>Valor</th>
								<th>Status</th>
								<th style={{ width: 400 }}>Acoes</th>
							</tr>
						</thead>
						<tbody>
							{lancamentosFiltrados.map((l) => {
								const dec = minutosDecorridos(l.dataHora)
								const alvo = l.tempoSolicitadoMin ?? Infinity
								const restante = isFinite(alvo) ? Math.max(0, alvo - dec) : Infinity
								const brinquedo = l.brinquedoId ? brinquedos.find((b) => b.id === l.brinquedoId) : undefined
								const valor = calcularValorExibidoLancamento(
									l,
									parametros as ParametrosType | null,
									brinquedo as BrinquedoType | undefined
								)
								const alerta = isFinite(restante) && restante <= 5
								const dataHora = new Date(l.dataHora)
								const hora = dataHora.getHours().toString().padStart(2, '0')
								const minuto = dataHora.getMinutes().toString().padStart(2, '0')
								const updatedAt = (l as { updatedAt?: string }).updatedAt
								const dataHoraFinal = l.status === 'aberto' ? undefined : updatedAt

								return (
									<tr key={l.id} className={alerta ? 'highlight' : undefined}>
										<td>
											<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
												{alerta && (
													<span title="Tempo acabando - requer atencao" style={{ color: '#e74c3c', fontSize: '1.2em' }}>!</span>
												)}
												{l.nomeCrianca}
											</div>
										</td>
										<td>{l.nomeResponsavel}</td>
										<td>{brinquedo?.nome ?? '-'}</td>
										<td>
											{filtroStatus === 'abertos' ? (
												<div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
													<input
														type="number"
														min="0"
														max="23"
														value={hora}
														onChange={(e) => {
															const novaHora = parseInt(e.target.value) || 0
															const novaDataHora = new Date(l.dataHora)
															novaDataHora.setHours(Math.max(0, Math.min(23, novaHora)))
															atualizarHoraMinuto(l.id, novaDataHora)
														}}
														style={{ width: 50, padding: '4px 8px', textAlign: 'center' }}
													/>
													<span>:</span>
													<input
														type="number"
														min="0"
														max="59"
														value={minuto}
														onChange={(e) => {
															const novoMinuto = parseInt(e.target.value) || 0
															const novaDataHora = new Date(l.dataHora)
															novaDataHora.setMinutes(Math.max(0, Math.min(59, novoMinuto)))
															atualizarHoraMinuto(l.id, novaDataHora)
														}}
														style={{ width: 50, padding: '4px 8px', textAlign: 'center' }}
													/>
												</div>
											) : (
												<div className="acompanhamento-hora">
													<strong>{formatarHora(l.dataHora)}</strong>
													<span>{formatarData(l.dataHora)}</span>
												</div>
											)}
										</td>
										<td>
											{dataHoraFinal ? (
												<div className="acompanhamento-hora">
													<strong>{formatarHora(dataHoraFinal)}</strong>
													<span>{formatarData(dataHoraFinal)}</span>
												</div>
											) : '-'}
										</td>
										<td
											title={
												(l as { tempoInicialMin?: number | null; tempoAdicionalMin?: number | null }).tempoInicialMin != null &&
												(l as { tempoAdicionalMin?: number | null }).tempoAdicionalMin != null &&
												(l as { tempoAdicionalMin: number }).tempoAdicionalMin > 0
													? `${(l as { tempoInicialMin: number }).tempoInicialMin} min + ${(l as { tempoAdicionalMin: number }).tempoAdicionalMin} min adicional`
													: undefined
											}
										>
											{filtroStatus === 'abertos'
												? (isFinite(restante) ? `${dec} min / falta ${restante} min` : `${dec} min (livre)`)
												: `${dec} min`}
										</td>
										<td>R$ {valor.toFixed(2)}</td>
										<td>
											<span className={`badge ${l.status === 'pago' ? 'on' : l.status === 'cancelado' ? 'off' : ''}`}>
												{l.status === 'pago' ? 'Pago' : l.status === 'cancelado' ? 'Cancelado' : 'Aberto'}
											</span>
										</td>
										<td className="row acompanhamento-acoes">
											{filtroStatus === 'abertos' ? (
												<>
													<button className="btn icon" onClick={() => abrirWhatsappComPersonalizacao(l.whatsappResponsavel, 'Por favor, compareca ao local.')} disabled={!l.whatsappResponsavel}>Chamar</button>
													{alerta && l.whatsappResponsavel && (
														<button className="btn warning icon" onClick={() => abrirWhatsappComPersonalizacao(l.whatsappResponsavel, 'O tempo solicitado esta acabando.')}>Avisar</button>
													)}
													<Link to={`/recibo/lancamento/${l.id}`}>
														<button className="btn icon">Cupom</button>
													</Link>
													<Link to={`/pagamento/${l.id}`}>
														<button className="btn primary icon">Pagamento</button>
													</Link>
												</>
											) : (
												<>
													<button className="btn icon" onClick={() => abrirWhatsappComPersonalizacao(l.whatsappResponsavel, 'Ola! Mensagem sobre seu atendimento no Parque Infantil.')} disabled={!l.whatsappResponsavel}>
														Contato
													</button>
													<Link to={`/recibo/lancamento/${l.id}`}>
														<button className="btn icon">Reimprimir Cupom</button>
													</Link>
													{l.status === 'pago' && (
														<Link to={`/recibo/pagamento/${l.id}`}>
															<button className="btn icon">Reimprimir Recibo</button>
														</Link>
													)}
												</>
											)}
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}

			{mostrarMensagemPersonalizada && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.5)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000,
					}}
					onClick={() => setMostrarMensagemPersonalizada(false)}
				>
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
									Enviar WhatsApp
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
