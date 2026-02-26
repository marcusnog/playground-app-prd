import { useEffect, useState } from 'react'
import { PaymentIcon, resolvePaymentKind } from '../ui/icons'
import { formasPagamentoService } from '../services/entitiesService'
import type { FormaPagamento } from '../services/entitiesService'

export default function FormasPagamento() {
	const [formas, setFormas] = useState<FormaPagamento[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [descricao, setDescricao] = useState('')
	const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo')
	const [editId, setEditId] = useState<string | null>(null)
	const [editDescricao, setEditDescricao] = useState('')
	const [editStatus, setEditStatus] = useState<'ativo' | 'inativo'>('ativo')
	const [editPixChave, setEditPixChave] = useState('')
	const [editPixConta, setEditPixConta] = useState('')

	async function refresh() {
		try {
			setLoading(true)
			setError(null)
			const data = await formasPagamentoService.list()
			setFormas(data ?? [])
		} catch (e) {
			console.error('Erro ao carregar formas de pagamento:', e)
			setError('Erro ao carregar formas de pagamento.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		refresh()
	}, [])

	async function add() {
		if (!descricao.trim()) return alert('Informe a descrição')
		try {
			setError(null)
			await formasPagamentoService.create({
				descricao: descricao.trim(),
				status,
				pixChave: descricao.toLowerCase().includes('pix') ? '' : undefined,
				pixConta: descricao.toLowerCase().includes('pix') ? '' : undefined
			})
			setDescricao('')
			setStatus('ativo')
			await refresh()
		} catch (e) {
			console.error('Erro ao adicionar forma de pagamento:', e)
			setError('Erro ao adicionar. Tente novamente.')
		}
	}

	function iniciarEdicao(forma: FormaPagamento) {
		setEditId(forma.id)
		setEditDescricao(forma.descricao)
		setEditStatus(forma.status)
		setEditPixChave(forma.pixChave || '')
		setEditPixConta(forma.pixConta || '')
	}

	function cancelarEdicao() {
		setEditId(null)
		setEditDescricao('')
		setEditStatus('ativo')
		setEditPixChave('')
		setEditPixConta('')
	}

	async function salvarEdicao(id: string) {
		if (!editDescricao.trim()) return alert('Informe a descrição')
		try {
			setError(null)
			await formasPagamentoService.update(id, {
				descricao: editDescricao.trim(),
				status: editStatus,
				pixChave: editDescricao.toLowerCase().includes('pix') ? (editPixChave.trim() || undefined) : undefined,
				pixConta: editDescricao.toLowerCase().includes('pix') ? (editPixConta.trim() || undefined) : undefined
			})
			cancelarEdicao()
			await refresh()
		} catch (e) {
			console.error('Erro ao salvar forma de pagamento:', e)
			setError('Erro ao salvar. Tente novamente.')
		}
	}

	async function toggle(id: string) {
		const forma = formas.find(f => f.id === id)
		if (!forma) return
		const novoStatus = forma.status === 'ativo' ? 'inativo' : 'ativo'
		try {
			setError(null)
			await formasPagamentoService.update(id, { status: novoStatus })
			await refresh()
		} catch (e) {
			console.error('Erro ao alterar status:', e)
			setError('Erro ao alterar status. Tente novamente.')
		}
	}

	const isPix = (descricao: string) => descricao.toLowerCase().includes('pix')

	if (loading && formas.length === 0) {
		return (
			<div className="container medium">
				<h2>Formas de Pagamento</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	return (
		<div className="container medium">
			<h2>Formas de Pagamento</h2>
			<p className="subtitle">Gerencie as formas de pagamento aceitas e configure o PIX</p>
			{error && (
				<div className="card" style={{ marginBottom: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<p style={{ color: 'var(--danger)' }}>{error}</p>
				</div>
			)}
			
			{/* Formulário de Cadastro/Edição */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>{editId ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</h3>
				<div className="form">
					<label className="field">
						<span>Descrição</span>
						<input 
							className="input" 
							placeholder="Ex: Dinheiro, PIX, Débito, Crédito..." 
							value={editId ? editDescricao : descricao} 
							onChange={(e) => editId ? setEditDescricao(e.target.value) : setDescricao(e.target.value)} 
						/>
					</label>
					
					<label className="field">
						<span>Status</span>
						<select 
							className="select" 
							value={editId ? editStatus : status} 
							onChange={(e) => editId ? setEditStatus(e.target.value as 'ativo' | 'inativo') : setStatus(e.target.value as 'ativo' | 'inativo')}
						>
							<option value="ativo">Ativo</option>
							<option value="inativo">Inativo</option>
						</select>
					</label>
					
					{isPix(editId ? editDescricao : descricao) && (
						<div className="card" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6' }}>
							<h4>Configuração PIX para QR Code</h4>
							<label className="field">
								<span>Chave PIX</span>
								<input 
									type="text" 
									className="input" 
									placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória" 
									value={editId ? editPixChave : ''} 
									onChange={(e) => editId ? setEditPixChave(e.target.value) : undefined}
								/>
								<span className="help">Chave PIX para geração do QR Code</span>
							</label>
							<label className="field">
								<span>Conta/Identificação</span>
								<input 
									type="text" 
									className="input" 
									placeholder="Nome da conta ou identificação" 
									value={editId ? editPixConta : ''} 
									onChange={(e) => editId ? setEditPixConta(e.target.value) : undefined}
								/>
								<span className="help">Informação adicional para identificação da conta</span>
							</label>
						</div>
					)}
					
					<div className="actions">
						{editId ? (
							<>
								<button className="btn" onClick={cancelarEdicao}>Cancelar</button>
								<button className="btn primary" onClick={() => salvarEdicao(editId)}>Salvar</button>
							</>
						) : (
							<button className="btn primary" onClick={add}>Adicionar Forma de Pagamento</button>
						)}
					</div>
				</div>
			</div>

			{/* Lista de Formas de Pagamento */}
			<div className="card">
				<h3>Formas de Pagamento Cadastradas ({formas.length})</h3>
				{formas.length === 0 ? (
					<div className="empty">
						<p>Nenhuma forma de pagamento cadastrada</p>
						<p className="hint">Adicione uma forma de pagamento acima para começar</p>
					</div>
				) : (
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Forma de Pagamento</th>
									<th>Status</th>
									<th>Configurações PIX</th>
									<th style={{ width: 200 }}>Ações</th>
								</tr>
							</thead>
							<tbody>
								{formas.map((f) => (
									<tr key={f.id}>
										<td>
											<span className="row center">
												<PaymentIcon kind={resolvePaymentKind(f.id + ' ' + f.descricao)} /> 
												<span><strong>{f.descricao}</strong></span>
											</span>
										</td>
										<td>
											<span className={`badge ${f.status === 'ativo' ? 'on' : 'off'}`}>
												{f.status === 'ativo' ? 'Ativo' : 'Inativo'}
											</span>
										</td>
										<td>
											{isPix(f.descricao) ? (
												f.pixChave ? (
													<span className="subtitle">✓ Chave: {f.pixChave.substring(0, 20)}...</span>
												) : (
													<span className="subtitle" style={{ color: 'var(--warning)' }}>⚠️ Não configurado</span>
												)
											) : (
												<span className="subtitle">-</span>
											)}
										</td>
										<td className="row">
											<button className="btn icon" onClick={() => iniciarEdicao(f)}>✏️ Editar</button>
											<button className="btn icon" onClick={() => toggle(f.id)}>
												{f.status === 'ativo' ? '⏸️ Desativar' : '▶️ Ativar'}
											</button>
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
