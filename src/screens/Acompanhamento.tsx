import { useEffect, useMemo, useState } from 'react'
import { db, calcularValor } from '../services/mockDb'
import { Link } from 'react-router-dom'

export default function Acompanhamento() {
	const [tick, setTick] = useState(0)
	const [filtroStatus, setFiltroStatus] = useState<'abertos' | 'encerrados'>('abertos')
	const d = db.get()
	const parametros = d.parametros
	const brinquedos = d.brinquedos
	
	const lancamentosFiltrados = useMemo(() => {
		if (filtroStatus === 'abertos') {
			return d.lancamentos.filter((l) => l.status === 'aberto')
		} else {
			return d.lancamentos.filter((l) => l.status === 'pago' || l.status === 'cancelado')
		}
	}, [tick, filtroStatus])

	useEffect(() => {
		const t = setInterval(() => setTick((x) => x + 1), 1000 * 30)
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
							const valor = calcularValor(parametros, l.tempoSolicitadoMin, brinquedo)
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


