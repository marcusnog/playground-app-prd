import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { lancamentosService, formasPagamentoService, parametrosService, brinquedosService } from '../services/entitiesService'
import { authService } from '../services/authService'
import { calcularValor, temCiclosCobranca } from '../services/utils'
import { PaymentIcon, resolvePaymentKind } from '../ui/icons'
import type { Lancamento, FormaPagamento, Parametros as ParametrosType, Brinquedo as BrinquedoType } from '../services/entitiesService'

type PagamentoLinha = { id: string; formaId: string; valor: string }

export default function Pagamento() {
	const { id } = useParams()
	const navigate = useNavigate()
	const [lanc, setLanc] = useState<Lancamento | null>(null)
	const [formas, setFormas] = useState<FormaPagamento[]>([])
	const [parametros, setParametros] = useState<ParametrosType | null>(null)
	const [brinquedos, setBrinquedos] = useState<BrinquedoType[]>([])
	const [loading, setLoading] = useState(true)
	const [forma, setForma] = useState<string>('') // compat: forma única (cortesia)
	const [pagamentos, setPagamentos] = useState<PagamentoLinha[]>([])
	const [recebido, setRecebido] = useState<string>('')
	const [desconto, setDesconto] = useState<string>('')
	const [codigoCortesia, setCodigoCortesia] = useState<string>('')
	const [saving, setSaving] = useState(false)
	const [tick, setTick] = useState(0)
	const [mostrarModalSupervisor, setMostrarModalSupervisor] = useState(false)
	const [supervisorApelido, setSupervisorApelido] = useState('')
	const [supervisorSenha, setSupervisorSenha] = useState('')
	const [erroSupervisor, setErroSupervisor] = useState('')

	useEffect(() => {
		const t = setInterval(() => setTick(x => x + 1), 10000)
		return () => clearInterval(t)
	}, [])

	useEffect(() => {
		async function loadData() {
			try {
				setLoading(true)
				const [lancamentoData, formasData, parametrosData, brinquedosData] = await Promise.all([
					lancamentosService.get(id!),
					formasPagamentoService.list(),
					parametrosService.get(),
					brinquedosService.list(),
				])
				setLanc(lancamentoData)
				setParametros(parametrosData)
				setBrinquedos(Array.isArray(brinquedosData) ? brinquedosData : [])
				const formasAtivas = formasData.filter(f => f.status === 'ativo')
				setFormas(formasAtivas)
				if (formasAtivas.length > 0) {
					setForma(formasAtivas[0].id)
					setPagamentos([{ id: crypto.randomUUID(), formaId: formasAtivas[0].id, valor: '' }])
				}
			} catch (error) {
				console.error('Erro ao carregar dados:', error)
				alert('Erro ao carregar dados. Tente novamente.')
			} finally {
				setLoading(false)
			}
		}
		if (id) {
			loadData()
		}
	}, [id])

	const formaSelecionada = useMemo(() => 
		formas.find(f => f.id === forma),
		[forma, formas]
	)

	const pagamentosNum = useMemo(() => pagamentos.map(p => ({
		...p,
		valorNum: parseFloat(String(p.valor || '').replace(',', '.')) || 0,
	})), [pagamentos])

	const somaPagamentos = useMemo(() => pagamentosNum.reduce((s, p) => s + p.valorNum, 0), [pagamentosNum])

	const isDinheiro = useMemo(() => {
		if (!formaSelecionada) return false
		return formaSelecionada.descricao.toLowerCase().includes('dinheiro')
	}, [formaSelecionada])

	const isCortesia = useMemo(() => {
		if (!formaSelecionada) return false
		return formaSelecionada.descricao.toLowerCase().includes('cortesia')
	}, [formaSelecionada])

	function minutosDecorridos(iso: string) {
		const ms = Date.now() - new Date(iso).getTime()
		return Math.floor(ms / 60000)
	}

	const valorAtual = useMemo(() => {
		if (!lanc || !parametros) return lanc?.valorCalculado ?? 0
		if (lanc.status !== 'aberto') return lanc.valorCalculado
		const dec = minutosDecorridos(lanc.dataHora)
		const brinquedo = lanc.brinquedoId ? brinquedos.find(b => b.id === lanc.brinquedoId) : undefined
		const temCiclos = temCiclosCobranca(brinquedo, parametros)
		const minutosParaValor = lanc.tempoSolicitadoMin == null
			? dec
			: temCiclos ? dec : Math.min(dec, lanc.tempoSolicitadoMin)
		return calcularValor(parametros as ParametrosType, minutosParaValor, brinquedo as BrinquedoType | undefined)
	}, [lanc, parametros, brinquedos, tick])

	const descontoNum = useMemo(() => parseFloat(desconto.replace(',', '.')) || 0, [desconto])
	const valorFinal = useMemo(() => {
		if (isCortesia) return 0
		return Math.max(0, valorAtual - descontoNum)
	}, [valorAtual, descontoNum, isCortesia])

	const troco = useMemo(() => {
		if (!isDinheiro || !recebido || !lanc) return 0
		const recebidoNum = parseFloat(recebido.replace(',', '.')) || 0
		return Math.max(0, recebidoNum - valorFinal)
	}, [isDinheiro, recebido, lanc, valorFinal])

	async function executarPagamento() {
		if (!lanc) return
		try {
			setSaving(true)
			// Cortesia segue fluxo antigo (forma única + código)
			if (isCortesia) {
				if (!forma) return
				const codigo = codigoCortesia.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
				if (codigo.length !== 8) {
					setSaving(false)
					return alert('Informe o código de cortesia de 8 dígitos')
				}
				const opts: { valorCalculado?: number; valorDesconto?: number; codigoCortesia?: string } = {
					valorCalculado: 0,
					codigoCortesia: codigo,
				}
				await lancamentosService.pagar(lanc.id, forma, opts)
			} else {
				// Split payment
				const linhas = pagamentosNum.filter(p => p.formaId && p.valorNum > 0)
				if (linhas.length === 0) {
					setSaving(false)
					return alert('Adicione ao menos uma forma de pagamento com valor')
				}
				if (Math.abs(somaPagamentos - valorFinal) > 0.01) {
					setSaving(false)
					return alert(`A soma das formas (R$ ${somaPagamentos.toFixed(2)}) deve ser igual ao valor total (R$ ${valorFinal.toFixed(2)})`)
				}
				const opts: { valorCalculado?: number; valorDesconto?: number; pagamentos?: Array<{ formaPagamentoId: string; valor: number }> } = {
					valorCalculado: valorFinal,
					...(descontoNum > 0 && { valorDesconto: descontoNum }),
					pagamentos: linhas.map(l => ({ formaPagamentoId: l.formaId, valor: l.valorNum })),
				}
				// @ts-expect-error backend accepts pagamentos in body; service forwards it
				await lancamentosService.pagar(lanc.id, linhas[0].formaId, opts)
			}
			alert('Pagamento concluído. Gerando recibo...')
			navigate(`/recibo/pagamento/${lanc.id}`)
		} catch (error) {
			console.error('Erro ao processar pagamento:', error)
			alert('Erro ao processar pagamento. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	async function finalizar() {
		if (!lanc) return
		if (isCortesia) {
			if (!forma) return
			const codigo = codigoCortesia.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
			if (codigo.length !== 8) {
				return alert('Informe o código de cortesia de 8 dígitos')
			}
			await executarPagamento()
			return
		}
		// Validação de dinheiro (se existir alguma linha com "dinheiro", usamos o campo recebido como total recebido em dinheiro)
		const temDinheiro = pagamentos.some(p => (formas.find(f => f.id === p.formaId)?.descricao || '').toLowerCase().includes('dinheiro'))
		if (temDinheiro && (!recebido || parseFloat(recebido.replace(',', '.')) < valorFinal)) {
			return alert('O valor recebido deve ser maior ou igual ao valor do pagamento')
		}
		if (descontoNum > valorAtual) {
			return alert('O desconto não pode ser maior que o valor do lançamento')
		}
		if (descontoNum > 0) {
			setMostrarModalSupervisor(true)
			setErroSupervisor('')
			setSupervisorApelido('')
			setSupervisorSenha('')
			return
		}
		await executarPagamento()
	}

	async function confirmarSupervisor() {
		if (!supervisorApelido.trim() || !supervisorSenha) {
			setErroSupervisor('Apelido e senha são obrigatórios')
			return
		}
		const ok = await authService.validarDesconto(supervisorApelido.trim(), supervisorSenha)
		if (!ok) {
			setErroSupervisor('Credenciais inválidas ou usuário sem permissão para autorizar descontos')
			return
		}
		setMostrarModalSupervisor(false)
		await executarPagamento()
	}

	if (loading) {
		return (
			<div className="container" style={{ maxWidth: 560 }}>
				<h2>Pagamento</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	if (!lanc) {
		return (
			<div className="container" style={{ maxWidth: 560 }}>
				<h2>Pagamento</h2>
				<div className="card">
					<div>Registro não encontrado</div>
				</div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 560 }}>
			<h2>Pagamento</h2>
			<div className="card form two">
				<div>
					<div><strong>Criança:</strong> {lanc.nomeCrianca}</div>
					<div><strong>Responsável:</strong> {lanc.nomeResponsavel}</div>
				</div>
				<div>
					<label className="field">
						<span>Valor total</span>
						<input className="input" readOnly value={`R$ ${valorFinal.toFixed(2)}`} />
					</label>
					{!isCortesia && (
						<label className="field">
							<span>Desconto</span>
							<input 
								className="input" 
								type="text"
								value={desconto}
								onFocus={(e) => e.target.select()}
								onChange={(e) => {
									const valor = e.target.value.replace(/[^\d,]/g, '')
									setDesconto(valor)
								}}
								placeholder="0,00"
							/>
						</label>
					)}
					<label className="field">
						<span>Forma de pagamento</span>
						{isCortesia ? (
							<div className="row center">
								<PaymentIcon kind={resolvePaymentKind(forma)} />
								<select className="select" value={forma} onChange={(e) => {
									setForma(e.target.value)
									setRecebido('')
									setCodigoCortesia('')
									const novaForma = formas.find(f => f.id === e.target.value)
									if (novaForma?.descricao.toLowerCase().includes('cortesia')) setDesconto('')
								}}>
									{formas.map((f) => <option key={f.id} value={f.id}>{f.descricao}</option>)}
								</select>
							</div>
						) : (
							<div className="stack">
								{pagamentos.map((p, idx) => (
									<div key={p.id} className="row center" style={{ justifyContent: 'space-between' }}>
										<div className="row center" style={{ flex: 1, gap: 8 }}>
											<PaymentIcon kind={resolvePaymentKind(p.formaId)} />
											<select
												className="select"
												value={p.formaId}
												onChange={(e) => {
													const v = e.target.value
													setPagamentos((prev) => prev.map(x => x.id === p.id ? { ...x, formaId: v } : x))
												}}
											>
												{formas.map((f) => <option key={f.id} value={f.id}>{f.descricao}</option>)}
											</select>
										</div>
										<input
											className="input"
											style={{ width: 120 }}
											type="text"
											placeholder="0,00"
											value={p.valor}
											onFocus={(e) => e.target.select()}
											onChange={(e) => {
												const v = e.target.value.replace(/[^\d,]/g, '')
												setPagamentos((prev) => prev.map(x => x.id === p.id ? { ...x, valor: v } : x))
											}}
										/>
										{pagamentos.length > 1 && (
											<button
												className="btn"
												type="button"
												onClick={() => setPagamentos(prev => prev.filter(x => x.id !== p.id))}
											>
												-
											</button>
										)}
										{idx === pagamentos.length - 1 && (
											<button
												className="btn"
												type="button"
												onClick={() => {
													const first = formas[0]?.id || ''
													setPagamentos(prev => [...prev, { id: crypto.randomUUID(), formaId: first, valor: '' }])
												}}
											>
												Mais
											</button>
										)}
									</div>
								))}
								<div className="help">Soma das formas: R$ {somaPagamentos.toFixed(2)} / Total: R$ {valorFinal.toFixed(2)}</div>
							</div>
						)}
					</label>
					{isCortesia && (
						<label className="field">
							<span>Código de Cortesia *</span>
							<input 
								className="input" 
								type="text"
								value={codigoCortesia}
								onChange={(e) => setCodigoCortesia(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
								placeholder="8 dígitos"
								maxLength={8}
								style={{ fontFamily: 'monospace', letterSpacing: 2 }}
							/>
							<span className="help">Digite o código de 8 dígitos gerado na aba Cortesia</span>
						</label>
					)}
					{isDinheiro && (
						<>
							<label className="field">
								<span>Valor Recebido *</span>
								<input 
									className="input" 
									type="text"
									value={recebido}
									onFocus={(e) => e.target.select()}
									onChange={(e) => {
										const valor = e.target.value.replace(/[^\d,]/g, '')
										setRecebido(valor)
									}}
									placeholder="0,00"
								/>
							</label>
							{troco > 0 && (
								<label className="field">
									<span>Troco</span>
									<input 
										className="input" 
										readOnly 
										value={`R$ ${troco.toFixed(2)}`}
										style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'var(--success)', fontWeight: 'bold' }}
									/>
								</label>
							)}
							{troco < 0 && (
								<div style={{ color: 'var(--danger)', fontSize: '0.9rem', marginTop: -8 }}>
									Valor insuficiente. Faltam R$ {Math.abs(troco).toFixed(2)}
								</div>
							)}
						</>
					)}
				</div>
				<div className="actions" style={{ gridColumn: '1 / -1' }}>
					<button 
						className="btn primary icon" 
						onClick={finalizar}
						disabled={saving || !forma || (isCortesia && codigoCortesia.trim().replace(/[^A-Z0-9]/g, '').length !== 8)}
					>
						{saving ? 'Processando...' : '✅ Finalizar'}
					</button>
				</div>
			</div>

			{/* Modal de autorização de desconto */}
			{mostrarModalSupervisor && (
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					background: 'rgba(0,0,0,0.6)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 1000,
				}} onClick={() => !saving && setMostrarModalSupervisor(false)}>
					<div className="card" style={{ maxWidth: 360, margin: 16 }} onClick={e => e.stopPropagation()}>
						<h3>Autorização de Desconto</h3>
						<p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 16 }}>
							Digite o apelido e a senha do supervisor/coordenador para autorizar o desconto de R$ {descontoNum.toFixed(2)}.
						</p>
						<label className="field">
							<span>Apelido do supervisor *</span>
							<input 
								className="input" 
								value={supervisorApelido} 
								onChange={(e) => setSupervisorApelido(e.target.value)} 
								placeholder="apelido"
								autoFocus
							/>
						</label>
						<label className="field">
							<span>Senha *</span>
							<input 
								className="input" 
								type="password" 
								value={supervisorSenha} 
								onChange={(e) => setSupervisorSenha(e.target.value)} 
								placeholder="senha"
							/>
						</label>
						{erroSupervisor && (
							<div style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: 12 }}>{erroSupervisor}</div>
						)}
						<div className="row" style={{ gap: 8, marginTop: 16 }}>
							<button className="btn" onClick={() => setMostrarModalSupervisor(false)} disabled={saving}>Cancelar</button>
							<button className="btn primary" onClick={confirmarSupervisor} disabled={saving}>
								{saving ? 'Processando...' : 'Autorizar e Finalizar'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}


