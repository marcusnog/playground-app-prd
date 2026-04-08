import { useMemo, useState, useEffect } from 'react'
import { clientesService, lancamentosService } from '../services/entitiesService'
import type { Cliente } from '../services/entitiesService'
import { extrairDataSomente, formatarDataPtBr, parseDataLocal } from '../services/utils'

export default function Clientes() {
	const [clientes, setClientes] = useState<Cliente[]>([])
	const [loading, setLoading] = useState(true)
	const [editId, setEditId] = useState<string | null>(null)
	const [filtroBusca, setFiltroBusca] = useState<string>('')
	const [mostrarMensagemPersonalizada, setMostrarMensagemPersonalizada] = useState(false)
	const [mensagemPersonalizada, setMensagemPersonalizada] = useState('')
	const [numeroWhatsapp, setNumeroWhatsapp] = useState<string>('')
	const [form, setForm] = useState({
		nomeCompleto: '',
		dataNascimento: '',
		nomePai: '',
		nomeMae: '',
		telefoneWhatsapp: ''
	})

	// Filtrar clientes por todos os campos
	const clientesFiltrados = useMemo(() => {
		if (!filtroBusca.trim()) return clientes
		const termo = filtroBusca.trim().toLowerCase()
		return clientes.filter(cliente => {
			const nomeCompleto = (cliente.nomeCompleto || '').toLowerCase()
			const nomePai = (cliente.nomePai || '').toLowerCase()
			const nomeMae = (cliente.nomeMae || '').toLowerCase()
			const whatsapp = (cliente.telefoneWhatsapp || '').toLowerCase()
			const dataStr = formatarDataPtBr(cliente.dataNascimento)
			return nomeCompleto.includes(termo) ||
				nomePai.includes(termo) ||
				nomeMae.includes(termo) ||
				whatsapp.includes(termo) ||
				dataStr.includes(termo)
		})
	}, [clientes, filtroBusca])

	async function loadClientes() {
		try {
			setLoading(true)
			const data = await clientesService.list()
			setClientes(Array.isArray(data) ? data : [])
		} catch (error) {
			console.error('Erro ao carregar clientes:', error)
			alert('Erro ao carregar clientes. Tente novamente.')
			setClientes([])
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadClientes()
	}, [])

	// Atualizar lista quando a janela recebe foco (ex.: voltou de outra aba)
	useEffect(() => {
		const handleFocus = () => loadClientes()
		window.addEventListener('focus', handleFocus)
		return () => window.removeEventListener('focus', handleFocus)
	}, [])

	function calcularIdade(dataNascimento: string): number {
		if (!dataNascimento) return 0
		const hoje = new Date()
		const nascimento = parseDataLocal(dataNascimento)
		if (!nascimento) return 0
		let idade = hoje.getFullYear() - nascimento.getFullYear()
		const mes = hoje.getMonth() - nascimento.getMonth()
		if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
			idade--
		}
		return idade
	}

	function proximoAniversario(dataNascimento: string): string {
		if (!dataNascimento) return '-'
		const hoje = new Date()
		const nascimento = parseDataLocal(dataNascimento)
		if (!nascimento) return '-'
		const proximo = new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate())
		if (proximo < hoje) {
			proximo.setFullYear(hoje.getFullYear() + 1)
		}
		const dias = Math.ceil((proximo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
		return `${proximo.toLocaleDateString('pt-BR')} (em ${dias} dias)`
	}

	async function salvar() {
		if (!form.nomeCompleto.trim()) return alert('Informe o nome completo da criança')
		if (!form.dataNascimento) return alert('Informe a data de nascimento')
		if (!form.telefoneWhatsapp.trim()) return alert('Informe o WhatsApp para contato')
		
		const payload = {
			nomeCompleto: form.nomeCompleto.trim(),
			dataNascimento: extrairDataSomente(form.dataNascimento),
			nomePai: form.nomePai.trim(),
			nomeMae: form.nomeMae.trim(),
			telefoneWhatsapp: form.telefoneWhatsapp.trim()
		}

		try {
			if (editId) {
				await clientesService.update(editId, payload)
				alert('Cliente atualizado com sucesso!')
			} else {
				await clientesService.create(payload)
				alert('Cliente cadastrado com sucesso!')
			}
			limparForm()
			await loadClientes()
		} catch (error) {
			console.error('Erro ao salvar cliente:', error)
			alert('Erro ao salvar cliente. Tente novamente.')
		}
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
		const dataFormatada = extrairDataSomente(cliente.dataNascimento)
		setForm({
			nomeCompleto: cliente.nomeCompleto,
			dataNascimento: dataFormatada,
			nomePai: cliente.nomePai || '',
			nomeMae: cliente.nomeMae || '',
			telefoneWhatsapp: cliente.telefoneWhatsapp
		})
		window.scrollTo({ top: 0, behavior: 'smooth' })
	}

	async function remover(id: string) {
		try {
			const lancamentos = await lancamentosService.list()
			const temLancamentoAberto = lancamentos.some((l) => l.clienteId === id && l.status === 'aberto')
			if (temLancamentoAberto) return alert('Não é possível excluir: há acompanhamento em andamento vinculado a este cliente. Encerre o lançamento antes de excluir.')
			if (!confirm('Excluir este cliente?')) return
			await clientesService.delete(id)
			await loadClientes()
		} catch (error: unknown) {
			console.error('Erro ao excluir cliente:', error)
			const msg = error && typeof error === 'object' && 'message' in error
				? String((error as { message?: string }).message)
				: 'Erro ao excluir cliente. Tente novamente.'
			alert(msg)
		}
	}

	function abrirWhatsapp(telefone: string, mensagem: string) {
		const url = `https://wa.me/${encodeURIComponent(telefone)}?text=${encodeURIComponent(mensagem)}`
		window.open(url, '_blank')
	}

	function abrirWhatsappComPersonalizacao(telefone: string, mensagemPadrao: string) {
		setNumeroWhatsapp(telefone)
		setMensagemPersonalizada(mensagemPadrao)
		setMostrarMensagemPersonalizada(true)
	}

	function enviarMensagemPersonalizada() {
		if (!numeroWhatsapp) return
		const mensagem = mensagemPersonalizada.trim() || 'Olá!'
		abrirWhatsapp(numeroWhatsapp, mensagem)
		setMostrarMensagemPersonalizada(false)
		setMensagemPersonalizada('')
		setNumeroWhatsapp('')
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
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
					<h3 style={{ margin: 0 }}>Clientes Cadastrados ({clientesFiltrados.length}{clientesFiltrados.length !== clientes.length ? ` de ${clientes.length}` : ''})</h3>
					<div className="row" style={{ gap: 8 }}>
						<input
							className="input"
							type="text"
							placeholder="🔍 Buscar em todos os campos (nome, pai, mãe, WhatsApp, data)..."
							value={filtroBusca}
							onChange={(e) => setFiltroBusca(e.target.value)}
							style={{ minWidth: 280 }}
						/>
						{filtroBusca && (
							<button className="btn" onClick={() => setFiltroBusca('')}>
								Limpar
							</button>
						)}
					</div>
				</div>
				{loading ? (
					<div className="empty">
						<p>Carregando clientes...</p>
					</div>
				) : clientes.length === 0 ? (
					<div className="empty">
						<p>Nenhum cliente cadastrado</p>
						<p className="hint">Cadastre clientes acima para começar</p>
					</div>
				) : filtroBusca.trim() && clientesFiltrados.length === 0 ? (
					<div className="empty">
						<p>Nenhum cliente encontrado com o filtro</p>
						<p className="hint">Limpe a busca para ver todos os {clientes.length} clientes cadastrados</p>
						<button className="btn" onClick={() => setFiltroBusca('')}>Limpar busca</button>
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
								{clientesFiltrados
									.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto))
									.map((cliente) => {
										const idade = calcularIdade(cliente.dataNascimento)
										let proximoAniversarioStr = '-'
										let diasAniversario = 999
										
										const hoje = new Date()
										const nascimento = parseDataLocal(cliente.dataNascimento)
										if (nascimento) {
											const proximo = new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate())
											if (proximo < hoje) proximo.setFullYear(hoje.getFullYear() + 1)
											diasAniversario = Math.ceil((proximo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
											proximoAniversarioStr = proximo.toLocaleDateString('pt-BR')
										}
										
										const dataFormatada = formatarDataPtBr(cliente.dataNascimento) || '-'
										
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
															onClick={() => abrirWhatsappComPersonalizacao(cliente.telefoneWhatsapp, 'Olá! Mensagem do Parque Infantil.')}
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

			{/* Modal de Mensagem Personalizada */}
			{mostrarMensagemPersonalizada && (
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(0, 0, 0, 0.5)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 1000
				}} onClick={() => setMostrarMensagemPersonalizada(false)}>
					<div className="card" style={{ maxWidth: 500, width: '90%', margin: 20 }} onClick={(e) => e.stopPropagation()}>
						<h3>Personalizar Mensagem WhatsApp</h3>
						<div className="form">
							<label className="field">
								<span>Mensagem</span>
								<textarea
									className="input"
									value={mensagemPersonalizada}
									onChange={(e) => setMensagemPersonalizada(e.target.value)}
									placeholder="Digite sua mensagem personalizada..."
									rows={5}
									style={{ resize: 'vertical' }}
									autoFocus
								/>
								<span className="help">Personalize a mensagem antes de enviar</span>
							</label>
							<div className="actions">
								<button className="btn" onClick={() => setMostrarMensagemPersonalizada(false)}>
									Cancelar
								</button>
								<button className="btn primary" onClick={enviarMensagemPersonalizada} disabled={!mensagemPersonalizada.trim()}>
									📱 Enviar WhatsApp
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

