import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { estacionamentosService, caixasService } from '../../services/entitiesService'
import { usePermissions } from '../../hooks/usePermissions'
import { useCaixa } from '../../hooks/useCaixa'
import type { Estacionamento } from '../../services/entitiesService'

export default function CaixaAbertura() {
	const { caixas, refresh: refreshCaixas, loading: loadingCaixas } = useCaixa()
	const [estacionamentos, setEstacionamentos] = useState<Estacionamento[]>([])
	const [loading, setLoading] = useState(true)
	const [estacionamentoSelecionado, setEstacionamentoSelecionado] = useState<string>('')
	const [saving, setSaving] = useState(false)
	const navigate = useNavigate()
	const { hasPermission } = usePermissions()

	useEffect(() => {
		async function loadEstacionamentos() {
			try {
				setLoading(true)
				const data = await estacionamentosService.list()
				setEstacionamentos(data)
			} catch (error) {
				console.error('Erro ao carregar estacionamentos:', error)
				alert('Erro ao carregar estacionamentos. Tente novamente.')
			} finally {
				setLoading(false)
			}
		}
		loadEstacionamentos()
	}, [])

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

	async function abrir() {
		if (!estacionamentoSelecionado) {
			return alert('Selecione um estacionamento')
		}
		if (!estacionamento) {
			return alert('Estacionamento não encontrado')
		}
		if (!estacionamento.caixaId) {
			return alert('Este estacionamento não possui um caixa configurado. Configure o caixa no cadastro de estacionamentos.')
		}
		if (!caixaEstacionamento) {
			return alert('Caixa configurado não encontrado. Verifique o cadastro de estacionamentos.')
		}
		if (caixaAberto) {
			return alert('O caixa deste estacionamento já está aberto')
		}

		try {
			setSaving(true)
			const caixaId = estacionamento.caixaId
			// Abrir o caixa usando o serviço de caixas
			await caixasService.abrir(caixaId, 0)
			await refreshCaixas()
			// Disparar evento para atualizar outros componentes
			window.dispatchEvent(new Event('caixa:updated'))
			alert('Caixa do estacionamento aberto com sucesso!')
			navigate(`/recibo/estacionamento/abertura/${caixaId}`)
		} catch (error) {
			console.error('Erro ao abrir caixa:', error)
			alert('Erro ao abrir caixa. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	if (loading || loadingCaixas) {
		return (
			<div className="container" style={{ maxWidth: 600 }}>
				<h2>Abertura de Caixa - Estacionamento</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
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
								<span>Caixa Configurado (Fixo)</span>
								<input 
									className="input" 
									value={caixaEstacionamento.nome} 
									readOnly 
									style={{ background: 'rgba(0, 0, 0, 0.05)', fontWeight: 'bold' }}
								/>
								<span className="help">Este caixa está fixo ao estacionamento e não pode ser alterado na abertura</span>
							</label>

							<label className="field">
								<span>Data</span>
								<input className="input" value={new Date().toLocaleDateString('pt-BR')} readOnly />
							</label>
						</>
					)}
					
					{estacionamento && !caixaEstacionamento && (
						<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', marginBottom: 16 }}>
							<div className="row center" style={{ gap: 8 }}>
								<span style={{ fontSize: '1.2rem' }}>⚠️</span>
								<div>
									<strong style={{ color: 'var(--danger)' }}>Caixa não encontrado</strong>
									<div className="subtitle">
										O estacionamento não possui um caixa configurado. Configure o caixa no cadastro de estacionamentos.
									</div>
								</div>
							</div>
						</div>
					)}

					<div className="actions">
						<button 
							className="btn primary" 
							onClick={abrir} 
							disabled={!estacionamentoSelecionado || caixaAberto || !caixaEstacionamento || saving}
						>
							{saving 
								? 'Abrindo...'
								: !estacionamentoSelecionado 
								? 'Selecione um estacionamento'
								: !caixaEstacionamento
								? 'Caixa não configurado'
								: caixaAberto 
								? 'Caixa já está aberto' 
								: 'Abrir Caixa'}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

