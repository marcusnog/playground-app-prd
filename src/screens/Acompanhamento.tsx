import { useEffect, useMemo, useState } from 'react'
import { calcularValor } from '../services/utils'
import { calcularValor as calcularValorDb, type Parametros, type Brinquedo } from '../services/mockDb'
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
									<th>Tempo</th>
									<th>Valor</th>
									<th>Status</th>
									<th style={{ width: 330 }}>Ações</th>
								</tr>
					</thead>
							<tbody>
								{lancamentosFiltrados.map((l) => {
							const dec = minutosDecorridos(l.dataHora)
							const alvo = l.tempoSolicitadoMin ?? Infinity
							const restante = isFinite(alvo) ? Math.max(0, alvo - dec) : Infinity
							const brinquedo = l.brinquedoId ? brinquedos.find(b => b.id === l.brinquedoId) : undefined
							const valor = parametros ? calcularValor(parametros as Parametros, l.tempoSolicitadoMin, brinquedo as Brinquedo | undefined) : l.valorCalculado
							const alerta = isFinite(restante) && restante <= 5
							return (
								<tr key={l.id} className={alerta ? 'highlight' : undefined}>
									<td>{l.nomeCrianca}</td>
									<td>{l.nomeResponsavel}</td>
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
												<button className="btn icon" onClick={() => abrirWhatsapp(l.whatsappResponsavel, 'Por favor, compareça ao local.')} disabled={!l.whatsappResponsavel}>📞 Chamar</button>
												{alerta && l.whatsappResponsavel && <button className="btn warning icon" onClick={() => abrirWhatsapp(l.whatsappResponsavel, 'O tempo solicitado está acabando.')}>📣 Avisar</button>}
												<Link to={`/pagamento/${l.id}`}><button className="btn primary icon">💳 Pagamento</button></Link>
											</>
										) : (
											<button className="btn icon" onClick={() => abrirWhatsapp(l.whatsappResponsavel, 'Olá! Mensagem sobre seu atendimento no Parque Infantil.')} disabled={!l.whatsappResponsavel}>
												📱 Contato
											</button>
										)}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}


