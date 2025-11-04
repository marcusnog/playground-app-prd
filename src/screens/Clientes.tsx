import { useMemo, useState } from 'react'
import { db, uid, type Cliente } from '../services/mockDb'

export default function Clientes() {
	const [_, force] = useState(0)
	const clientes = useMemo(() => db.get().clientes || [], [_])
	const [editId, setEditId] = useState<string | null>(null)
	const [form, setForm] = useState({
		nomeCompleto: '',
		dataNascimento: '',
		nomePai: '',
		nomeMae: '',
		telefoneWhatsapp: ''
	})

	function refresh() { force((x) => x + 1 as unknown as number) }

	function calcularIdade(dataNascimento: string): number {
		if (!dataNascimento) return 0
		try {
			const hoje = new Date()
			const nascimento = new Date(dataNascimento)
			if (isNaN(nascimento.getTime())) return 0
			let idade = hoje.getFullYear() - nascimento.getFullYear()
			const mes = hoje.getMonth() - nascimento.getMonth()
			if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
				idade--
			}
			return idade
		} catch {
			return 0
		}
	}

	function proximoAniversario(dataNascimento: string): string {
		if (!dataNascimento) return '-'
		try {
			const hoje = new Date()
			const nascimento = new Date(dataNascimento)
			if (isNaN(nascimento.getTime())) return '-'
			const proximo = new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate())
			if (proximo < hoje) {
				proximo.setFullYear(hoje.getFullYear() + 1)
			}
			const dias = Math.ceil((proximo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
			return `${proximo.toLocaleDateString('pt-BR')} (em ${dias} dias)`
		} catch {
			return '-'
		}
	}

	function salvar() {
		if (!form.nomeCompleto.trim()) return alert('Informe o nome completo da criança')
		if (!form.dataNascimento) return alert('Informe a data de nascimento')
		if (!form.telefoneWhatsapp.trim()) return alert('Informe o WhatsApp para contato')
		
		// Converter data para ISO string
		const dataNascimentoISO = new Date(form.dataNascimento + 'T00:00:00').toISOString()
		
		if (editId) {
			db.update((d) => {
				const cliente = d.clientes.find((c) => c.id === editId)
				if (cliente) {
					cliente.nomeCompleto = form.nomeCompleto.trim()
					cliente.dataNascimento = dataNascimentoISO
					cliente.nomePai = form.nomePai.trim()
					cliente.nomeMae = form.nomeMae.trim()
					cliente.telefoneWhatsapp = form.telefoneWhatsapp.trim()
				}
			})
			alert('Cliente atualizado com sucesso!')
		} else {
			db.update((d) => {
				d.clientes.push({
					id: uid('cli'),
					nomeCompleto: form.nomeCompleto.trim(),
					dataNascimento: dataNascimentoISO,
					nomePai: form.nomePai.trim(),
					nomeMae: form.nomeMae.trim(),
					telefoneWhatsapp: form.telefoneWhatsapp.trim()
				})
			})
			alert('Cliente cadastrado com sucesso!')
		}
		
		limparForm()
		refresh()
	}

	function limparForm() {
		setEditId(null)
		setForm({
			nomeCompleto: '',
			dataNascimento: '',
			nomePai: '',
			nomeMae: '',
			telefoneWhatsapp: ''
		})
	}

	function iniciarEdicao(cliente: Cliente) {
		setEditId(cliente.id)
		try {
			const dataFormatada = new Date(cliente.dataNascimento).toISOString().split('T')[0]
			setForm({
				nomeCompleto: cliente.nomeCompleto,
				dataNascimento: dataFormatada,
				nomePai: cliente.nomePai || '',
				nomeMae: cliente.nomeMae || '',
				telefoneWhatsapp: cliente.telefoneWhatsapp
			})
		} catch {
			setForm({
				nomeCompleto: cliente.nomeCompleto,
				dataNascimento: '',
				nomePai: cliente.nomePai || '',
				nomeMae: cliente.nomeMae || '',
				telefoneWhatsapp: cliente.telefoneWhatsapp
			})
		}
	}

	function remover(id: string) {
		const temLancamentos = db.get().lancamentos.some((l) => l.clienteId === id)
		if (temLancamentos) return alert('Não é possível excluir: existem lançamentos vinculados a este cliente.')
		if (!confirm('Excluir este cliente?')) return
		db.update((d) => {
			d.clientes = d.clientes.filter((c) => c.id !== id)
		})
		refresh()
	}

	function abrirWhatsapp(telefone: string, mensagem: string) {
		const url = `https://wa.me/${encodeURIComponent(telefone)}?text=${encodeURIComponent(mensagem)}`
		window.open(url, '_blank')
	}

	return (
		<div className="container" style={{ maxWidth: 900 }}>
			<h2>Cadastro de Clientes</h2>
			<p className="subtitle">Cadastre as crianças para envio de mensagens de aniversário e promoções</p>
			
			{/* Formulário */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>{editId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
				<div className="form two">
					<label className="field">
						<span>Nome Completo da Criança *</span>
						<input 
							className="input" 
							value={form.nomeCompleto} 
							onChange={(e) => setForm({ ...form, nomeCompleto: e.target.value })} 
							placeholder="Nome completo da criança"
						/>
					</label>
					
					<label className="field">
						<span>Data de Nascimento *</span>
						<input 
							type="date" 
							className="input" 
							value={form.dataNascimento} 
							onChange={(e) => setForm({ ...form, dataNascimento: e.target.value })} 
						/>
						{form.dataNascimento && (
							<span className="help">
								Idade: {calcularIdade(form.dataNascimento)} anos | 
								Próximo aniversário: {proximoAniversario(form.dataNascimento)}
							</span>
						)}
					</label>
					
					<label className="field">
						<span>Nome do Pai</span>
						<input 
							className="input" 
							value={form.nomePai} 
							onChange={(e) => setForm({ ...form, nomePai: e.target.value })} 
							placeholder="Nome completo do pai"
						/>
					</label>
					
					<label className="field">
						<span>Nome da Mãe</span>
						<input 
							className="input" 
							value={form.nomeMae} 
							onChange={(e) => setForm({ ...form, nomeMae: e.target.value })} 
							placeholder="Nome completo da mãe"
						/>
					</label>
					
					<label className="field" style={{ gridColumn: '1 / -1' }}>
						<span>WhatsApp para Contato *</span>
						<input 
							className="input" 
							value={form.telefoneWhatsapp} 
							onChange={(e) => setForm({ ...form, telefoneWhatsapp: e.target.value })} 
							placeholder="5599999999999"
						/>
						<span className="help">Telefone para envio de mensagens de aniversário e promoções</span>
					</label>
					
					<div className="actions" style={{ gridColumn: '1 / -1' }}>
						{editId && (
							<button className="btn" onClick={limparForm}>Cancelar</button>
						)}
						<button className="btn primary" onClick={salvar}>
							{editId ? '💾 Atualizar Cliente' : '➕ Cadastrar Cliente'}
						</button>
					</div>
				</div>
			</div>

			{/* Lista de Clientes */}
			<div className="card">
				<h3>Clientes Cadastrados ({clientes.length})</h3>
				{clientes.length === 0 ? (
					<div className="empty">
						<p>Nenhum cliente cadastrado</p>
						<p className="hint">Cadastre clientes acima para começar</p>
					</div>
				) : (
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Criança</th>
									<th>Data Nascimento</th>
									<th>Idade</th>
									<th>Próximo Aniversário</th>
									<th>WhatsApp</th>
									<th style={{ width: 200 }}>Ações</th>
								</tr>
							</thead>
							<tbody>
								{clientes
									.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto))
									.map((cliente) => {
										const idade = calcularIdade(cliente.dataNascimento)
										let proximoAniversarioStr = '-'
										let diasAniversario = 999
										
										try {
											const hoje = new Date()
											const nascimento = new Date(cliente.dataNascimento)
											if (!isNaN(nascimento.getTime())) {
												const proximo = new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate())
												if (proximo < hoje) proximo.setFullYear(hoje.getFullYear() + 1)
												diasAniversario = Math.ceil((proximo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
												proximoAniversarioStr = proximo.toLocaleDateString('pt-BR')
											}
										} catch {}
										
										let dataFormatada = '-'
										try {
											dataFormatada = new Date(cliente.dataNascimento).toLocaleDateString('pt-BR')
										} catch {}
										
										return (
											<tr key={cliente.id}>
												<td>
													<strong>{cliente.nomeCompleto}</strong>
													{(cliente.nomePai || cliente.nomeMae) && (
														<div className="subtitle">
															{cliente.nomePai && cliente.nomeMae 
																? `Filho(a) de ${cliente.nomePai} e ${cliente.nomeMae}`
																: cliente.nomePai 
																	? `Filho(a) de ${cliente.nomePai}`
																	: `Filho(a) de ${cliente.nomeMae}`}
														</div>
													)}
												</td>
												<td>{dataFormatada}</td>
												<td>{idade > 0 ? `${idade} anos` : '-'}</td>
												<td>
													{diasAniversario <= 30 && diasAniversario < 999 ? (
														<span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>
															{proximoAniversarioStr} ({diasAniversario} dias)
														</span>
													) : (
														<span>{proximoAniversarioStr}</span>
													)}
												</td>
												<td>
													<span className="row center" style={{ gap: 8 }}>
														{cliente.telefoneWhatsapp}
														<button 
															className="btn icon" 
															style={{ padding: '4px 8px', fontSize: '0.9rem' }}
															onClick={() => abrirWhatsapp(cliente.telefoneWhatsapp, 'Olá! Mensagem do Parque Infantil.')}
														>
															📱
														</button>
													</span>
												</td>
												<td className="row">
													<button className="btn icon" onClick={() => iniciarEdicao(cliente)}>✏️ Editar</button>
													<button className="btn icon" onClick={() => remover(cliente.id)}>🗑️ Excluir</button>
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

