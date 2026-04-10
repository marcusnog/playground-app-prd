import { useMemo, useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { calcularValor, extrairDataSomente } from '../services/utils'
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
		tempoInicialMin: 30,
		tempoAdicionalMin: 0,
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
		!!(brinquedoSelecionado && /trenzinho|infl[aá]vei?s?/i.test(brinquedoSelecionado.nome)),
		[brinquedoSelecionado]
	)

	// Brinquedo normalizado para cálculo (API usa campos na raiz; mock/legado pode usar regrasCobranca)
	const brinquedoParaCalculo = useMemo((): BrinquedoType | undefined => {
		if (!brinquedoSelecionado) return undefined
		const r = brinquedoSelecionado.regrasCobranca
		const valorIni = brinquedoSelecionado.valorInicial !== undefined ? brinquedoSelecionado.valorInicial : r?.valorInicial
		const iniMin = brinquedoSelecionado.inicialMinutos !== undefined ? brinquedoSelecionado.inicialMinutos : r?.inicialMinutos
		const cicMin = brinquedoSelecionado.cicloMinutos !== undefined ? brinquedoSelecionado.cicloMinutos : r?.cicloMinutos
		return {
			...brinquedoSelecionado,
			valorInicial: valorIni != null ? valorIni : parametros?.valorInicialReais,
			inicialMinutos: iniMin !== undefined ? iniMin : (parametros?.valorInicialMinutos ?? 30),
			cicloMinutos: cicMin,
			valorCiclo: brinquedoSelecionado.valorCiclo ?? r?.valorCiclo ?? 0,
			valorCiclo2: brinquedoSelecionado.valorCiclo2 !== undefined ? brinquedoSelecionado.valorCiclo2 : null,
			cicloTier2Minutos: brinquedoSelecionado.cicloTier2Minutos !== undefined ? brinquedoSelecionado.cicloTier2Minutos : null,
		}
	}, [brinquedoSelecionado, parametros?.valorInicialReais, parametros?.valorInicialMinutos])

	// Ao selecionar um brinquedo, sincronizar tempo inicial com as regras do brinquedo
	useEffect(() => {
		if (!brinquedoSelecionado || isModoQuantidade) return
		const iniMin = brinquedoSelecionado.inicialMinutos ?? brinquedoSelecionado.regrasCobranca?.inicialMinutos ?? parametros?.valorInicialMinutos ?? 30
		setForm(f => {
			if (iniMin !== null && (f.tempoInicialMin !== iniMin || f.tempoAdicionalMin !== 0)) {
				return { ...f, tempoInicialMin: iniMin, tempoAdicionalMin: 0 }
			}
			if (iniMin === null && (f.tempoInicialMin !== (parametros?.valorInicialMinutos ?? 30) || f.tempoAdicionalMin !== 0)) {
				return { ...f, tempoInicialMin: parametros?.valorInicialMinutos ?? 30, tempoAdicionalMin: 0 }
			}
			return f
		})
	}, [form.brinquedoId, brinquedoSelecionado, isModoQuantidade, parametros?.valorInicialMinutos])

	const tempoTotal = useMemo(() =>
		form.tempoInicialMin + form.tempoAdicionalMin,
		[form.tempoInicialMin, form.tempoAdicionalMin]
	)
	
	const valor = useMemo(() => {
		// Sem brinquedo selecionado: valor zerado por padrão
		if (!brinquedoSelecionado) return 0
		if (!parametros) return 0
		
		// Modo quantidade (TRENZINHO/INFLÁVEL): valor = quantidade * valor unitário
		if (isModoQuantidade && brinquedoSelecionado) {
			const valorUnitario = Number(brinquedoSelecionado.valorInicial ?? brinquedoSelecionado.regrasCobranca?.valorInicial ?? parametros.valorInicialReais ?? 20)
			return Math.max(0, (form.quantidade || 1)) * valorUnitario
		}
		
		// Calcular valor baseado no tempo total
		// Múltiplo exato do período inicial: preço proporcional por bloco (ex: 60 min = 2×R$25 = R$50)
		// Tempo parcial além de um bloco: usa cálculo de ciclos normal (ex: 40 min = R$25 + ciclos)
		const iniMin = Number(brinquedoParaCalculo?.inicialMinutos ?? parametros.valorInicialMinutos ?? 30)
		const iniReais = Number(brinquedoParaCalculo?.valorInicial ?? parametros.valorInicialReais ?? 0)
		const isMultiploBlocos = iniMin > 0 && tempoTotal > 0 && tempoTotal % iniMin === 0
		const valorCalculado = isMultiploBlocos
			? (tempoTotal / iniMin) * iniReais
			: calcularValor(parametros as ParametrosType, tempoTotal, brinquedoParaCalculo as BrinquedoType | undefined)

		if (form.tempoLivre) {
			return valorAntesTempoLivre > 0 ? valorAntesTempoLivre : valorCalculado
		}
		return valorCalculado
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tempoTotal, form.tempoLivre, form.quantidade, form.brinquedoId, isModoQuantidade, parametros, brinquedoParaCalculo, valorAntesTempoLivre])

	// Atualizar valorAntesTempoLivre quando o valor calculado muda (fora do tempo livre)
	useEffect(() => {
		if (form.tempoLivre || !parametros) return
		const iniMin2 = Number(brinquedoParaCalculo?.inicialMinutos ?? parametros.valorInicialMinutos ?? 30)
		const iniReais2 = Number(brinquedoParaCalculo?.valorInicial ?? parametros.valorInicialReais ?? 0)
		const isMultiploBlocos2 = iniMin2 > 0 && tempoTotal > 0 && tempoTotal % iniMin2 === 0
		const v = isModoQuantidade && brinquedoSelecionado
			? Math.max(0, (form.quantidade || 1)) * Number(brinquedoSelecionado.valorInicial ?? brinquedoSelecionado.regrasCobranca?.valorInicial ?? parametros.valorInicialReais ?? 20)
			: isMultiploBlocos2 ? (tempoTotal / iniMin2) * iniReais2 : calcularValor(parametros as ParametrosType, tempoTotal, brinquedoParaCalculo as BrinquedoType | undefined)
		if (v > 0) setValorAntesTempoLivre(v)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form.tempoLivre, tempoTotal, form.quantidade, form.brinquedoId, isModoQuantidade, parametros, brinquedoParaCalculo])

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
		if (!parametros) {
			return alert('Erro: Parâmetros não carregados')
		}
		if (isModoQuantidade) {
			if (!form.brinquedoId) return alert('Selecione o brinquedo')
			if (!form.quantidade || form.quantidade < 1) return alert('Informe a quantidade')
		} else {
			if (!form.nomeCrianca.trim() || !form.nomeResponsavel.trim()) {
				return alert('Preencha os campos obrigatórios')
			}
		}

		try {
			const payload = isModoQuantidade
				? {
					nomeCrianca: 'Quantidade',
					nomeResponsavel: '-',
					tipoParente: undefined,
					whatsappResponsavel: '',
					numeroPulseira: undefined,
					brinquedoId: form.brinquedoId,
					clienteId: undefined,
					tempoSolicitadoMin: null,
					quantidade: form.quantidade,
					valorCalculado: valor,
				}
				: {
					nomeCrianca: form.nomeCrianca.trim(),
					nomeResponsavel: form.nomeResponsavel.trim(),
					tipoParente: form.tipoParente || undefined,
					whatsappResponsavel: form.whatsappResponsavel.trim(),
					numeroPulseira: form.numeroPulseira.trim() || undefined,
					brinquedoId: form.brinquedoId || undefined,
					clienteId: form.clienteId || undefined,
					tempoSolicitadoMin: form.tempoLivre ? null : tempoTotal,
					tempoInicialMin: form.tempoLivre ? undefined : form.tempoInicialMin,
					tempoAdicionalMin: form.tempoLivre ? undefined : form.tempoAdicionalMin,
					quantidade: undefined,
					valorCalculado: valor,
				}
			const novoLancamento = await lancamentosService.create(payload as Parameters<typeof lancamentosService.create>[0])
			
			if (isModoQuantidade) {
				navigate(`/pagamento/${novoLancamento.id}`)
			} else {
				alert('Lançamento salvo. Gerando cupom...')
				navigate(`/recibo/lancamento/${novoLancamento.id}`)
			}
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
								<Link to="/caixa/abertura" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>Ir para Abertura</Link>
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
				{/* Linha 1: Brinquedo + (Quantidade em modo quantidade, ou Nome da criança) */}
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
					{isModoQuantidade ? (
						<label className="field">
							<span>Quantidade</span>
							<input 
								className="input" 
								type="number" 
								min={1} 
								value={form.quantidade} 
								onFocus={(e) => e.target.select()}
								onChange={(e) => setForm({ ...form, quantidade: Math.max(1, Number(e.target.value) || 1) })} 
							/>
							<span className="help">Quantidade de pulseiras</span>
						</label>
					) : (
						<label className="field">
							<span>Nome da criança *</span>
							<input className="input" value={form.nomeCrianca} onChange={(e) => setForm({ ...form, nomeCrianca: e.target.value })} />
						</label>
					)}
				</div>
				{/* Cliente Cadastrado + Novo Cliente - visível em ambos os modos */}
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
								onClick={() => setMostrarFormCliente(true)}
								style={{ whiteSpace: 'nowrap' }}
							>
								➕ Novo Cliente
							</button>
						</div>
						{!isModoQuantidade && (
							<span className="help">Busque por nome da criança, pai/mãe, data de nascimento ou telefone. Múltiplas crianças com o mesmo telefone aparecem listadas.</span>
						)}
					</label>
				</div>
				{/* Demais campos: ocultos em modo quantidade (inflável/trenzinho) */}
				{!isModoQuantidade && (
				<>
				<div>
					<label className="field">
						<span>Data/Hora</span>
						<input className="input" value={new Date().toLocaleString()} readOnly />
					</label>
					<label className="field">
						<span>Tipo do parente</span>
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
				{/* Tempo Inicial + Tempo Adicional + Tempo Livre (apenas fora do modo quantidade) */}
				<div>
						<label className="field">
							<span>Tempo Inicial (min)</span>
							<input className="input" type="number" min={0} disabled={form.tempoLivre} value={form.tempoInicialMin} onFocus={(e) => e.target.select()} onChange={(e) => setForm({ ...form, tempoInicialMin: Math.max(0, Number(e.target.value) || 0) })} />
						</label>
						<label className="field">
							<span>Tempo Adicional (min)</span>
							<input className="input" type="number" min={0} disabled={form.tempoLivre} value={form.tempoAdicionalMin} onFocus={(e) => e.target.select()} onChange={(e) => setForm({ ...form, tempoAdicionalMin: Math.max(0, Number(e.target.value) || 0) })} />
							<span className="help">Total: {tempoTotal} min</span>
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
												tempoTotal,
												brinquedoParaCalculo as BrinquedoType | undefined
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
				</>
				)}
				<div className="actions" style={{ gridColumn: '1 / -1' }}>
					<strong style={{ fontSize: '1.2rem' }}>Valor: R$ {valor.toFixed(2)}</strong>
					<button 
						className="btn primary icon" 
						onClick={onSave}
						disabled={!caixaAberto}
					>
						{caixaAberto ? '🧾 Salvar e Gerar Cupom' : '❌ Caixa Fechado'}
					</button>
				</div>
			</div>

			{/* Modal Cadastrar Novo Cliente */}
			{mostrarFormCliente && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.5)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						zIndex: 1000,
					}}
					onClick={() => setMostrarFormCliente(false)}
				>
					<div
						className="card"
						style={{ maxWidth: 500, width: '90%', margin: 20 }}
						onClick={(e) => e.stopPropagation()}
					>
						<h3 style={{ marginTop: 0, marginBottom: 16 }}>Cadastrar Novo Cliente</h3>
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
								<button className="btn" onClick={() => setMostrarFormCliente(false)}>
									Cancelar
								</button>
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
											const novoCliente = await clientesService.create({
												nomeCompleto: formCliente.nomeCompleto.trim(),
												dataNascimento: extrairDataSomente(formCliente.dataNascimento),
												nomePai: formCliente.nomePai.trim() || '',
												nomeMae: formCliente.nomeMae.trim() || '',
												telefoneWhatsapp: formCliente.telefoneWhatsapp.trim(),
											})
											const clientesData = await clientesService.list()
											setClientes(clientesData)
											selecionarCliente(novoCliente.id)
											setFormCliente({
												nomeCompleto: '',
												dataNascimento: '',
												nomePai: '',
												nomeMae: '',
												telefoneWhatsapp: '',
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
				</div>
			)}
		</div>
	)
}


