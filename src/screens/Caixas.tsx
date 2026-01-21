import { useState } from 'react'
import { useCaixa } from '../hooks/useCaixa'
import { caixasService, type Caixa } from '../services/entitiesService'

export default function Caixas() {
	const { caixas, loading, refresh } = useCaixa()
	const [editingId, setEditingId] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [form, setForm] = useState({
		nome: '',
	})

	function resetForm() {
		setForm({ nome: '' })
		setEditingId(null)
	}

	function edit(caixa: Caixa) {
		setForm({ nome: caixa.nome })
		setEditingId(caixa.id)
	}

	async function save() {
		if (!form.nome.trim()) {
			return alert('Preencha o nome do caixa')
		}

		try {
			setSaving(true)
			if (editingId) {
				// Editar
				await caixasService.update(editingId, { nome: form.nome.trim() })
				alert('Caixa atualizado com sucesso!')
			} else {
				// Criar
				// Verificar se já existe um caixa com o mesmo nome
				if (caixas.some(c => c.nome.toLowerCase() === form.nome.trim().toLowerCase())) {
					return alert('Já existe um caixa com este nome')
				}
				
				await caixasService.create({
					nome: form.nome.trim(),
					data: new Date().toISOString().split('T')[0],
					valorInicial: 0,
					status: 'fechado',
					movimentos: []
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

	// Separar caixas abertos e fechados
	const caixasAbertos = caixas.filter(c => c.status === 'aberto')

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
							onChange={(e) => setForm({ nome: e.target.value })} 
							placeholder="Ex: Parquinho, Infláveis, Caixa 1"
						/>
						<span className="help">Nome identificador do caixa</span>
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
										<td>
											<div className="row" style={{ gap: 8 }}>
												<button className="btn" onClick={() => edit(c)} disabled>✏️ Editar</button>
												<button className="btn" onClick={() => remove(c.id)} disabled>🗑️ Excluir</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
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

