import { useCallback, useEffect, useState } from 'react'
import { brinquedosService, lancamentosService } from '../services/entitiesService'
import type { Brinquedo as BrinquedoType } from '../services/entitiesService'

export default function Brinquedos() {
	const [brinquedos, setBrinquedos] = useState<BrinquedoType[]>([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [nome, setNome] = useState('')
	const [editId, setEditId] = useState<string | null>(null)
	const [editNome, setEditNome] = useState('')

	const [inicialMinutos, setInicialMinutos] = useState<number | null>(30)
	const [valorInicial, setValorInicial] = useState(20)
	const [cicloMinutos, setCicloMinutos] = useState<number | null>(15)
	const [valorCiclo, setValorCiclo] = useState(10)
	const [taxaUnica, setTaxaUnica] = useState(false)

	const load = useCallback(async () => {
		setLoading(true)
		try {
			const list = await brinquedosService.list()
			setBrinquedos(Array.isArray(list) ? list : [])
		} catch (e) {
			console.error(e)
			setBrinquedos([])
			alert('Erro ao carregar brinquedos.')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		load()
	}, [load])

	function getPayload(): { nome: string; valorInicial: number; inicialMinutos: number | null; cicloMinutos: number | null; valorCiclo: number } {
		return taxaUnica
			? { nome: nome.trim(), valorInicial, inicialMinutos: null, cicloMinutos: null, valorCiclo: 0 }
			: { nome: nome.trim(), valorInicial, inicialMinutos, cicloMinutos, valorCiclo }
	}

	function getEditPayload(): { nome: string; valorInicial: number; inicialMinutos: number | null; cicloMinutos: number | null; valorCiclo: number } {
		return taxaUnica
			? { nome: editNome.trim(), valorInicial, inicialMinutos: null, cicloMinutos: null, valorCiclo: 0 }
			: { nome: editNome.trim(), valorInicial, inicialMinutos, cicloMinutos, valorCiclo }
	}

	async function add() {
		if (!nome.trim()) return alert('Informe o nome do brinquedo')
		setSaving(true)
		try {
			const payload = getPayload()
			await brinquedosService.create({
				nome: payload.nome,
				valorInicial: payload.valorInicial,
				inicialMinutos: payload.inicialMinutos ?? undefined,
				cicloMinutos: payload.cicloMinutos ?? undefined,
				valorCiclo: payload.valorCiclo,
			} as Parameters<typeof brinquedosService.create>[0])
			setNome('')
			setInicialMinutos(30)
			setValorInicial(20)
			setCicloMinutos(15)
			setValorCiclo(10)
			setTaxaUnica(false)
			load()
		} catch (e: unknown) {
			const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Erro ao adicionar'
			alert(msg)
		} finally {
			setSaving(false)
		}
	}

	function iniciarEdicao(item: BrinquedoType) {
		setEditId(item.id)
		setEditNome(item.nome)
		const r = item.regrasCobranca
		if (r) {
			setInicialMinutos(r.inicialMinutos ?? 30)
			setValorInicial(r.valorInicial)
			setCicloMinutos(r.cicloMinutos ?? 15)
			setValorCiclo(r.valorCiclo)
			setTaxaUnica(r.inicialMinutos === null)
		} else {
			const ini = (item as { inicialMinutos?: number | null }).inicialMinutos
			const cic = (item as { cicloMinutos?: number | null }).cicloMinutos
			const vi = (item as { valorInicial?: number }).valorInicial ?? 20
			const vc = (item as { valorCiclo?: number }).valorCiclo ?? 10
			setInicialMinutos(ini ?? 30)
			setValorInicial(vi)
			setCicloMinutos(cic ?? 15)
			setValorCiclo(vc)
			setTaxaUnica(ini === null)
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

	async function salvarEdicao(id: string) {
		const nomeLimpo = editNome.trim()
		if (!nomeLimpo) return alert('Informe o nome do brinquedo')
		setSaving(true)
		try {
			const payload = getEditPayload()
			await brinquedosService.update(id, {
				nome: payload.nome,
				valorInicial: payload.valorInicial,
				inicialMinutos: payload.inicialMinutos ?? undefined,
				cicloMinutos: payload.cicloMinutos ?? undefined,
				valorCiclo: payload.valorCiclo,
			} as Parameters<typeof brinquedosService.update>[1])
			cancelarEdicao()
			load()
		} catch (e: unknown) {
			const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Erro ao salvar'
			alert(msg)
		} finally {
			setSaving(false)
		}
	}

	async function remover(id: string) {
		try {
			const lancamentos = await lancamentosService.list()
			const temUso = (lancamentos || []).some((l: { brinquedoId?: string }) => l.brinquedoId === id)
			if (temUso) return alert('Não é possível excluir: existem lançamentos vinculados a este brinquedo.')
			if (!confirm('Excluir este brinquedo?')) return
			await brinquedosService.delete(id)
			if (editId === id) cancelarEdicao()
			load()
		} catch (e: unknown) {
			const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Erro ao excluir'
			alert(msg)
		}
	}

	function formatarRegras(b: BrinquedoType): string {
		const r = b.regrasCobranca
		if (r) {
			if (r.inicialMinutos === null) return `Taxa única: R$ ${r.valorInicial.toFixed(2)}`
			if (r.cicloMinutos === null) return `Inicial: ${r.inicialMinutos}min - R$ ${r.valorInicial.toFixed(2)}`
			return `Inicial: ${r.inicialMinutos}min (R$ ${r.valorInicial.toFixed(2)}) + Ciclo: ${r.cicloMinutos}min (R$ ${r.valorCiclo.toFixed(2)})`
		}
		const ini = (b as { inicialMinutos?: number | null }).inicialMinutos
		const vi = (b as { valorInicial?: number }).valorInicial ?? 0
		const cic = (b as { cicloMinutos?: number | null }).cicloMinutos
		const vc = (b as { valorCiclo?: number }).valorCiclo ?? 0
		if (ini === null || ini === undefined) return `Taxa única: R$ ${vi.toFixed(2)}`
		if (cic === null || cic === undefined) return `Inicial: ${ini}min - R$ ${vi.toFixed(2)}`
		return `Inicial: ${ini}min (R$ ${vi.toFixed(2)}) + Ciclo: ${cic}min (R$ ${vc.toFixed(2)})`
	}

	return (
		<div className="container medium">
			<h2>Brinquedos</h2>
			<p className="subtitle">Configure regras de cobrança específicas para cada brinquedo</p>

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
								<button className="btn primary" onClick={() => salvarEdicao(editId)} disabled={saving}>{saving ? '...' : 'Salvar'}</button>
							</>
						) : (
							<button className="btn primary" onClick={add} disabled={saving}>{saving ? '...' : 'Adicionar Brinquedo'}</button>
						)}
					</div>
				</div>
			</div>

			<div className="card">
				<h3>Brinquedos Cadastrados ({brinquedos.length})</h3>
				{loading ? (
					<div className="empty">Carregando...</div>
				) : brinquedos.length === 0 ? (
					<div className="empty">
						<p>Nenhum brinquedo cadastrado</p>
						<p className="hint">Adicione um brinquedo acima para começar. Eles aparecerão no Lançamento.</p>
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
