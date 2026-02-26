import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { estacionamentosService, formasPagamentoService, lancamentosEstacionamentoService } from '../../services/entitiesService'
import { useCaixa } from '../../hooks/useCaixa'
import { usePermissions } from '../../hooks/usePermissions'

export default function LancamentoEstacionamento() {
	const { caixas, refresh: refreshCaixas } = useCaixa()
	const [estacionamentos, setEstacionamentos] = useState<Awaited<ReturnType<typeof estacionamentosService.list>>>([])
	const [formasPagamento, setFormasPagamento] = useState<Awaited<ReturnType<typeof formasPagamentoService.list>>>([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const navigate = useNavigate()
	const { hasPermission } = usePermissions()

	useEffect(() => {
		async function load() {
			try {
				setLoading(true)
				setError(null)
				const [estData, formasData] = await Promise.all([
					estacionamentosService.list(),
					formasPagamentoService.list(),
				])
				setEstacionamentos(estData ?? [])
				setFormasPagamento((formasData ?? []).filter(f => f.status === 'ativo'))
			} catch (e) {
				console.error('Erro ao carregar dados:', e)
				setError('Erro ao carregar dados. Tente novamente.')
			} finally {
				setLoading(false)
			}
		}
		load()
	}, [])

	// Verificar permissão
	if (!hasPermission('estacionamento', 'lancamento')) {
		return (
			<div className="container" style={{ maxWidth: 860 }}>
				<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<h3 style={{ color: 'var(--danger)' }}>Acesso Negado</h3>
					<p>Você não tem permissão para acessar esta funcionalidade.</p>
				</div>
			</div>
		)
	}

	const [form, setForm] = useState({
		estacionamentoId: '',
		placa: '',
		modelo: '',
		telefoneContato: '',
		formaPagamentoId: '',
	})

	// Buscar estacionamento selecionado e verificar caixa
	const estacionamento = estacionamentos.find(e => e.id === form.estacionamentoId)

	const caixaEstacionamento = estacionamento
		? caixas.find(c => c.id === estacionamento.caixaId)
		: null

	const caixaAberto = caixaEstacionamento?.status === 'aberto'

	// Valor do estacionamento
	const valor = estacionamento?.valor ?? 0

	// Hora atual
	const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

	async function onSave() {
		if (!estacionamento) {
			return alert('Selecione um estacionamento')
		}
		if (!caixaAberto) {
			return alert('O caixa deste estacionamento está fechado. Abra o caixa primeiro.')
		}
		if (!form.placa.trim()) {
			return alert('A placa é obrigatória')
		}
		if (!form.formaPagamentoId) {
			return alert('Selecione uma forma de pagamento')
		}

		try {
			setSaving(true)
			setError(null)
			const created = await lancamentosEstacionamentoService.create({
				estacionamentoId: estacionamento.id,
				placa: form.placa.trim().toUpperCase(),
				modelo: form.modelo.trim() || undefined,
				telefoneContato: form.telefoneContato.trim() || undefined,
				valor,
			})
			// Backend cria com status 'aberto'; pagar para marcar como pago
			const lancamentoPago = await lancamentosEstacionamentoService.pagar(created.id, form.formaPagamentoId)
			await refreshCaixas()
			window.dispatchEvent(new Event('caixa:updated'))
			alert('Lançamento salvo. Gerando cupom...')
			navigate(`/recibo/estacionamento/pagamento/${lancamentoPago.id}`)
		} catch (e) {
			console.error('Erro ao salvar lançamento:', e)
			setError('Erro ao salvar lançamento. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<div className="container" style={{ maxWidth: 860 }}>
				<h2>Lançamento de Estacionamento</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 860 }}>
			<h2>Lançamento de Estacionamento</h2>
			{error && (
				<div className="card" style={{ marginBottom: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<p style={{ color: 'var(--danger)' }}>{error}</p>
				</div>
			)}
			
			{/* Status do Caixa */}
			{!caixaAberto && estacionamento && (
				<div className="card" style={{ marginBottom: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<div className="row center" style={{ gap: 8 }}>
						<span style={{ fontSize: '1.2rem' }}>⚠️</span>
						<div>
							<strong style={{ color: 'var(--danger)' }}>Caixa Fechado</strong>
							<div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
								O caixa do estacionamento está fechado. 
								<a href="/estacionamento/caixa/abertura" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Abrir caixa</a>
							</div>
						</div>
					</div>
				</div>
			)}

			{caixaAberto && estacionamento && (
				<div className="card" style={{ marginBottom: 16, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)' }}>
					<div className="row center" style={{ gap: 8 }}>
						<span style={{ fontSize: '1.2rem' }}>✅</span>
						<div>
							<strong style={{ color: 'var(--success)' }}>Caixa Aberto</strong>
							<div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
								Estacionamento: {estacionamento.nome} - Caixa: {caixaEstacionamento?.nome}
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="card form two" style={{ opacity: estacionamento && !caixaAberto ? 0.6 : 1 }}>
				<label className="field">
					<span>Estacionamento *</span>
					<select 
						className="select" 
						value={form.estacionamentoId} 
						onChange={(e) => setForm({ ...form, estacionamentoId: e.target.value })}
					>
						<option value="">Selecione um estacionamento...</option>
						{estacionamentos.map((e) => {
							const caixa = caixas.find(c => c.id === e.caixaId)
							return (
								<option key={e.id} value={e.id}>
									{e.nome} - R$ {e.valor.toFixed(2)} ({caixa?.status === 'aberto' ? 'Caixa Aberto' : 'Caixa Fechado'})
								</option>
							)
						})}
					</select>
				</label>

				<label className="field">
					<span>Placa *</span>
					<input 
						className="input" 
						value={form.placa} 
						onChange={(e) => setForm({ ...form, placa: e.target.value.toUpperCase() })} 
						placeholder="ABC1234"
						maxLength={7}
					/>
				</label>

				<label className="field">
					<span>Modelo do Veículo</span>
					<input 
						className="input" 
						value={form.modelo} 
						onChange={(e) => setForm({ ...form, modelo: e.target.value })} 
						placeholder="Ex: Honda Civic, Fiat Uno"
					/>
				</label>

				<label className="field">
					<span>Telefone de Contato</span>
					<input 
						className="input" 
						value={form.telefoneContato} 
						onChange={(e) => setForm({ ...form, telefoneContato: e.target.value })} 
						placeholder="5599999999999"
					/>
				</label>

				<label className="field">
					<span>Hora/Minuto</span>
					<input 
						className="input" 
						value={horaAtual} 
						readOnly 
					/>
					<span className="help">Hora atual do dispositivo</span>
				</label>

				<label className="field">
					<span>Valor (R$)</span>
					<input 
						className="input" 
						value={valor.toFixed(2)} 
						readOnly 
					/>
					<span className="help">Valor definido no cadastro do estacionamento</span>
				</label>

				<label className="field">
					<span>Forma de Pagamento *</span>
					<select 
						className="select" 
						value={form.formaPagamentoId} 
						onChange={(e) => setForm({ ...form, formaPagamentoId: e.target.value })}
					>
						<option value="">Selecione...</option>
						{formasPagamento.map((f) => (
							<option key={f.id} value={f.id}>
								{f.descricao}
							</option>
						))}
					</select>
				</label>

				<div className="actions" style={{ gridColumn: '1 / -1' }}>
					<strong style={{ marginRight: 'auto' }}>Valor: R$ {valor.toFixed(2)}</strong>
					<button 
						className="btn primary icon" 
						onClick={onSave}
						disabled={!caixaAberto || !form.placa.trim() || !form.formaPagamentoId || saving}
					>
						{saving ? 'Salvando...' : caixaAberto ? '🧾 Salvar e Gerar Cupom' : '❌ Caixa Fechado'}
					</button>
				</div>
			</div>
		</div>
	)
}
