import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, uid, calcularValor, Parametros } from '../services/mockDb'

export default function Lancamento() {
	const brinquedos = useMemo(() => db.get().brinquedos, [])
	const parametros = useMemo(() => db.get().parametros, [])
	const clientes = useMemo(() => db.get().clientes, [])
	const caixas = useMemo(() => db.get().caixas, [])
	const caixaAberto = useMemo(() => caixas.find((c) => c.status === 'aberto'), [caixas])
	const navigate = useNavigate()
	const [form, setForm] = useState({
		clienteId: '',
		nomeCrianca: '',
		nomeResponsavel: '',
		whatsappResponsavel: '',
		numeroPulseira: '',
		brinquedoId: '',
		tempoSolicitadoMin: 30,
		tempoLivre: false,
	})

	const brinquedoSelecionado = useMemo(() => 
		form.brinquedoId ? brinquedos.find(b => b.id === form.brinquedoId) : undefined,
		[form.brinquedoId, brinquedos]
	)
	
	const valor = useMemo(() => 
		calcularValor(
			parametros as Parametros, 
			form.tempoLivre ? null : form.tempoSolicitadoMin,
			brinquedoSelecionado
		), 
		[form.tempoSolicitadoMin, form.tempoLivre, parametros, brinquedoSelecionado]
	)

	function selecionarCliente(clienteId: string) {
		if (!clienteId) {
			setForm({ ...form, clienteId: '', nomeCrianca: '', nomeResponsavel: '', whatsappResponsavel: '' })
			return
		}
		const cliente = clientes.find(c => c.id === clienteId)
		if (cliente) {
			setForm({
				...form,
				clienteId: cliente.id,
				nomeCrianca: cliente.nomeCompleto,
				nomeResponsavel: cliente.nomePai || cliente.nomeMae || '',
				whatsappResponsavel: cliente.telefoneWhatsapp
			})
		}
	}

	function onSave() {
		if (!caixaAberto) {
			alert('Não é possível fazer lançamentos com o caixa fechado. Abra o caixa primeiro.')
			return
		}
		if (!form.nomeCrianca.trim() || !form.nomeResponsavel.trim()) return alert('Preencha os nomes')
		db.update((d) => {
			d.lancamentos.push({
				id: uid('lan'),
				dataHora: new Date().toISOString(),
				nomeCrianca: form.nomeCrianca.trim(),
				nomeResponsavel: form.nomeResponsavel.trim(),
				whatsappResponsavel: form.whatsappResponsavel.trim(),
				numeroPulseira: form.numeroPulseira.trim() || undefined,
				brinquedoId: form.brinquedoId || undefined,
				clienteId: form.clienteId || undefined,
				tempoSolicitadoMin: form.tempoLivre ? null : form.tempoSolicitadoMin,
				status: 'aberto',
				valorCalculado: valor,
			})
		})
		alert('Lançamento salvo. Gerando cupom...')
		const lancamentos = db.get().lancamentos
		navigate(`/recibo/lancamento/${lancamentos[lancamentos.length - 1]?.id}`)
	}

	return (
		<div className="container" style={{ maxWidth: 860 }}>
			<h2>Novo Lançamento</h2>
			
			{/* Status do Caixa */}
			{!caixaAberto && (
				<div className="card" style={{ marginBottom: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<div className="row center" style={{ gap: 8 }}>
						<span style={{ fontSize: '1.2rem' }}>⚠️</span>
						<div>
							<strong style={{ color: 'var(--danger)' }}>Caixa Fechado</strong>
							<div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
								É necessário abrir o caixa antes de fazer lançamentos. 
								<a href="/caixa/abertura" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Ir para Abertura</a>
							</div>
						</div>
					</div>
				</div>
			)}

			{caixaAberto && (
				<div className="card" style={{ marginBottom: 16, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)' }}>
					<div className="row center" style={{ gap: 8 }}>
						<span style={{ fontSize: '1.2rem' }}>✅</span>
						<div>
							<strong style={{ color: 'var(--success)' }}>Caixa Aberto</strong>
							<div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
								Lançamentos permitidos. Caixa aberto em {new Date(caixaAberto.data).toLocaleDateString('pt-BR')}
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="card form two" style={{ opacity: caixaAberto ? 1 : 0.6, pointerEvents: caixaAberto ? 'auto' : 'none' }}>
				<div>
					<label className="field">
						<span>Cliente Cadastrado (Opcional)</span>
						<select 
							className="select" 
							value={form.clienteId} 
							onChange={(e) => selecionarCliente(e.target.value)}
						>
							<option value="">Selecione um cliente cadastrado...</option>
							{clientes.map((c) => (
								<option key={c.id} value={c.id}>
									{c.nomeCompleto} - {new Date(c.dataNascimento).toLocaleDateString('pt-BR')}
								</option>
							))}
						</select>
						<span className="help">Selecione um cliente cadastrado para preencher automaticamente</span>
					</label>
					<label className="field">
						<span>Data/Hora</span>
						<input className="input" value={new Date().toLocaleString()} readOnly />
					</label>
					<label className="field">
						<span>Número da pulseira</span>
						<input className="input" value={form.numeroPulseira} onChange={(e) => setForm({ ...form, numeroPulseira: e.target.value })} />
					</label>
				</div>
				<div>
					<label className="field">
						<span>Nome da criança *</span>
						<input className="input" value={form.nomeCrianca} onChange={(e) => setForm({ ...form, nomeCrianca: e.target.value })} />
					</label>
					<label className="field">
						<span>Nome do responsável *</span>
						<input className="input" value={form.nomeResponsavel} onChange={(e) => setForm({ ...form, nomeResponsavel: e.target.value })} />
					</label>
				</div>
				<div>
					<label className="field">
						<span>WhatsApp do responsável</span>
						<input className="input" value={form.whatsappResponsavel} onChange={(e) => setForm({ ...form, whatsappResponsavel: e.target.value })} placeholder="5599999999999" />
					</label>
					<label className="field">
						<span>Brinquedo</span>
						<select className="select" value={form.brinquedoId} onChange={(e) => setForm({ ...form, brinquedoId: e.target.value })}>
							<option value="">(opcional)</option>
							{brinquedos.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
						</select>
					</label>
				</div>
				<div>
					<label className="field">
						<span>Tempo Solicitado (minutos)</span>
						<input className="input" type="number" disabled={form.tempoLivre} value={form.tempoSolicitadoMin} onChange={(e) => setForm({ ...form, tempoSolicitadoMin: Number(e.target.value) })} />
					</label>
					<label className="field">
						<span>Tempo Livre</span>
						<div className="row"><input type="checkbox" checked={form.tempoLivre} onChange={(e) => setForm({ ...form, tempoLivre: e.target.checked })} /> <span>Ativar</span></div>
					</label>
				</div>
				<div className="actions" style={{ gridColumn: '1 / -1' }}>
					<strong style={{ marginRight: 'auto' }}>Valor: R$ {valor.toFixed(2)}</strong>
					<button 
						className="btn primary icon" 
						onClick={onSave}
						disabled={!caixaAberto}
					>
						{caixaAberto ? '🧾 Salvar e Gerar Cupom' : '❌ Caixa Fechado'}
					</button>
				</div>
			</div>
		</div>
	)
}


