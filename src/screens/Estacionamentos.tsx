import { useState, useEffect } from 'react'
import { useCaixa } from '../hooks/useCaixa'
import {
	estacionamentosService,
	lancamentosEstacionamentoService,
	type Estacionamento,
} from '../services/entitiesService'

export default function Estacionamentos() {
	const { caixas, loading: loadingCaixas, refresh: refreshCaixas } = useCaixa()
	const [estacionamentos, setEstacionamentos] = useState<Estacionamento[]>([])
	const [loadingEstacionamentos, setLoadingEstacionamentos] = useState(true)
	const [saving, setSaving] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [form, setForm] = useState({
		nome: '',
		caixaId: '',
		valor: 0,
	})

	async function loadEstacionamentos() {
		try {
			setLoadingEstacionamentos(true)
			const data = await estacionamentosService.list()
			setEstacionamentos(Array.isArray(data) ? data : [])
		} catch (err) {
			console.error('Erro ao carregar estacionamentos:', err)
			alert('Erro ao carregar estacionamentos. Tente novamente.')
		} finally {
			setLoadingEstacionamentos(false)
		}
	}

	useEffect(() => {
		loadEstacionamentos()
	}, [])

	async function refreshList() {
		await Promise.all([refreshCaixas(), loadEstacionamentos()])
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

	async function save() {
		if (!form.nome.trim()) {
			return alert('Preencha o nome do estacionamento')
		}
		if (!form.caixaId) {
			return alert('Selecione um caixa')
		}
		if (form.valor <= 0) {
			return alert('Informe um valor válido')
		}

		try {
			setSaving(true)
			if (editingId) {
				await estacionamentosService.update(editingId, {
					nome: form.nome.trim(),
					caixaId: form.caixaId,
					valor: form.valor,
				})
				alert('Estacionamento atualizado com sucesso!')
			} else {
				if (estacionamentos.some(e => e.nome.toLowerCase() === form.nome.trim().toLowerCase())) {
					return alert('Já existe um estacionamento com este nome')
				}
				await estacionamentosService.create({
					nome: form.nome.trim(),
					caixaId: form.caixaId,
					valor: form.valor,
				})
				alert('Estacionamento criado com sucesso!')
			}
			await refreshList()
			resetForm()
		} catch (error) {
			console.error('Erro ao salvar estacionamento:', error)
			alert('Erro ao salvar estacionamento. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	async function remove(id: string) {
		if (!confirm('Deseja realmente excluir este estacionamento?')) return

		try {
			const lancamentos = await lancamentosEstacionamentoService.list()
			const temLancamentos = lancamentos.some(l => l.estacionamentoId === id)
			if (temLancamentos) {
				return alert('Não é possível excluir um estacionamento que possui lançamentos associados.')
			}

			await estacionamentosService.delete(id)
			alert('Estacionamento excluído com sucesso!')
			await refreshList()
		} catch (error) {
			console.error('Erro ao excluir estacionamento:', error)
			alert('Erro ao excluir estacionamento. Tente novamente.')
		}
	}

	const loading = loadingCaixas || loadingEstacionamentos

	if (loading && estacionamentos.length === 0 && caixas.length === 0) {
		return (
			<div className="container" style={{ maxWidth: 1000 }}>
				<h2>Cadastro de Estacionamentos</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
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
						{caixas.length === 0 && !loadingCaixas && (
							<span className="help" style={{ color: 'var(--warning)' }}>
								Cadastre caixas em &quot;Cadastro de Caixas&quot; para poder criar estacionamentos.
							</span>
						)}
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
						<button className="btn" onClick={resetForm}>
							Cancelar
						</button>
					)}
					<button className="btn primary" onClick={save} disabled={saving || caixas.length === 0}>
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
											<td>
												<strong>{e.nome}</strong>
											</td>
											<td>{caixa ? caixa.nome : 'Caixa não encontrado'}</td>
											<td>R$ {e.valor.toFixed(2)}</td>
											<td>
												<div className="row" style={{ gap: 8 }}>
													<button className="btn" onClick={() => edit(e)}>
														✏️ Editar
													</button>
													<button className="btn" onClick={() => remove(e.id)}>
														🗑️ Excluir
													</button>
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
