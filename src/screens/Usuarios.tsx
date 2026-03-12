import { useCallback, useEffect, useState } from 'react'
import type { Usuario, PermissoesModulo } from '../services/mockDb'
import { usuariosService, caixasService, type Caixa } from '../services/entitiesService'

// Formato retornado pela API (permissões em campos planos)
type UsuarioAPI = {
	id: string
	nomeCompleto: string
	apelido: string
	contato: string
	usaCaixa: boolean
	caixaId?: string | null
	bloqueado?: boolean
	acompanhamento?: boolean
	lancamento?: boolean
	caixaAbertura?: boolean
	caixaFechamento?: boolean
	caixaSangria?: boolean
	caixaSuprimento?: boolean
	estacionamentoCadastro?: boolean
	estacionamentoCaixaAbertura?: boolean
	estacionamentoCaixaFechamento?: boolean
	estacionamentoLancamento?: boolean
	estacionamentoAcompanhamento?: boolean
	relatorios?: boolean
	parametrosEmpresa?: boolean
	parametrosFormasPagamento?: boolean
	parametrosBrinquedos?: boolean
	clientes?: boolean
	descontoAutorizado?: boolean
	cortesia?: boolean
}

function apiUsuarioToForm(u: UsuarioAPI): Usuario {
	const permissoes: PermissoesModulo = {
		acompanhamento: u.acompanhamento,
		lancamento: u.lancamento,
		caixa: (u.caixaAbertura || u.caixaFechamento || u.caixaSangria || u.caixaSuprimento) ? {
			abertura: u.caixaAbertura,
			fechamento: u.caixaFechamento,
			sangria: u.caixaSangria,
			suprimento: u.caixaSuprimento,
		} : undefined,
		estacionamento: (u.estacionamentoCadastro || u.estacionamentoLancamento || u.estacionamentoAcompanhamento || u.estacionamentoCaixaAbertura || u.estacionamentoCaixaFechamento) ? {
			cadastro: u.estacionamentoCadastro,
			caixa: (u.estacionamentoCaixaAbertura || u.estacionamentoCaixaFechamento) ? { abertura: u.estacionamentoCaixaAbertura, fechamento: u.estacionamentoCaixaFechamento } : undefined,
			lancamento: u.estacionamentoLancamento,
			acompanhamento: u.estacionamentoAcompanhamento,
		} : undefined,
		relatorios: u.relatorios,
		descontoAutorizado: u.descontoAutorizado,
		parametros: (u.parametrosEmpresa || u.parametrosFormasPagamento || u.parametrosBrinquedos) ? {
			empresa: u.parametrosEmpresa,
			formasPagamento: u.parametrosFormasPagamento,
			brinquedos: u.parametrosBrinquedos,
		} : undefined,
		clientes: u.clientes,
		cortesia: u.cortesia,
	}
	return {
		id: u.id,
		nomeCompleto: u.nomeCompleto,
		apelido: u.apelido,
		contato: u.contato,
		senha: '',
		permissoes,
		usaCaixa: u.usaCaixa ?? false,
		caixaId: u.caixaId ?? undefined,
		bloqueado: u.bloqueado ?? false,
	}
}

function formToApiPayload(form: Partial<Usuario>, includeSenha: boolean) {
	const p = form.permissoes
	// Enviar caixaId explicitamente: null = "Todos os caixas", para o backend atualizar e desconectar o caixa anterior
	const caixaId = form.usaCaixa ? (form.caixaId ?? null) : null
	const payload: Record<string, unknown> = {
		nomeCompleto: form.nomeCompleto?.trim(),
		apelido: form.apelido?.trim(),
		contato: (form.contato ?? '').trim(),
		usaCaixa: form.usaCaixa ?? false,
		caixaId,
		bloqueado: form.bloqueado ?? false,
		acompanhamento: !!p?.acompanhamento,
		lancamento: !!p?.lancamento,
		caixaAbertura: !!p?.caixa?.abertura,
		caixaFechamento: !!p?.caixa?.fechamento,
		caixaSangria: !!p?.caixa?.sangria,
		caixaSuprimento: !!p?.caixa?.suprimento,
		estacionamentoCadastro: !!p?.estacionamento?.cadastro,
		estacionamentoCaixaAbertura: !!p?.estacionamento?.caixa?.abertura,
		estacionamentoCaixaFechamento: !!p?.estacionamento?.caixa?.fechamento,
		estacionamentoLancamento: !!p?.estacionamento?.lancamento,
		estacionamentoAcompanhamento: !!p?.estacionamento?.acompanhamento,
		relatorios: !!p?.relatorios,
		descontoAutorizado: !!p?.descontoAutorizado,
		parametrosEmpresa: !!p?.parametros?.empresa,
		parametrosFormasPagamento: !!p?.parametros?.formasPagamento,
		parametrosBrinquedos: !!p?.parametros?.brinquedos,
		clientes: !!p?.clientes,
		cortesia: !!p?.cortesia,
	}
	if (includeSenha && form.senha?.trim()) payload.senha = form.senha.trim()
	return payload
}

export default function Usuarios() {
	const [usuarios, setUsuarios] = useState<Usuario[]>([])
	const [caixas, setCaixas] = useState<Caixa[]>([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
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

	const load = useCallback(async () => {
		setLoading(true)
		try {
			const [usuariosRes, caixasRes] = await Promise.all([
				usuariosService.list() as Promise<UsuarioAPI[]>,
				caixasService.list(),
			])
			setUsuarios(usuariosRes.map(apiUsuarioToForm))
			setCaixas(caixasRes)
		} catch (e) {
			console.error(e)
			alert('Erro ao carregar usuários ou caixas.')
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => { load() }, [load])

	function refreshList() {
		load()
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
			bloqueado: false,
		})
		setEditingId(null)
	}

	function edit(usuario: Usuario) {
		setForm({
			nomeCompleto: usuario.nomeCompleto,
			apelido: usuario.apelido,
			contato: usuario.contato,
			senha: '',
			permissoes: { ...usuario.permissoes },
			usaCaixa: usuario.usaCaixa,
			caixaId: usuario.caixaId,
			bloqueado: usuario.bloqueado,
		})
		setEditingId(usuario.id)
	}

	async function save() {
		if (!form.nomeCompleto?.trim() || !form.apelido?.trim() || !form.contato?.trim()) {
			return alert('Preencha os campos obrigatórios')
		}

		if (editingId) {
			setSaving(true)
			try {
				const payload = formToApiPayload(form, true)
				await usuariosService.update(editingId, payload as Parameters<typeof usuariosService.update>[1])
				alert('Usuário atualizado com sucesso!')
				refreshList()
				resetForm()
			} catch (e: unknown) {
				const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Erro ao atualizar'
				alert(msg)
			} finally {
				setSaving(false)
			}
		} else {
			if (!form.senha?.trim()) {
				return alert('Senha é obrigatória para novos usuários')
			}
			setSaving(true)
			try {
				const payload = formToApiPayload(form, true)
				await usuariosService.create(payload as Parameters<typeof usuariosService.create>[0])
				alert('Usuário criado com sucesso! Use o apelido e a senha para fazer login.')
				refreshList()
				resetForm()
			} catch (e: unknown) {
				const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Erro ao criar usuário'
				alert(msg)
			} finally {
				setSaving(false)
			}
		}
	}

	async function remove(id: string) {
		if (!confirm('Deseja realmente excluir este usuário?')) return
		try {
			await usuariosService.delete(id)
			refreshList()
			if (editingId === id) resetForm()
		} catch (e: unknown) {
			const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Erro ao excluir'
			alert(msg)
		}
	}

	function togglePermissao(modulo: string, tela?: string, subtela?: string) {
		setForm(prev => {
			const permissoes = { ...prev.permissoes } as PermissoesModulo
			// Deep copy de objetos aninhados para o React detectar mudança e re-renderizar
			if (permissoes.caixa) permissoes.caixa = { ...permissoes.caixa }
			if (permissoes.parametros) permissoes.parametros = { ...permissoes.parametros }
			if (permissoes.estacionamento) {
				permissoes.estacionamento = { ...permissoes.estacionamento }
				if (permissoes.estacionamento.caixa) permissoes.estacionamento.caixa = { ...permissoes.estacionamento.caixa }
			}

			if (subtela) {
				if (modulo === 'estacionamento' && tela === 'caixa') {
					permissoes.estacionamento = permissoes.estacionamento || {}
					const caixaAtual = permissoes.estacionamento.caixa || {}
					permissoes.estacionamento.caixa = {
						...caixaAtual,
						[subtela]: !(caixaAtual as Record<string, boolean>)[subtela],
					}
				}
			} else if (tela) {
				if (modulo === 'caixa') {
					const caixaAtual = permissoes.caixa || {}
					permissoes.caixa = {
						...caixaAtual,
						[tela]: !(caixaAtual as Record<string, boolean>)[tela],
					}
				} else if (modulo === 'parametros') {
					const paramAtual = permissoes.parametros || {}
					permissoes.parametros = {
						...paramAtual,
						[tela]: !(paramAtual as Record<string, boolean>)[tela],
					}
				} else if (modulo === 'estacionamento') {
					permissoes.estacionamento = { ...(permissoes.estacionamento || {}) }
					if (tela === 'caixa') {
						if (permissoes.estacionamento.caixa) {
							delete permissoes.estacionamento.caixa
						} else {
							permissoes.estacionamento.caixa = {}
						}
					} else {
						const estAtual = permissoes.estacionamento
						permissoes.estacionamento = {
							...estAtual,
							[tela]: !(estAtual as Record<string, unknown>)[tela],
						}
					}
				}
			} else {
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

						{/* Autorizar desconto */}
						<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<input 
								type="checkbox" 
								checked={!!form.permissoes?.descontoAutorizado}
								onChange={() => togglePermissao('descontoAutorizado')}
							/>
							<span>Autorizar desconto</span>
						</label>

						{/* Cortesia */}
						<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							<input 
								type="checkbox" 
								checked={!!form.permissoes?.cortesia}
								onChange={() => togglePermissao('cortesia')}
							/>
							<span>Cortesia (gerar códigos)</span>
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
								<div style={{ marginLeft: 24 }}>
									<div style={{ marginBottom: 8 }}>
										<button 
											type="button"
											className="btn" 
											style={{ fontSize: '0.85rem', padding: '4px 12px' }}
											onClick={() => {
												setForm(prev => {
													const permissoes = { ...prev.permissoes } as PermissoesModulo
													permissoes.parametros = {
														empresa: true,
														formasPagamento: true,
														brinquedos: true
													}
													return { ...prev, permissoes }
												})
											}}
										>
											✓ Selecionar Todos
										</button>
									</div>
									<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
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

				{/* Bloquear usuário */}
				<div style={{ marginTop: 24 }}>
					<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }} htmlFor="usuarios-bloqueado">
						<input 
							id="usuarios-bloqueado"
							type="checkbox" 
							checked={form.bloqueado || false}
							onChange={(e) => setForm(prev => ({ ...prev, bloqueado: e.target.checked }))}
						/>
						<span><strong>Bloquear usuário</strong></span>
					</label>
					<span className="help" style={{ display: 'block', marginTop: -4, marginBottom: 12 }}>Usuário bloqueado não consegue fazer login</span>
				</div>

				{/* Usuário utiliza caixa */}
				<div style={{ marginTop: 24 }}>
					<label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }} htmlFor="usuarios-usa-caixa">
						<input 
							id="usuarios-usa-caixa"
							type="checkbox" 
							checked={form.usaCaixa || false}
							onChange={(e) => setForm(prev => ({ ...prev, usaCaixa: e.target.checked, caixaId: e.target.checked ? prev.caixaId : undefined }))}
						/>
						<span><strong>Usuário utiliza caixa</strong></span>
					</label>
					
					{form.usaCaixa && (
						<div className="field">
							<label htmlFor="usuarios-caixa-select"><span>Selecione o Caixa</span></label>
							<select 
								id="usuarios-caixa-select"
								className="select" 
								value={form.caixaId === undefined ? 'todos' : (form.caixaId || '')} 
								onChange={(e) => {
									const value = e.target.value
									setForm(prev => ({ 
										...prev, 
										caixaId: value === 'todos' ? undefined : (value || undefined) 
									}))
								}}
							>
								<option value="todos">Todos os caixas</option>
								<option value="">Selecione um caixa específico...</option>
								{caixas.filter(c => c?.id).map((c) => (
									<option key={c.id} value={c.id}>
										{c.nome} ({c.status})
									</option>
								))}
							</select>
							<span className="help">
								{caixas.length === 0
									? 'Cadastre caixas em "Cadastro de Caixas" para atribuir a um usuário.'
									: form.caixaId === undefined 
										? 'O usuário poderá usar qualquer caixa para abertura/fechamento'
										: 'Selecione qual caixa este usuário pode usar para abertura/fechamento'}
							</span>
						</div>
					)}
				</div>

				<div className="actions" style={{ marginTop: 16 }}>
					{editingId && (
						<button className="btn" onClick={resetForm}>Cancelar</button>
					)}
					<button className="btn primary" onClick={save} disabled={saving}>
						{saving ? '...' : editingId ? '💾 Atualizar' : '➕ Criar'}
					</button>
				</div>
			</div>

			{/* Lista de Usuários */}
			<div className="card">
				<h3>Usuários Cadastrados</h3>
				{loading ? (
					<div className="empty">Carregando...</div>
				) : usuarios.length === 0 ? (
					<div className="empty">Nenhum usuário cadastrado</div>
				) : (
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Nome Completo</th>
									<th>Apelido</th>
									<th>Contato</th>
									<th>Bloqueado</th>
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
											<td>{u.bloqueado ? <span className="badge off">Sim</span> : 'Não'}</td>
											<td>{u.usaCaixa ? '✅' : '❌'}</td>
											<td>{u.usaCaixa ? (caixa ? caixa.nome : 'Todos os caixas') : '-'}</td>
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

