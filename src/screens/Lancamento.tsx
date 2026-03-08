import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { calcularValor, temCiclosCobranca } from '../services/utils'
import { brinquedosService, clientesService, parametrosService, lancamentosService } from '../services/entitiesService'
import { useCaixa } from '../hooks/useCaixa'
import ClienteAutocomplete from '../components/ClienteAutocomplete'
import type { Brinquedo as BrinquedoType, Cliente, Parametros as ParametrosType } from '../services/entitiesService'

export default function Lancamento() {
	const { caixa, caixaAberto, loading: loadingCaixa, refresh: refreshCaixa } = useCaixa()
	const [brinquedos, setBrinquedos] = useState<BrinquedoType[]>([])
	const [parametros, setParametros] = useState<ParametrosType | null>(null)
	const [clientes, setClientes] = useState<Cliente[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		async function loadData() {
			try {
				setLoading(true)
				const [brinquedosData, parametrosData, clientesData] = await Promise.all([
					brinquedosService.list(),
					parametrosService.get(),
					clientesService.list(),
				])
				setBrinquedos(Array.isArray(brinquedosData) ? brinquedosData : [])
				setParametros(parametrosData)
				setClientes(Array.isArray(clientesData) ? clientesData : [])
			} catch (error) {
				console.error('Erro ao carregar dados:', error)
				alert('Erro ao carregar dados. Tente novamente.')
			} finally {
				setLoading(false)
			}
		}
		loadData()
	}, [])

	// Atualizar estado do caixa quando a janela recebe foco ou quando volta para esta aba
	useEffect(() => {
		const handleFocus = () => {
			refreshCaixa()
		}
		const handleVisibilityChange = () => {
			if (!document.hidden) {
				refreshCaixa()
			}
		}
		
		window.addEventListener('focus', handleFocus)
		document.addEventListener('visibilitychange', handleVisibilityChange)
		
		return () => {
			window.removeEventListener('focus', handleFocus)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [refreshCaixa])
	const navigate = useNavigate()
	const [form, setForm] = useState({
		clienteId: '',
		nomeCrianca: '',
		nomeResponsavel: '',
		tipoParente: '',
		whatsappResponsavel: '',
		numeroPulseira: '',
		brinquedoId: '',
		tempoSolicitadoMin: 30,
		tempoLivre: false,
		quantidade: 1,
	})
	const [mostrarFormCliente, setMostrarFormCliente] = useState(false)
	const [formCliente, setFormCliente] = useState({
		nomeCompleto: '',
		dataNascimento: '',
		nomePai: '',
		nomeMae: '',
		telefoneWhatsapp: ''
	})
	const [valorAntesTempoLivre, setValorAntesTempoLivre] = useState<number>(0)

	// Brinquedos disponíveis: se o caixa em uso tem brinquedos vinculados, só esses; senão todos
	const brinquedosDoCaixa = useMemo(() => {
		if (!caixa?.brinquedos?.length) return brinquedos
		const list = (caixa.brinquedos as { brinquedo?: BrinquedoType }[])
			.map((cb) => cb.brinquedo)
			.filter((b): b is BrinquedoType => !!b)
		return list.length > 0 ? list : brinquedos
	}, [caixa?.brinquedos, brinquedos])

	const brinquedoSelecionado = useMemo(() => 
		form.brinquedoId ? brinquedosDoCaixa.find(b => b.id === form.brinquedoId) : undefined,
		[form.brinquedoId, brinquedosDoCaixa]
	)

	const isModoQuantidade = useMemo(() =>
		!!(brinquedoSelecionado && /trenzinho|infl[aá]vel/i.test(brinquedoSelecionado.nome)),
		[brinquedoSelecionado]
	)
	
	const valor = useMemo(() => {
		if (!parametros) return 0
		
		// Modo quantidade (TRENZINHO/INFLÁVEL): valor = quantidade * valor unitário
		if (isModoQuantidade && brinquedoSelecionado) {
			const valorUnitario = Number(brinquedoSelecionado.valorInicial ?? brinquedoSelecionado.regrasCobranca?.valorInicial ?? parametros.valorInicialReais ?? 20)
			return Math.max(0, (form.quantidade || 1)) * valorUnitario
		}
		
		// Calcular valor baseado no tempo solicitado
		const valorCalculado = calcularValor(
			parametros as ParametrosType, 
			form.tempoSolicitadoMin,
			brinquedoSelecionado as BrinquedoType | undefined
		)
		
		if (form.tempoLivre) {
			return valorAntesTempoLivre > 0 ? valorAntesTempoLivre : valorCalculado
		}
		return valorCalculado
	}, [form.tempoSolicitadoMin, form.tempoLivre, form.quantidade, form.brinquedoId, isModoQuantidade, parametros, brinquedoSelecionado, valorAntesTempoLivre])

	// Atualizar valorAntesTempoLivre quando o valor calculado muda (fora do tempo livre)
	useEffect(() => {
		if (form.tempoLivre || !parametros) return
		const v = isModoQuantidade && brinquedoSelecionado
			? Math.max(0, (form.quantidade || 1)) * Number(brinquedoSelecionado.valorInicial ?? brinquedoSelecionado.regrasCobranca?.valorInicial ?? parametros.valorInicialReais ?? 20)
			: calcularValor(parametros as ParametrosType, form.tempoSolicitadoMin, brinquedoSelecionado as BrinquedoType | undefined)
		if (v > 0) setValorAntesTempoLivre(v)
	}, [form.tempoLivre, form.tempoSolicitadoMin, form.quantidade, form.brinquedoId, isModoQuantidade, parametros, brinquedoSelecionado])

	function selecionarCliente(clienteId: string) {
		if (!clienteId) {
			setForm({ ...form, clienteId: '', nomeCrianca: '', nomeResponsavel: '', tipoParente: '', whatsappResponsavel: '' })
			return
		}
		const cliente = clientes.find(c => c.id === clienteId)
		if (cliente) {
			setForm({
				...form,
				clienteId: cliente.id,
				nomeCrianca: cliente.nomeCompleto,
				nomeResponsavel: cliente.nomePai || cliente.nomeMae || '',
				tipoParente: cliente.nomePai ? 'pai' : cliente.nomeMae ? 'mae' : '',
				whatsappResponsavel: cliente.telefoneWhatsapp
			})
		}
	}

	async function onSave() {
		if (!caixaAberto || !caixa) {
			alert('Não é possível fazer lançamentos com o caixa fechado. Abra o caixa primeiro.')
			return
		}
		if (!form.nomeCrianca.trim() || !form.nomeResponsavel.trim() || !form.tipoParente) {
			return alert('Preencha os campos obrigatórios')
		}
		if (!parametros) {
			return alert('Erro: Parâmetros não carregados')
		}

		try {
			const novoLancamento = await lancamentosService.create({
				nomeCrianca: form.nomeCrianca.trim(),
				nomeResponsavel: form.nomeResponsavel.trim(),
				tipoParente: form.tipoParente || undefined,
				whatsappResponsavel: form.whatsappResponsavel.trim(),
				numeroPulseira: form.numeroPulseira.trim() || undefined,
				brinquedoId: form.brinquedoId || undefined,
				clienteId: form.clienteId || undefined,
				tempoSolicitadoMin: isModoQuantidade ? null : (form.tempoLivre ? null : form.tempoSolicitadoMin),
				quantidade: isModoQuantidade ? form.quantidade : undefined,
				valorCalculado: valor,
			} as Parameters<typeof lancamentosService.create>[0])
			
			alert('Lançamento salvo. Gerando cupom...')
			navigate(`/recibo/lancamento/${novoLancamento.id}`)
		} catch (error) {
			console.error('Erro ao salvar lançamento:', error)
			alert('Erro ao salvar lançamento. Tente novamente.')
		}
	}

	if (loading || loadingCaixa) {
		return (
			<div className="container" style={{ maxWidth: 860 }}>
				<h2>Novo Lançamento</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 860 }}>
			<h2>Novo Lançamento</h2>
			
			{/* Status do Caixa */}
			{!caixaAberto && (
				<div className="card" style={{ marginBottom: 16, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<div className="row center" style={{ gap: 8 }}>
						<span style={{ fontSize: '1.2rem' }}>⚠️</span>
						<div>
							<strong style={{ color: 'var(--danger)' }}>Caixa Fechado</strong>
							<div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
								É necessário abrir o caixa antes de fazer lançamentos. 
								<a href="/caixa/abertura" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Ir para Abertura</a>
							</div>
						</div>
					</div>
				</div>
			)}

			{caixaAberto && (
				<div className="card" style={{ marginBottom: 16, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)' }}>
					<div className="row center" style={{ gap: 8 }}>
						<span style={{ fontSize: '1.2rem' }}>✅</span>
						<div>
							<strong style={{ color: 'var(--success)' }}>Caixa Aberto</strong>
							<div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
								Lançamentos permitidos. Caixa aberto em {caixa ? new Date(caixa.data).toLocaleDateString('pt-BR') : ''}
							</div>
						</div>
					</div>
				</div>
			)}

			<div className="card form two" style={{ opacity: caixaAberto ? 1 : 0.6, pointerEvents: caixaAberto ? 'auto' : 'none' }}>
				{/* Linha 1: Brinquedo + Nome da criança */}
				<div>
					<label className="field">
						<span>Brinquedo</span>
						<select className="select" value={form.brinquedoId} onChange={(e) => setForm({ ...form, brinquedoId: e.target.value })}>
							<option value="">(opcional)</option>
							{brinquedosDoCaixa.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
						</select>
					</label>
				</div>
				<div>
					<label className="field">
						<span>Nome da criança *</span>
						<input className="input" value={form.nomeCrianca} onChange={(e) => setForm({ ...form, nomeCrianca: e.target.value })} />
					</label>
				</div>
				{/* Linha 2: Cliente Cadastrado */}
				<div style={{ gridColumn: '1 / -1' }}>
					<label className="field">
						<span>Cliente Cadastrado (Opcional)</span>
						<div className="row" style={{ gap: 8, alignItems: 'center' }}>
							<ClienteAutocomplete
								clientes={clientes}
								value={form.clienteId}
								onSelect={selecionarCliente}
								placeholder="Selecione ou digite para buscar..."
								style={{ flex: 1 }}
							/>
							<button 
								className="btn" 
								type="button"
								onClick={() => setMostrarFormCliente(!mostrarFormCliente)}
								style={{ whiteSpace: 'nowrap' }}
							>
								{mostrarFormCliente ? '✖️ Cancelar' : '➕ Novo Cliente'}
							</button>
						</div>
						<span className="help">Busque por nome, responsável, data de nascimento ou telefone</span>
					</label>
					{mostrarFormCliente && (
						<div className="card" style={{ marginTop: 8, background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--primary)' }}>
							<h4 style={{ marginTop: 0, marginBottom: 12 }}>Cadastrar Novo Cliente</h4>
							<div className="form two">
								<label className="field">
									<span>Nome Completo da Criança *</span>
									<input 
										className="input" 
										value={formCliente.nomeCompleto} 
										onChange={(e) => setFormCliente({ ...formCliente, nomeCompleto: e.target.value })} 
										placeholder="Nome completo da criança"
									/>
								</label>
								<label className="field">
									<span>Data de Nascimento *</span>
									<input 
										type="date" 
										className="input" 
										value={formCliente.dataNascimento} 
										onChange={(e) => setFormCliente({ ...formCliente, dataNascimento: e.target.value })} 
									/>
								</label>
								<label className="field">
									<span>Nome do Pai</span>
									<input 
										className="input" 
										value={formCliente.nomePai} 
										onChange={(e) => setFormCliente({ ...formCliente, nomePai: e.target.value })} 
										placeholder="Nome completo do pai"
									/>
								</label>
								<label className="field">
									<span>Nome da Mãe</span>
									<input 
										className="input" 
										value={formCliente.nomeMae} 
										onChange={(e) => setFormCliente({ ...formCliente, nomeMae: e.target.value })} 
										placeholder="Nome completo da mãe"
									/>
								</label>
								<label className="field" style={{ gridColumn: '1 / -1' }}>
									<span>WhatsApp para Contato *</span>
									<input 
										className="input" 
										value={formCliente.telefoneWhatsapp} 
										onChange={(e) => setFormCliente({ ...formCliente, telefoneWhatsapp: e.target.value })} 
										placeholder="5599999999999"
									/>
								</label>
								<div className="actions" style={{ gridColumn: '1 / -1' }}>
									<button 
										className="btn primary" 
										onClick={async () => {
											if (!formCliente.nomeCompleto.trim()) {
												return alert('Informe o nome completo da criança')
											}
											if (!formCliente.dataNascimento) {
												return alert('Informe a data de nascimento')
											}
											if (!formCliente.telefoneWhatsapp.trim()) {
												return alert('Informe o WhatsApp para contato')
											}
											
											try {
												const dataNascimentoISO = new Date(formCliente.dataNascimento + 'T00:00:00').toISOString()
												const novoCliente = await clientesService.create({
													nomeCompleto: formCliente.nomeCompleto.trim(),
													dataNascimento: dataNascimentoISO,
													nomePai: formCliente.nomePai.trim() || '',
													nomeMae: formCliente.nomeMae.trim() || '',
													telefoneWhatsapp: formCliente.telefoneWhatsapp.trim()
												})
												
												// Recarregar lista de clientes
												const clientesData = await clientesService.list()
												setClientes(clientesData)
												
												// Preencher formulário com o novo cliente
												selecionarCliente(novoCliente.id)
												
												// Limpar e fechar formulário
												setFormCliente({
													nomeCompleto: '',
													dataNascimento: '',
													nomePai: '',
													nomeMae: '',
													telefoneWhatsapp: ''
												})
												setMostrarFormCliente(false)
												alert('Cliente cadastrado com sucesso!')
											} catch (error) {
												console.error('Erro ao cadastrar cliente:', error)
												alert('Erro ao cadastrar cliente. Tente novamente.')
											}
										}}
									>
										💾 Cadastrar e Usar
									</button>
								</div>
							</div>
						</div>
					)}
				</div>
				<div>
					<label className="field">
						<span>Data/Hora</span>
						<input className="input" value={new Date().toLocaleString()} readOnly />
					</label>
					<label className="field">
						<span>Tipo do parente *</span>
						<select 
							className="select" 
							value={form.tipoParente} 
							onChange={(e) => setForm({ ...form, tipoParente: e.target.value })}
						>
							<option value="">Selecione...</option>
							<option value="pai">Pai</option>
							<option value="mae">Mãe</option>
							<option value="avo">Avô</option>
							<option value="ava">Avó</option>
							<option value="tio">Tio</option>
							<option value="tia">Tia</option>
							<option value="outro">Outro</option>
						</select>
					</label>
					<label className="field">
						<span>Nome do responsável *</span>
						<input className="input" value={form.nomeResponsavel} onChange={(e) => setForm({ ...form, nomeResponsavel: e.target.value })} />
					</label>
				</div>
				<div>
					<label className="field">
						<span>WhatsApp do responsável</span>
						<input className="input" value={form.whatsappResponsavel} onChange={(e) => setForm({ ...form, whatsappResponsavel: e.target.value })} placeholder="5599999999999" />
					</label>
					<label className="field">
						<span>Número da pulseira</span>
						<input className="input" value={form.numeroPulseira} onChange={(e) => setForm({ ...form, numeroPulseira: e.target.value })} />
					</label>
				</div>
				{/* Modo quantidade (TRENZINHO/INFLÁVEL) ou Tempo Solicitado + Tempo Livre */}
				{isModoQuantidade ? (
					<div style={{ gridColumn: '1 / -1' }}>
						<label className="field">
							<span>Quantidades</span>
							<input 
								className="input" 
								type="number" 
								min={1} 
								value={form.quantidade} 
								onFocus={(e) => e.target.select()}
								onChange={(e) => setForm({ ...form, quantidade: Math.max(1, Number(e.target.value) || 1) })} 
							/>
							<span className="help">Quantidade de pulseiras que o responsável comprou</span>
						</label>
					</div>
				) : (
					<div>
						<label className="field">
							<span>Tempo Solicitado (minutos)</span>
							<input className="input" type="number" disabled={form.tempoLivre} value={form.tempoSolicitadoMin} onFocus={(e) => e.target.select()} onChange={(e) => setForm({ ...form, tempoSolicitadoMin: Number(e.target.value) })} />
						</label>
						<label className="field">
							<span>Tempo Livre</span>
							<div className="row">
								<input 
									type="checkbox" 
									checked={form.tempoLivre} 
									onChange={(e) => {
										const novoTempoLivre = e.target.checked
										if (novoTempoLivre && parametros) {
											const valorAtual = calcularValor(
												parametros as ParametrosType,
												form.tempoSolicitadoMin,
												brinquedoSelecionado as BrinquedoType | undefined
											)
											if (valorAtual > 0) setValorAntesTempoLivre(valorAtual)
										}
										setForm({ ...form, tempoLivre: novoTempoLivre })
									}} 
								/> 
								<span>Ativar</span>
							</div>
							{form.tempoLivre && (
								<span className="help" style={{ color: 'var(--warning)' }}>
									Tempo livre ativado. Valor mantido: R$ {valor.toFixed(2)}
								</span>
							)}
						</label>
					</div>
				)}
				<div className="actions" style={{ gridColumn: '1 / -1' }}>
					<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
						<strong style={{ fontSize: '1.2rem' }}>Valor: R$ {valor.toFixed(2)}</strong>
						{!isModoQuantidade && !form.tempoLivre && parametros && (
							<span className="help" style={{ fontSize: '0.85rem' }}>
								{(() => {
									const iniMin = brinquedoSelecionado
										? (brinquedoSelecionado.inicialMinutos ?? brinquedoSelecionado.regrasCobranca?.inicialMinutos ?? parametros.valorInicialMinutos)
										: parametros.valorInicialMinutos
									const valIni = brinquedoSelecionado
										? Number(brinquedoSelecionado.valorInicial ?? brinquedoSelecionado.regrasCobranca?.valorInicial ?? parametros.valorInicialReais)
										: (parametros.valorInicialReais || 0)
									const temCiclos = temCiclosCobranca(brinquedoSelecionado as BrinquedoType, parametros)
									const dentroInicial = iniMin != null && form.tempoSolicitadoMin <= iniMin
									if (temCiclos) {
										return dentroInicial
											? `Valor inicial (até ${iniMin} min): R$ ${valIni.toFixed(2)}`
											: `Valor inicial: R$ ${valIni.toFixed(2)} + ciclos adicionais`
									}
									return `Valor: R$ ${valIni.toFixed(2)}`
								})()}
							</span>
						)}
						{isModoQuantidade && brinquedoSelecionado && (
							<span className="help" style={{ fontSize: '0.85rem' }}>
								{form.quantidade} x R$ {(Number(brinquedoSelecionado.valorInicial ?? brinquedoSelecionado.regrasCobranca?.valorInicial ?? parametros?.valorInicialReais ?? 20)).toFixed(2)}
							</span>
						)}
					</div>
					<button 
						className="btn primary icon" 
						onClick={onSave}
						disabled={!caixaAberto}
					>
						{caixaAberto ? '🧾 Salvar e Gerar Cupom' : '❌ Caixa Fechado'}
					</button>
				</div>
			</div>
		</div>
	)
}


