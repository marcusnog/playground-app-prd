import { useMemo, useState } from 'react'
import { db, Brinquedo, uid, type RegrasCobranca } from '../services/mockDb'

export default function Brinquedos() {
	const [_, force] = useState(0)
	const brinquedos = useMemo(() => db.get().brinquedos, [_])
	const [nome, setNome] = useState('')
	const [editId, setEditId] = useState<string | null>(null)
	const [editNome, setEditNome] = useState('')
	
	// Campos de regras de cobrança
	const [inicialMinutos, setInicialMinutos] = useState<number | null>(30)
	const [valorInicial, setValorInicial] = useState(20)
	const [cicloMinutos, setCicloMinutos] = useState<number | null>(15)
	const [valorCiclo, setValorCiclo] = useState(10)
	const [taxaUnica, setTaxaUnica] = useState(false)

	function refresh() { force((x) => x + 1 as unknown as number) }

	function add() {
		if (!nome.trim()) return alert('Informe o nome do brinquedo')
		
		const regras: RegrasCobranca = taxaUnica 
			? {
				inicialMinutos: null, // Taxa única sem limite
				valorInicial: valorInicial,
				cicloMinutos: null,
				valorCiclo: 0
			}
			: {
				inicialMinutos: inicialMinutos,
				valorInicial: valorInicial,
				cicloMinutos: cicloMinutos,
				valorCiclo: valorCiclo
			}
		
		db.update((d) => {
			d.brinquedos.push({ 
				id: uid('bq'), 
				nome: nome.trim(),
				regrasCobranca: regras
			})
		})
		
		// Reset form
		setNome('')
		setInicialMinutos(30)
		setValorInicial(20)
		setCicloMinutos(15)
		setValorCiclo(10)
		setTaxaUnica(false)
		refresh()
	}

	function iniciarEdicao(item: Brinquedo) {
		setEditId(item.id)
		setEditNome(item.nome)
		
		if (item.regrasCobranca) {
			const r = item.regrasCobranca
			setInicialMinutos(r.inicialMinutos)
			setValorInicial(r.valorInicial)
			setCicloMinutos(r.cicloMinutos)
			setValorCiclo(r.valorCiclo)
			setTaxaUnica(r.inicialMinutos === null)
		} else {
			setInicialMinutos(30)
			setValorInicial(20)
			setCicloMinutos(15)
			setValorCiclo(10)
			setTaxaUnica(false)
		}
	}

	function cancelarEdicao() {
		setEditId(null)
		setEditNome('')
		setInicialMinutos(30)
		setValorInicial(20)
		setCicloMinutos(15)
		setValorCiclo(10)
		setTaxaUnica(false)
	}

	function salvarEdicao(id: string) {
		const nomeLimpo = editNome.trim()
		if (!nomeLimpo) return alert('Informe o nome do brinquedo')
		
		const regras: RegrasCobranca = taxaUnica 
			? {
				inicialMinutos: null,
				valorInicial: valorInicial,
				cicloMinutos: null,
				valorCiclo: 0
			}
			: {
				inicialMinutos: inicialMinutos,
				valorInicial: valorInicial,
				cicloMinutos: cicloMinutos,
				valorCiclo: valorCiclo
			}
		
		db.update((d) => {
			const item = d.brinquedos.find((x) => x.id === id)
			if (item) {
				item.nome = nomeLimpo
				item.regrasCobranca = regras
			}
		})
		cancelarEdicao()
		refresh()
	}

	function remover(id: string) {
		const temUso = db.get().lancamentos.some((l) => l.brinquedoId === id)
		if (temUso) return alert('Não é possível excluir: existem lançamentos vinculados a este brinquedo.')
		if (!confirm('Excluir este brinquedo?')) return
		db.update((d) => {
			d.brinquedos = d.brinquedos.filter((x) => x.id !== id)
		})
		refresh()
	}

	function formatarRegras(brinquedo: Brinquedo): string {
		if (!brinquedo.regrasCobranca) return 'Usa regras globais'
		const r = brinquedo.regrasCobranca
		if (r.inicialMinutos === null) {
			return `Taxa única: R$ ${r.valorInicial.toFixed(2)}`
		}
		if (r.cicloMinutos === null) {
			return `Inicial: ${r.inicialMinutos}min - R$ ${r.valorInicial.toFixed(2)}`
		}
		return `Inicial: ${r.inicialMinutos}min (R$ ${r.valorInicial.toFixed(2)}) + Ciclo: ${r.cicloMinutos}min (R$ ${r.valorCiclo.toFixed(2)})`
	}

	return (
		<div className="container medium">
			<h2>Brinquedos</h2>
			<p className="subtitle">Configure regras de cobrança específicas para cada brinquedo</p>
			
			{/* Formulário de Cadastro/Edição */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>{editId ? 'Editar Brinquedo' : 'Novo Brinquedo'}</h3>
				<div className="form">
					<label className="field">
						<span>Nome do Brinquedo</span>
						<input 
							className="input" 
							placeholder="Ex: Pula-pula, Escorregador..." 
							value={editId ? editNome : nome} 
							onChange={(e) => editId ? setEditNome(e.target.value) : setNome(e.target.value)} 
						/>
					</label>
					
					<div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--primary)' }}>
						<h4>Regras de Cobrança</h4>
						
						<label className="field">
							<div className="row">
								<input 
									type="checkbox" 
									checked={taxaUnica} 
									onChange={(e) => {
										setTaxaUnica(e.target.checked)
										if (e.target.checked) {
											setInicialMinutos(null)
											setCicloMinutos(null)
										} else {
											setInicialMinutos(30)
											setCicloMinutos(15)
										}
									}} 
								/>
								<span><strong>Taxa única sem limite de tempo</strong></span>
							</div>
						</label>
						
						{!taxaUnica && (
							<div className="form two">
								<label className="field">
									<span>Inicial (minutos)</span>
									<input 
										type="number" 
										className="input" 
										value={inicialMinutos ?? ''} 
										onChange={(e) => setInicialMinutos(e.target.value ? Number(e.target.value) : null)}
										min="1"
									/>
								</label>
								<label className="field">
									<span>Valor inicial (R$)</span>
									<input 
										type="number" 
										className="input" 
										value={valorInicial} 
										onChange={(e) => setValorInicial(Number(e.target.value))}
										step="0.01"
										min="0"
									/>
								</label>
								<label className="field">
									<span>Ciclo (minutos) - Deixe vazio para não usar ciclos</span>
									<input 
										type="number" 
										className="input" 
										value={cicloMinutos ?? ''} 
										onChange={(e) => setCicloMinutos(e.target.value ? Number(e.target.value) : null)}
										min="1"
										placeholder="Opcional"
									/>
								</label>
								<label className="field">
									<span>Valor ciclo (R$)</span>
									<input 
										type="number" 
										className="input" 
										value={valorCiclo} 
										onChange={(e) => setValorCiclo(Number(e.target.value))}
										step="0.01"
										min="0"
										disabled={cicloMinutos === null}
									/>
								</label>
							</div>
						)}
						
						{taxaUnica && (
							<label className="field">
								<span>Valor da Taxa Única (R$)</span>
								<input 
									type="number" 
									className="input" 
									value={valorInicial} 
									onChange={(e) => setValorInicial(Number(e.target.value))}
									step="0.01"
									min="0"
								/>
							</label>
						)}
					</div>
					
					<div className="actions">
						{editId ? (
							<>
								<button className="btn" onClick={cancelarEdicao}>Cancelar</button>
								<button className="btn primary" onClick={() => salvarEdicao(editId)}>Salvar</button>
							</>
						) : (
							<button className="btn primary" onClick={add}>Adicionar Brinquedo</button>
						)}
					</div>
				</div>
			</div>

			{/* Lista de Brinquedos */}
			<div className="card">
				<h3>Brinquedos Cadastrados ({brinquedos.length})</h3>
				{brinquedos.length === 0 ? (
					<div className="empty">
						<p>Nenhum brinquedo cadastrado</p>
						<p className="hint">Adicione um brinquedo acima para começar</p>
					</div>
				) : (
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Nome</th>
									<th>Regras de Cobrança</th>
									<th style={{ width: 200 }}>Ações</th>
								</tr>
							</thead>
							<tbody>
								{brinquedos.map((b) => (
									<tr key={b.id}>
										<td><strong>{b.nome}</strong></td>
										<td><span className="subtitle">{formatarRegras(b)}</span></td>
										<td className="row">
											<button className="btn icon" onClick={() => iniciarEdicao(b)}>✏️ Editar</button>
											<button className="btn icon" onClick={() => remover(b.id)}>🗑️ Excluir</button>
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
