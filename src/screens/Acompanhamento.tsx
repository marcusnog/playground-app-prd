import { useEffect, useMemo, useState } from 'react'
import { calcularValor } from '../services/utils'
import { lancamentosService, brinquedosService, parametrosService } from '../services/entitiesService'
import { Link } from 'react-router-dom'
import type { Lancamento, Brinquedo as BrinquedoType, Parametros as ParametrosType } from '../services/entitiesService'

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

	const lancamentosFiltrados = useMemo(() => {
		if (filtroStatus === 'abertos') {
			return lancamentos.filter((l) => l.status === 'aberto')
		} else {
			return lancamentos.filter((l) => l.status === 'pago' || l.status === 'cancelado')
		}
	}, [tick, filtroStatus, lancamentos])

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
		
		const t = setInterval(() => {
			setTick((x) => x + 1)
			loadData() // Recarregar dados a cada 30 segundos
		}, 1000 * 30)
		
		return () => clearInterval(t)
	}, [])

	function minutosDecorridos(iso: string) {
		const ms = Date.now() - new Date(iso).getTime()
		return Math.floor(ms / 60000)
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
		const mensagem = mensagemPersonalizada.trim() || 'Olá!'
		abrirWhatsapp(numeroWhatsapp, mensagem)
		setMostrarMensagemPersonalizada(false)
		setMensagemPersonalizada('')
		setNumeroWhatsapp('')
	}

	async function atualizarHoraMinuto(lancamentoId: string, novaDataHora: Date) {
		try {
			await lancamentosService.update(lancamentoId, {
				dataHora: novaDataHora.toISOString()
			} as any)
			// Recarregar dados
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
			<div className="title">
				<h2>Acompanhamento</h2>
				<div className="row" style={{ gap: 12, alignItems: 'center' }}>
					<span className="subtitle">
						{filtroStatus === 'abertos' 
							? `${lancamentosFiltrados.length} em andamento` 
							: `${lancamentosFiltrados.length} encerrados`}
					</span>
					<div className="row" style={{ gap: 8 }}>
						<button 
							className={`btn ${filtroStatus === 'abertos' ? 'primary' : ''}`}
							onClick={() => setFiltroStatus('abertos')}
						>
							📊 Em Andamento
						</button>
						<button 
							className={`btn ${filtroStatus === 'encerrados' ? 'primary' : ''}`}
							onClick={() => setFiltroStatus('encerrados')}
						>
							📋 Encerrados
						</button>
					</div>
				</div>
			</div>
			<div className="card table-wrap">
				<table className="table">
					<thead>
								<tr>
									<th>Criança</th>
									<th>Responsável</th>
									<th>Hora/Minuto</th>
									<th>Tempo</th>
									<th>Valor</th>
									<th>Status</th>
									<th style={{ width: 400 }}>Ações</th>
								</tr>
					</thead>
							<tbody>
								{lancamentosFiltrados.map((l) => {
							const dec = minutosDecorridos(l.dataHora)
							const alvo = l.tempoSolicitadoMin ?? Infinity
							const restante = isFinite(alvo) ? Math.max(0, alvo - dec) : Infinity
							const brinquedo = l.brinquedoId ? brinquedos.find(b => b.id === l.brinquedoId) : undefined
							const valor = parametros ? calcularValor(parametros as ParametrosType, l.tempoSolicitadoMin, brinquedo as BrinquedoType | undefined) : l.valorCalculado
							const alerta = isFinite(restante) && restante <= 5
							const dataHora = new Date(l.dataHora)
							const hora = dataHora.getHours().toString().padStart(2, '0')
							const minuto = dataHora.getMinutes().toString().padStart(2, '0')
							
							return (
								<tr key={l.id} className={alerta ? 'highlight' : undefined}>
									<td>{l.nomeCrianca}</td>
									<td>{l.nomeResponsavel}</td>
									<td>
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
									</td>
									<td>
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
									<td className="row">
										{filtroStatus === 'abertos' ? (
											<>
												<button className="btn icon" onClick={() => abrirWhatsappComPersonalizacao(l.whatsappResponsavel, 'Por favor, compareça ao local.')} disabled={!l.whatsappResponsavel}>📞 Chamar</button>
												{alerta && l.whatsappResponsavel && <button className="btn warning icon" onClick={() => abrirWhatsappComPersonalizacao(l.whatsappResponsavel, 'O tempo solicitado está acabando.')}>📣 Avisar</button>}
												<Link to={`/recibo/lancamento/${l.id}`}>
													<button className="btn icon">🖨️ Cupom</button>
												</Link>
												<Link to={`/pagamento/${l.id}`}><button className="btn primary icon">💳 Pagamento</button></Link>
											</>
										) : (
											<>
												<button className="btn icon" onClick={() => abrirWhatsappComPersonalizacao(l.whatsappResponsavel, 'Olá! Mensagem sobre seu atendimento no Parque Infantil.')} disabled={!l.whatsappResponsavel}>
													📱 Contato
												</button>
												<Link to={`/recibo/lancamento/${l.id}`}>
													<button className="btn icon">🖨️ Reimprimir Cupom</button>
												</Link>
												{l.status === 'pago' && (
													<Link to={`/recibo/pagamento/${l.id}`}>
														<button className="btn icon">🖨️ Reimprimir Recibo</button>
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


