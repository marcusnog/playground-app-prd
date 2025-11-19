import { useMemo, useState } from 'react'
import { db, type Usuario, type PermissoesModulo, uid } from '../services/mockDb'

export default function Usuarios() {
	const [refresh, setRefresh] = useState(0)
	const usuarios = useMemo(() => db.get().usuarios, [refresh])
	const caixas = useMemo(() => db.get().caixas, [refresh])
	const [editingId, setEditingId] = useState<string | null>(null)
	const [form, setForm] = useState<Partial<Usuario>>({
		nomeCompleto: '',
		apelido: '',
		contato: '',
		senha: '',
		permissoes: {},
		usaCaixa: false,
		caixaId: undefined,
	})

	function refreshList() {
		setRefresh(prev => prev + 1)
	}

	function resetForm() {
		setForm({
			nomeCompleto: '',
			apelido: '',
			contato: '',
			senha: '',
			permissoes: {},
			usaCaixa: false,
			caixaId: undefined,
		})
		setEditingId(null)
	}

	function edit(usuario: Usuario) {
		setForm({
			nomeCompleto: usuario.nomeCompleto,
			apelido: usuario.apelido,
			contato: usuario.contato,
			senha: '', // Não mostrar senha ao editar
			permissoes: { ...usuario.permissoes },
			usaCaixa: usuario.usaCaixa,
			caixaId: usuario.caixaId,
		})
		setEditingId(usuario.id)
	}

	function save() {
		if (!form.nomeCompleto?.trim() || !form.apelido?.trim() || !form.contato?.trim()) {
			return alert('Preencha os campos obrigatórios')
		}

		if (editingId) {
			// Editar
			db.update((d) => {
				const usuario = d.usuarios.find(u => u.id === editingId)
				if (usuario) {
					usuario.nomeCompleto = form.nomeCompleto!
					usuario.apelido = form.apelido!
					usuario.contato = form.contato!
					if (form.senha?.trim()) {
						usuario.senha = form.senha
					}
					usuario.permissoes = form.permissoes || {}
					usuario.usaCaixa = form.usaCaixa || false
					usuario.caixaId = form.usaCaixa ? form.caixaId : undefined
				}
			})
			alert('Usuário atualizado com sucesso!')
		} else {
			// Criar
			if (!form.senha?.trim()) {
				return alert('Senha é obrigatória para novos usuários')
			}
			db.update((d) => {
				d.usuarios.push({
					id: uid('usr'),
					nomeCompleto: form.nomeCompleto!,
					apelido: form.apelido!,
					contato: form.contato!,
					senha: form.senha!,
					permissoes: form.permissoes || {},
					usaCaixa: form.usaCaixa || false,
					caixaId: form.usaCaixa ? form.caixaId : undefined,
				})
			})
			alert('Usuário criado com sucesso!')
		}
		refreshList()
		resetForm()
	}

	function remove(id: string) {
		if (!confirm('Deseja realmente excluir este usuário?')) return
		db.update((d) => {
			d.usuarios = d.usuarios.filter(u => u.id !== id)
		})
		refreshList()
	}

	function togglePermissao(modulo: string, tela?: string, subtela?: string) {
		setForm(prev => {
			const permissoes = { ...prev.permissoes } as PermissoesModulo
			
			if (subtela) {
				// Permissão de subtela (ex: estacionamento.caixa.abertura)
				if (modulo === 'estacionamento' && tela === 'caixa') {
					permissoes.estacionamento = permissoes.estacionamento || { caixa: {} }
					permissoes.estacionamento.caixa = permissoes.estacionamento.caixa || {}
					permissoes.estacionamento.caixa[subtela as keyof typeof permissoes.estacionamento.caixa] = 
						!permissoes.estacionamento.caixa[subtela as keyof typeof permissoes.estacionamento.caixa]
				}
			} else if (tela) {
				// Permissão de tela específica dentro de um módulo
				if (modulo === 'caixa') {
					permissoes.caixa = permissoes.caixa || {}
					permissoes.caixa[tela as keyof typeof permissoes.caixa] = 
						!permissoes.caixa[tela as keyof typeof permissoes.caixa]
				} else if (modulo === 'parametros') {
					permissoes.parametros = permissoes.parametros || {}
					permissoes.parametros[tela as keyof typeof permissoes.parametros] = 
						!permissoes.parametros[tela as keyof typeof permissoes.parametros]
				} else if (modulo === 'estacionamento') {
					permissoes.estacionamento = permissoes.estacionamento || {}
					if (tela === 'caixa') {
						if (permissoes.estacionamento.caixa) {
							delete permissoes.estacionamento.caixa
						} else {
							permissoes.estacionamento.caixa = {}
						}
					} else {
						permissoes.estacionamento[tela as keyof typeof permissoes.estacionamento] = 
							!permissoes.estacionamento[tela as keyof typeof permissoes.estacionamento] as any
					}
				}
			} else {
				// Permissão de módulo completo
				const complexModules: Array<keyof PermissoesModulo> = ['caixa', 'parametros', 'estacionamento']
				if (complexModules.includes(modulo as keyof PermissoesModulo)) {
					const current = permissoes[modulo as keyof PermissoesModulo]
					if (current) {
						delete permissoes[modulo as keyof PermissoesModulo]
					} else if (modulo === 'caixa') {
						permissoes.caixa = {}
					} else if (modulo === 'parametros') {
						permissoes.parametros = {}
					} else if (modulo === 'estacionamento') {
						permissoes.estacionamento = {}
					}
				} else {
					permissoes[modulo as keyof PermissoesModulo] = 
						!permissoes[modulo as keyof PermissoesModulo] as any
				}
			}
			
			return { ...prev, permissoes }
		})
	}

	return (
		<div className="container" style={{ maxWidth: 1200 }}>
			<h2>Cadastro de Usuários</h2>

			{/* Formulário */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
				<div className="form two">
					<label className="field">
						<span>Nome Completo *</span>
						<input 
							className="input" 
							value={form.nomeCompleto || ''} 
							onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })} 
						/>
					</label>
					
					<label className="field">
						<span>Apelido *</span>
						<input 
							className="input" 
							value={form.apelido || ''} 
							onChange={(e) => setForm({ ...form, apelido: e.target.value })} 
						/>
					</label>
					
					<label className="field">
						<span>Contato *</span>
						<input 
							className="input" 
							value={form.contato || ''} 
							onChange={(e) => setForm({ ...form, contato: e.target.value })} 
							placeholder="Telefone, email, etc."
						/>
					</label>
					
					<label className="field">
						<span>Senha {!editingId && '*'}</span>
						<input 
							className="input" 
							type="password" 
							value={form.senha || ''} 
							onChange={(e) => setForm({ ...form, senha: e.target.value })} 
							placeholder={editingId ? "Deixe em branco para manter a atual" : ""}
						/>
						{editingId && <span className="help">Deixe em branco para manter a senha atual</span>}
					</label>
				</div>

				{/* Permissões */}
				<div style={{ marginTop: 24 }}>
					<h4>Permissões</h4>
					<div className="form" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
						{/* Acompanhamento */}
						<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<input 
								type="checkbox" 
								checked={!!form.permissoes?.acompanhamento}
								onChange={() => togglePermissao('acompanhamento')}
							/>
							<span>Acompanhamento</span>
						</label>

						{/* Lançamento */}
						<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<input 
								type="checkbox" 
								checked={!!form.permissoes?.lancamento}
								onChange={() => togglePermissao('lancamento')}
							/>
							<span>Lançamento</span>
						</label>

						{/* Caixa */}
						<div style={{ gridColumn: '1 / -1' }}>
							<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
								<input 
									type="checkbox" 
									checked={!!form.permissoes?.caixa}
									onChange={() => togglePermissao('caixa')}
								/>
								<span><strong>Caixa</strong></span>
							</label>
							{form.permissoes?.caixa && (
								<div style={{ marginLeft: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
									<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<input 
											type="checkbox" 
											checked={!!form.permissoes?.caixa?.abertura}
											onChange={() => togglePermissao('caixa', 'abertura')}
										/>
										<span>Abertura</span>
									</label>
									<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<input 
											type="checkbox" 
											checked={!!form.permissoes?.caixa?.fechamento}
											onChange={() => togglePermissao('caixa', 'fechamento')}
										/>
										<span>Fechamento</span>
									</label>
									<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<input 
											type="checkbox" 
											checked={!!form.permissoes?.caixa?.sangria}
											onChange={() => togglePermissao('caixa', 'sangria')}
										/>
										<span>Sangria</span>
									</label>
									<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<input 
											type="checkbox" 
											checked={!!form.permissoes?.caixa?.suprimento}
											onChange={() => togglePermissao('caixa', 'suprimento')}
										/>
										<span>Suprimento</span>
									</label>
								</div>
							)}
						</div>

						{/* Relatórios */}
						<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<input 
								type="checkbox" 
								checked={!!form.permissoes?.relatorios}
								onChange={() => togglePermissao('relatorios')}
							/>
							<span>Relatórios</span>
						</label>

						{/* Parâmetros */}
						<div style={{ gridColumn: '1 / -1' }}>
							<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
								<input 
									type="checkbox" 
									checked={!!form.permissoes?.parametros}
									onChange={() => togglePermissao('parametros')}
								/>
								<span><strong>Parâmetros</strong></span>
							</label>
							{form.permissoes?.parametros && (
								<div style={{ marginLeft: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
									<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<input 
											type="checkbox" 
											checked={!!form.permissoes?.parametros?.empresa}
											onChange={() => togglePermissao('parametros', 'empresa')}
										/>
										<span>Empresa</span>
									</label>
									<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<input 
											type="checkbox" 
											checked={!!form.permissoes?.parametros?.formasPagamento}
											onChange={() => togglePermissao('parametros', 'formasPagamento')}
										/>
										<span>Formas de Pagamento</span>
									</label>
									<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<input 
											type="checkbox" 
											checked={!!form.permissoes?.parametros?.brinquedos}
											onChange={() => togglePermissao('parametros', 'brinquedos')}
										/>
										<span>Brinquedos</span>
									</label>
								</div>
							)}
						</div>

						{/* Estacionamento */}
						<div style={{ gridColumn: '1 / -1' }}>
							<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
								<input 
									type="checkbox" 
									checked={!!form.permissoes?.estacionamento}
									onChange={() => togglePermissao('estacionamento')}
								/>
								<span><strong>Estacionamento</strong></span>
							</label>
							{form.permissoes?.estacionamento && (
								<div style={{ marginLeft: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
									<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<input 
											type="checkbox" 
											checked={!!form.permissoes?.estacionamento?.cadastro}
											onChange={() => togglePermissao('estacionamento', 'cadastro')}
										/>
										<span>Cadastro</span>
									</label>
									<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<input 
											type="checkbox" 
											checked={!!form.permissoes?.estacionamento?.lancamento}
											onChange={() => togglePermissao('estacionamento', 'lancamento')}
										/>
										<span>Lançamento</span>
									</label>
									<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
										<input 
											type="checkbox" 
											checked={!!form.permissoes?.estacionamento?.acompanhamento}
											onChange={() => togglePermissao('estacionamento', 'acompanhamento')}
										/>
										<span>Acompanhamento</span>
									</label>
									<div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
										<label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
											<input 
												type="checkbox" 
												checked={!!form.permissoes?.estacionamento?.caixa}
												onChange={() => togglePermissao('estacionamento', 'caixa')}
											/>
											<span><strong>Caixa</strong></span>
										</label>
										{form.permissoes?.estacionamento?.caixa && (
											<div style={{ marginLeft: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
												<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
													<input 
														type="checkbox" 
														checked={!!form.permissoes?.estacionamento?.caixa?.abertura}
														onChange={() => togglePermissao('estacionamento', 'caixa', 'abertura')}
													/>
													<span>Abertura</span>
												</label>
												<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
													<input 
														type="checkbox" 
														checked={!!form.permissoes?.estacionamento?.caixa?.fechamento}
														onChange={() => togglePermissao('estacionamento', 'caixa', 'fechamento')}
													/>
													<span>Fechamento</span>
												</label>
											</div>
										)}
									</div>
								</div>
							)}
						</div>

						{/* Clientes */}
						<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<input 
								type="checkbox" 
								checked={!!form.permissoes?.clientes}
								onChange={() => togglePermissao('clientes')}
							/>
							<span>Clientes</span>
						</label>
					</div>
				</div>

				{/* Usuário utiliza caixa */}
				<div style={{ marginTop: 24 }}>
					<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
						<input 
							type="checkbox" 
							checked={form.usaCaixa || false}
							onChange={(e) => setForm({ ...form, usaCaixa: e.target.checked, caixaId: e.target.checked ? form.caixaId : undefined })}
						/>
						<span><strong>Usuário utiliza caixa</strong></span>
					</label>
					
					{form.usaCaixa && (
						<label className="field">
							<span>Selecione o Caixa</span>
							<select 
								className="select" 
								value={form.caixaId || ''} 
								onChange={(e) => setForm({ ...form, caixaId: e.target.value || undefined })}
							>
								<option value="">Selecione um caixa...</option>
								{caixas.map((c) => (
									<option key={c.id} value={c.id}>
										{c.nome} ({c.status})
									</option>
								))}
							</select>
							<span className="help">Selecione qual caixa este usuário pode usar para abertura/fechamento</span>
						</label>
					)}
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

			{/* Lista de Usuários */}
			<div className="card">
				<h3>Usuários Cadastrados</h3>
				{usuarios.length === 0 ? (
					<div className="empty">Nenhum usuário cadastrado</div>
				) : (
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Nome Completo</th>
									<th>Apelido</th>
									<th>Contato</th>
									<th>Usa Caixa</th>
									<th>Caixa</th>
									<th>Ações</th>
								</tr>
							</thead>
							<tbody>
								{usuarios.map((u) => {
									const caixa = u.caixaId ? caixas.find(c => c.id === u.caixaId) : null
									return (
										<tr key={u.id}>
											<td>{u.nomeCompleto}</td>
											<td>{u.apelido}</td>
											<td>{u.contato}</td>
											<td>{u.usaCaixa ? '✅' : '❌'}</td>
											<td>{caixa ? caixa.nome : '-'}</td>
											<td>
												<div className="row" style={{ gap: 8 }}>
													<button className="btn" onClick={() => edit(u)}>✏️ Editar</button>
													<button className="btn" onClick={() => remove(u.id)}>🗑️ Excluir</button>
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

