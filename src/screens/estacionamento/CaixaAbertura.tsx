import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../services/mockDb'
import { usePermissions } from '../../hooks/usePermissions'

export default function CaixaAbertura() {
	const [_, force] = useState(0)
	const estacionamentos = useMemo(() => db.get().estacionamentos, [_])
	const caixas = useMemo(() => db.get().caixas, [_])
	const [estacionamentoSelecionado, setEstacionamentoSelecionado] = useState<string>('')
	const navigate = useNavigate()
	const { hasPermission } = usePermissions()

	// Verificar permissão
	if (!hasPermission('estacionamento', 'caixa', 'abertura')) {
		return (
			<div className="container" style={{ maxWidth: 600 }}>
				<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<h3 style={{ color: 'var(--danger)' }}>Acesso Negado</h3>
					<p>Você não tem permissão para acessar esta funcionalidade.</p>
				</div>
			</div>
		)
	}

	function refresh() { force((x) => x + 1 as unknown as number) }

	// Buscar caixa do estacionamento selecionado
	const estacionamento = useMemo(() => 
		estacionamentos.find(e => e.id === estacionamentoSelecionado),
		[estacionamentos, estacionamentoSelecionado]
	)
	
	const caixaEstacionamento = useMemo(() => {
		if (!estacionamento) return null
		return caixas.find(c => c.id === estacionamento.caixaId)
	}, [estacionamento, caixas])

	const caixaAberto = caixaEstacionamento?.status === 'aberto'

	function abrir() {
		if (!estacionamentoSelecionado) {
			return alert('Selecione um estacionamento')
		}
		if (!estacionamento) {
			return alert('Estacionamento não encontrado')
		}
		if (caixaAberto) {
			return alert('O caixa deste estacionamento já está aberto')
		}

		const caixaId = estacionamento.caixaId
		db.update((d) => {
			const caixa = d.caixas.find(c => c.id === caixaId)
			if (caixa) {
				caixa.status = 'aberto'
				caixa.data = new Date().toISOString()
				caixa.valorInicial = 0
				caixa.movimentos = []
			}
		})
		
		refresh()
		alert('Caixa do estacionamento aberto com sucesso!')
		navigate(`/recibo/estacionamento/abertura/${caixaId}`)
	}

	return (
		<div className="container" style={{ maxWidth: 600 }}>
			<h2>Abertura de Caixa - Estacionamento</h2>
			<div className="card">
				<h3>Informações do Caixa</h3>
				<div className="form">
					<label className="field">
						<span>Selecione o Estacionamento *</span>
						<select 
							className="select" 
							value={estacionamentoSelecionado} 
							onChange={(e) => setEstacionamentoSelecionado(e.target.value)}
						>
							<option value="">Selecione um estacionamento...</option>
							{estacionamentos.map((e) => {
								const caixa = caixas.find(c => c.id === e.caixaId)
								return (
									<option key={e.id} value={e.id}>
										{e.nome} - Caixa: {caixa?.nome || 'N/A'} ({caixa?.status === 'aberto' ? 'Aberto' : 'Fechado'})
									</option>
								)
							})}
						</select>
					</label>

					{estacionamento && caixaEstacionamento && (
						<>
							<div className="card" style={{ background: caixaAberto ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${caixaAberto ? 'var(--success)' : 'var(--danger)'}`, marginBottom: 16 }}>
								<div className="row center" style={{ gap: 8 }}>
									<span style={{ fontSize: '1.2rem' }}>{caixaAberto ? '✅' : '💰'}</span>
									<div>
										<strong style={{ color: caixaAberto ? 'var(--success)' : 'var(--danger)' }}>
											{caixaAberto ? 'Caixa Aberto' : 'Caixa Fechado'}
										</strong>
										<div className="subtitle">
											{caixaAberto 
												? `Caixa ${caixaEstacionamento.nome} aberto em ${new Date(caixaEstacionamento.data).toLocaleDateString('pt-BR')}`
												: `Caixa ${caixaEstacionamento.nome} fechado`
											}
										</div>
									</div>
								</div>
							</div>

							<label className="field">
								<span>Data</span>
								<input className="input" value={new Date().toLocaleDateString('pt-BR')} readOnly />
							</label>
						</>
					)}

					<div className="actions">
						<button 
							className="btn primary" 
							onClick={abrir} 
							disabled={!estacionamentoSelecionado || caixaAberto}
						>
							{caixaAberto ? 'Caixa já está aberto' : 'Abrir Caixa'}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

