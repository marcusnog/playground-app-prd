import { useMemo, useState } from 'react'
import { db, type Estacionamento, uid } from '../services/mockDb'

export default function Estacionamentos() {
	const [refresh, setRefresh] = useState(0)
	const estacionamentos = useMemo(() => db.get().estacionamentos, [refresh])
	const caixas = useMemo(() => db.get().caixas, [refresh])
	const [editingId, setEditingId] = useState<string | null>(null)
	const [form, setForm] = useState({
		nome: '',
		caixaId: '',
		valor: 0,
	})

	function refreshList() {
		setRefresh(prev => prev + 1)
	}

	function resetForm() {
		setForm({ nome: '', caixaId: '', valor: 0 })
		setEditingId(null)
	}

	function edit(estacionamento: Estacionamento) {
		setForm({
			nome: estacionamento.nome,
			caixaId: estacionamento.caixaId,
			valor: estacionamento.valor,
		})
		setEditingId(estacionamento.id)
	}

	function save() {
		if (!form.nome.trim()) {
			return alert('Preencha o nome do estacionamento')
		}
		if (!form.caixaId) {
			return alert('Selecione um caixa')
		}
		if (form.valor <= 0) {
			return alert('Informe um valor válido')
		}

		if (editingId) {
			// Editar
			db.update((d) => {
				const est = d.estacionamentos.find(e => e.id === editingId)
				if (est) {
					est.nome = form.nome.trim()
					est.caixaId = form.caixaId
					est.valor = form.valor
				}
			})
			alert('Estacionamento atualizado com sucesso!')
		} else {
			// Criar
			if (estacionamentos.some(e => e.nome.toLowerCase() === form.nome.trim().toLowerCase())) {
				return alert('Já existe um estacionamento com este nome')
			}
			
			db.update((d) => {
				d.estacionamentos.push({
					id: uid('est'),
					nome: form.nome.trim(),
					caixaId: form.caixaId,
					valor: form.valor,
				})
			})
			alert('Estacionamento criado com sucesso!')
		}
		refreshList()
		resetForm()
	}

	function remove(id: string) {
		if (!confirm('Deseja realmente excluir este estacionamento?')) return
		
		// Verificar se há lançamentos associados
		const lancamentos = db.get().lancamentosEstacionamento
		const temLancamentos = lancamentos.some(l => l.estacionamentoId === id)
		if (temLancamentos) {
			return alert('Não é possível excluir um estacionamento que possui lançamentos associados.')
		}
		
		db.update((d) => {
			d.estacionamentos = d.estacionamentos.filter(e => e.id !== id)
		})
		refreshList()
	}

	return (
		<div className="container" style={{ maxWidth: 1000 }}>
			<h2>Cadastro de Estacionamentos</h2>

			{/* Formulário */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>{editingId ? 'Editar Estacionamento' : 'Novo Estacionamento'}</h3>
				<div className="form two">
					<label className="field">
						<span>Nome do Estacionamento *</span>
						<input 
							className="input" 
							value={form.nome} 
							onChange={(e) => setForm({ ...form, nome: e.target.value })} 
							placeholder="Ex: Estacionamento 1, Estacionamento Principal"
						/>
					</label>
					
					<label className="field">
						<span>Caixa *</span>
						<select 
							className="select" 
							value={form.caixaId} 
							onChange={(e) => setForm({ ...form, caixaId: e.target.value })}
						>
							<option value="">Selecione um caixa...</option>
							{caixas.map((c) => (
								<option key={c.id} value={c.id}>
									{c.nome}
								</option>
							))}
						</select>
						<span className="help">Selecione o caixa que será usado para este estacionamento</span>
					</label>
					
					<label className="field">
						<span>Valor do Estacionamento (R$) *</span>
						<input 
							className="input" 
							type="number" 
							value={form.valor} 
							onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} 
							step="0.01"
							min="0"
							placeholder="0.00"
						/>
						<span className="help">Valor padrão cobrado pelo estacionamento</span>
					</label>
				</div>

				<div className="actions" style={{ marginTop: 16 }}>
					{editingId && (
						<button className="btn" onClick={resetForm}>Cancelar</button>
					)}
					<button className="btn primary" onClick={save}>
						{editingId ? '💾 Atualizar' : '➕ Criar'}
					</button>
				</div>
			</div>

			{/* Lista de Estacionamentos */}
			<div className="card">
				<h3>Estacionamentos Cadastrados ({estacionamentos.length})</h3>
				{estacionamentos.length === 0 ? (
					<div className="empty">Nenhum estacionamento cadastrado</div>
				) : (
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Nome</th>
									<th>Caixa</th>
									<th>Valor (R$)</th>
									<th>Ações</th>
								</tr>
							</thead>
							<tbody>
								{estacionamentos.map((e) => {
									const caixa = caixas.find(c => c.id === e.caixaId)
									return (
										<tr key={e.id}>
											<td><strong>{e.nome}</strong></td>
											<td>{caixa ? caixa.nome : 'Caixa não encontrado'}</td>
											<td>R$ {e.valor.toFixed(2)}</td>
											<td>
												<div className="row" style={{ gap: 8 }}>
													<button className="btn" onClick={() => edit(e)}>✏️ Editar</button>
													<button className="btn" onClick={() => remove(e.id)}>🗑️ Excluir</button>
												</div>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	)
}

