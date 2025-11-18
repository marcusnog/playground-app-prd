import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, uid } from '../../services/mockDb'
import { usePermissions } from '../../hooks/usePermissions'

export default function LancamentoEstacionamento() {
	const [refresh, setRefresh] = useState(0)
	const estacionamentos = useMemo(() => db.get().estacionamentos, [refresh])
	const formasPagamento = useMemo(() => db.get().formasPagamento.filter(f => f.status === 'ativo'), [])
	const caixas = useMemo(() => db.get().caixas, [refresh])
	const navigate = useNavigate()
	const { hasPermission } = usePermissions()

	// Escutar mudanças no banco de dados
	useEffect(() => {
		function handleStorageChange() {
			setRefresh(prev => prev + 1)
		}
		
		window.addEventListener('storage', handleStorageChange)
		window.addEventListener('db-update', handleStorageChange)
		
		return () => {
			window.removeEventListener('storage', handleStorageChange)
			window.removeEventListener('db-update', handleStorageChange)
		}
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
	const estacionamento = useMemo(() => 
		form.estacionamentoId ? estacionamentos.find(e => e.id === form.estacionamentoId) : undefined,
		[estacionamentos, form.estacionamentoId]
	)

	const caixaEstacionamento = useMemo(() => {
		if (!estacionamento) return null
		return caixas.find(c => c.id === estacionamento.caixaId)
	}, [estacionamento, caixas])

	const caixaAberto = caixaEstacionamento?.status === 'aberto'

	// Valor do estacionamento
	const valor = estacionamento?.valor || 0

	// Hora atual
	const horaAtual = useMemo(() => {
		const agora = new Date()
		return agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
	}, [])

	function onSave() {
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

		let lancamentoId = ''
		db.update((d) => {
			lancamentoId = uid('est_lan')
			d.lancamentosEstacionamento.push({
				id: lancamentoId,
				estacionamentoId: estacionamento.id,
				placa: form.placa.trim().toUpperCase(),
				modelo: form.modelo.trim() || undefined,
				telefoneContato: form.telefoneContato.trim() || undefined,
				dataHora: new Date().toISOString(),
				valor: valor,
				formaPagamentoId: form.formaPagamentoId,
				status: 'pago', // Já pago no momento do lançamento
			})
		})

		alert('Lançamento salvo. Gerando cupom...')
		navigate(`/recibo/estacionamento/pagamento/${lancamentoId}`)
	}

	return (
		<div className="container" style={{ maxWidth: 860 }}>
			<h2>Lançamento de Estacionamento</h2>
			
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

			<div className="card form two" style={{ opacity: caixaAberto ? 1 : 0.6, pointerEvents: caixaAberto ? 'auto' : 'none' }}>
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
						disabled={!caixaAberto || !form.placa.trim() || !form.formaPagamentoId}
					>
						{caixaAberto ? '🧾 Salvar e Gerar Cupom' : '❌ Caixa Fechado'}
					</button>
				</div>
			</div>
		</div>
	)
}

