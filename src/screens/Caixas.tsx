import { useState, useEffect } from 'react'
import { useCaixa } from '../hooks/useCaixa'
import { usePermissions } from '../hooks/usePermissions'
import { caixasService, brinquedosService, type Caixa, type Brinquedo } from '../services/entitiesService'

function getDefaultSplitDataHora(): string {
	const d = new Date()
	d.setDate(d.getDate() - 1)
	d.setHours(23, 59, 0, 0)
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Caixas() {
	const { caixas, loading, refresh } = useCaixa()
	const { hasPermission } = usePermissions()
	const [brinquedos, setBrinquedos] = useState<Brinquedo[]>([])
	const [editingId, setEditingId] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [form, setForm] = useState({
		nome: '',
		bloqueado: false,
		brinquedoIds: [] as string[],
	})
	const [splitModal, setSplitModal] = useState<{ caixa: Caixa; splitDataHora: string } | null>(null)
	const [splitting, setSplitting] = useState(false)

	useEffect(() => {
		brinquedosService.list().then((data) => setBrinquedos(Array.isArray(data) ? data : [])).catch(() => {})
	}, [])

	function resetForm() {
		setForm({ nome: '', bloqueado: false, brinquedoIds: [] })
		setEditingId(null)
	}

	function edit(caixa: Caixa) {
		const ids = (caixa.brinquedos ?? [])
			.map((cb) => ('brinquedoId' in cb ? cb.brinquedoId : (cb as { brinquedo?: { id: string } }).brinquedo?.id))
			.filter((id): id is string => !!id)
		setForm({
			nome: caixa.nome,
			bloqueado: !!caixa.bloqueado,
			brinquedoIds: ids,
		})
		setEditingId(caixa.id)
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	function toggleBrinquedo(id: string) {
		setForm((f) => ({
			...f,
			brinquedoIds: f.brinquedoIds.includes(id) ? f.brinquedoIds.filter((b) => b !== id) : [...f.brinquedoIds, id],
		}))
	}

	async function save() {
		if (!form.nome.trim()) {
			return alert('Preencha o nome do caixa')
		}

		try {
			setSaving(true)
			if (editingId) {
				await caixasService.update(editingId, {
					nome: form.nome.trim(),
					bloqueado: form.bloqueado,
					brinquedoIds: form.brinquedoIds,
				})
				alert('Caixa atualizado com sucesso!')
			} else {
				if (caixas.some(c => c.nome.toLowerCase() === form.nome.trim().toLowerCase())) {
					return alert('Já existe um caixa com este nome')
				}
				await caixasService.create({
					nome: form.nome.trim(),
					data: new Date().toISOString().split('T')[0],
					valorInicial: 0,
					status: 'fechado',
					bloqueado: form.bloqueado,
					brinquedoIds: form.brinquedoIds,
				})
				alert('Caixa criado com sucesso!')
			}
			await refresh()
			resetForm()
		} catch (error) {
			console.error('Erro ao salvar caixa:', error)
			alert('Erro ao salvar caixa. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	async function remove(id: string) {
		const caixa = caixas.find(c => c.id === id)
		if (caixa?.status === 'aberto') {
			return alert('Não é possível excluir um caixa que está aberto. Feche o caixa primeiro.')
		}
		
		if (!confirm('Deseja realmente excluir este caixa?')) return
		
		try {
			await caixasService.delete(id)
			await refresh()
			alert('Caixa excluído com sucesso!')
		} catch (error) {
			console.error('Erro ao excluir caixa:', error)
			alert('Erro ao excluir caixa. Tente novamente.')
		}
	}

	async function executarSplit() {
		if (!splitModal) return
		const splitIso = new Date(splitModal.splitDataHora).toISOString()
		try {
			setSplitting(true)
			const resultado = await caixasService.split(splitModal.caixa.id, splitIso)
			await refresh()
			setSplitModal(null)
			const partes: string[] = []
			if (resultado.lancamentosMovidos > 0) partes.push(`${resultado.lancamentosMovidos} lançamento(s)`)
			if (resultado.estacionamentosMovidos > 0) partes.push(`${resultado.estacionamentosMovidos} estacionamento(s)`)
			if (resultado.movimentosMovidos > 0) partes.push(`${resultado.movimentosMovidos} movimento(s)`)
			const movidos = partes.length > 0 ? `\nRegistros movidos para nova sessão: ${partes.join(', ')}.` : '\nNenhum registro movido (todos anteriores ao corte).'
			alert(`Sessão separada com sucesso!${movidos}`)
		} catch (error: unknown) {
			const msg = (error as { message?: string })?.message ?? ''
			alert(msg || 'Erro ao separar sessão. Tente novamente.')
		} finally {
			setSplitting(false)
		}
	}

	// Separar caixas abertos e fechados
	const caixasAbertos = caixas.filter(c => c.status === 'aberto')
	const podeFechar = hasPermission('caixa', 'fechamento')

	if (loading && caixas.length === 0) {
		return (
			<div className="container" style={{ maxWidth: 1000 }}>
				<h2>Cadastro de Caixas</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 1000 }}>
			<h2>Cadastro de Caixas</h2>

			{/* Formulário */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>{editingId ? 'Editar Caixa' : 'Novo Caixa'}</h3>
				<div className="form">
					<label className="field">
						<span>Nome do Caixa *</span>
						<input 
							className="input" 
							value={form.nome} 
							onChange={(e) => setForm({ ...form, nome: e.target.value })} 
							placeholder="Ex: Parquinho, Infláveis, Caixa 1"
						/>
						<span className="help">Nome identificador do caixa</span>
					</label>

					<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<input
							type="checkbox"
							checked={form.bloqueado}
							onChange={(e) => setForm({ ...form, bloqueado: e.target.checked })}
						/>
						<span>Bloquear caixa (impede abertura)</span>
					</label>

					<label className="field">
						<span>Brinquedos deste caixa</span>
						<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
							{brinquedos.map((b) => (
								<label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
									<input
										type="checkbox"
										checked={form.brinquedoIds.includes(b.id)}
										onChange={() => toggleBrinquedo(b.id)}
									/>
									<span>{b.nome}</span>
								</label>
							))}
						</div>
						<span className="help">No lançamento, só aparecerão os brinquedos selecionados para o caixa em uso</span>
					</label>

					<div className="actions" style={{ marginTop: 16 }}>
						{editingId && (
							<button className="btn" onClick={resetForm} disabled={saving}>Cancelar</button>
						)}
						<button className="btn primary" onClick={save} disabled={saving}>
							{saving ? 'Salvando...' : editingId ? '💾 Atualizar' : '➕ Criar'}
						</button>
					</div>
				</div>
			</div>

			{/* Lista de Caixas Abertos */}
			{caixasAbertos.length > 0 && (
				<div className="card" style={{ marginBottom: 16 }}>
					<h3 style={{ color: 'var(--success)' }}>Caixas Abertos ({caixasAbertos.length})</h3>
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Nome</th>
									<th>Data de Abertura</th>
									<th>Valor Inicial</th>
									<th>Status</th>
									<th>Bloqueado</th>
									<th>Ações</th>
								</tr>
							</thead>
							<tbody>
								{caixasAbertos.map((c) => (
									<tr key={c.id}>
										<td><strong>{c.nome}</strong></td>
										<td>{new Date(c.data).toLocaleDateString('pt-BR')}</td>
										<td>R$ {c.valorInicial.toFixed(2)}</td>
										<td><span className="badge on">Aberto</span></td>
										<td>{c.bloqueado ? <span className="badge off">Sim</span> : 'Não'}</td>
										<td>
											<div className="row" style={{ gap: 8 }}>
												<button className="btn" onClick={() => edit(c)} disabled>✏️ Editar</button>
												<button className="btn" onClick={() => remove(c.id)} disabled>🗑️ Excluir</button>
												{podeFechar && (
													<button
														className="btn"
														style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--warning, #f59e0b)', color: 'var(--warning, #f59e0b)' }}
														onClick={() => setSplitModal({ caixa: c, splitDataHora: getDefaultSplitDataHora() })}
													>
														✂️ Separar Sessão
													</button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}

			{/* Modal Separar Sessão */}
			{splitModal && (
				<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
					<div className="card" style={{ width: '100%', maxWidth: 480, margin: 16 }}>
						<h3>✂️ Separar Sessão do Caixa</h3>
						<p style={{ color: 'var(--muted)', marginBottom: 16 }}>
							Caixa: <strong>{splitModal.caixa.nome}</strong>
						</p>
						<p style={{ marginBottom: 16, fontSize: '0.9rem' }}>
							Define o momento de corte. A sessão atual será fechada nesse horário e uma nova sessão será aberta logo em seguida. Lançamentos, estacionamentos e movimentos após o corte serão movidos para a nova sessão.
						</p>
						<div className="form">
							<label className="field">
								<span>Data e hora do corte *</span>
								<input
									className="input"
									type="datetime-local"
									value={splitModal.splitDataHora}
									onChange={(e) => setSplitModal({ ...splitModal, splitDataHora: e.target.value })}
								/>
								<span className="help">Padrão: ontem às 23:59. Ajuste conforme necessário.</span>
							</label>
							<div className="actions" style={{ marginTop: 16, gap: 8 }}>
								<button className="btn" onClick={() => setSplitModal(null)} disabled={splitting}>Cancelar</button>
								<button
									className="btn primary"
									onClick={executarSplit}
									disabled={splitting || !splitModal.splitDataHora}
									style={{ background: 'var(--warning, #f59e0b)', borderColor: 'var(--warning, #f59e0b)' }}
								>
									{splitting ? 'Separando...' : '✂️ Confirmar Separação'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Lista de Caixas Fechados */}
			<div className="card">
				<h3>Caixas Cadastrados ({caixas.length})</h3>
				{caixas.length === 0 ? (
					<div className="empty">Nenhum caixa cadastrado</div>
				) : (
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Nome</th>
									<th>Data de Criação</th>
									<th>Status</th>
									<th>Bloqueado</th>
									<th>Ações</th>
								</tr>
							</thead>
							<tbody>
								{caixas.map((c) => (
									<tr key={c.id}>
										<td><strong>{c.nome}</strong></td>
										<td>{new Date(c.data).toLocaleDateString('pt-BR')}</td>
										<td>
											{c.status === 'aberto' ? (
												<span className="badge on">Aberto</span>
											) : (
												<span className="badge off">Fechado</span>
											)}
										</td>
										<td>{c.bloqueado ? <span className="badge off">Sim</span> : 'Não'}</td>
										<td>
											<div className="row" style={{ gap: 8 }}>
												<button 
													className="btn" 
													onClick={() => edit(c)} 
													disabled={c.status === 'aberto'}
												>
													✏️ Editar
												</button>
												<button 
													className="btn" 
													onClick={() => remove(c.id)}
													disabled={c.status === 'aberto'}
												>
													🗑️ Excluir
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	)
}

