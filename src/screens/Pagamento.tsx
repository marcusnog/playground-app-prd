import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { lancamentosService, formasPagamentoService, parametrosService, brinquedosService } from '../services/entitiesService'
import { authService } from '../services/authService'
import { calcularValorExibidoLancamento, resolverNomesCriancas } from '../services/utils'
import { PaymentIcon, resolvePaymentKind } from '../ui/icons'
import type { Lancamento, FormaPagamento, Parametros as ParametrosType, Brinquedo as BrinquedoType } from '../services/entitiesService'

type PagamentoLinha = { id: string; formaId: string; valor: string }

function normalizarCodigoCortesia(codigo: string): string {
	return codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function obterMensagemErroPagamento(error: unknown, codigoCortesia: string, isCortesia: boolean): string {
	const mensagem = error && typeof error === 'object' && 'message' in error
		? String((error as { message?: unknown }).message || '')
		: ''
	const mensagemNormalizada = mensagem.toLowerCase()
	const codigo = normalizarCodigoCortesia(codigoCortesia)

	if (isCortesia && mensagemNormalizada.includes('já foi utilizado') && codigo) {
		return `A cortesia ${codigo} já foi utilizada. Confira se esse código já foi usado ou gere uma nova cortesia.`
	}

	return mensagem || 'Erro ao processar pagamento. Tente novamente.'
}

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
	const [desconto, setDesconto] = useState<string>('')
	const [codigoCortesia, setCodigoCortesia] = useState<string>('')
	const [saving, setSaving] = useState(false)
	const [tick, setTick] = useState(0)
	const [mostrarModalSupervisor, setMostrarModalSupervisor] = useState(false)
	const [supervisorApelido, setSupervisorApelido] = useState('')
	const [supervisorSenha, setSupervisorSenha] = useState('')
	const [erroSupervisor, setErroSupervisor] = useState('')
	const [mostrarModalCancelamento, setMostrarModalCancelamento] = useState(false)
	const [adminApelidoCancelamento, setAdminApelidoCancelamento] = useState('')
	const [adminSenhaCancelamento, setAdminSenhaCancelamento] = useState('')
	const [erroAdminCancelamento, setErroAdminCancelamento] = useState('')

	const compactControlStyle: React.CSSProperties = {
		height: 36,
		padding: '8px 10px',
		fontSize: '0.95rem',
	}

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
					// Não selecionar forma automaticamente; criar linha vazia
					setPagamentos([{ id: crypto.randomUUID(), formaId: '', valor: '' }])
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


	const isCortesia = useMemo(() => {
		if (!formaSelecionada) return false
		return formaSelecionada.descricao.toLowerCase().includes('cortesia')
	}, [formaSelecionada])

	const valorAtual = useMemo(() => {
		if (!lanc || !parametros) return lanc?.valorCalculado ?? 0
		const brinquedo = lanc.brinquedoId ? brinquedos.find(b => b.id === lanc.brinquedoId) : undefined
		return calcularValorExibidoLancamento(lanc, parametros, brinquedo as BrinquedoType | undefined)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lanc, parametros, brinquedos, tick])

	const descontoNum = useMemo(() => parseFloat(desconto.replace(',', '.')) || 0, [desconto])
	const valorFinal = useMemo(() => {
		if (isCortesia) return 0
		return Math.max(0, valorAtual - descontoNum)
	}, [valorAtual, descontoNum, isCortesia])

	const totalDinheiro = useMemo(() => {
		// Soma apenas das linhas marcadas como "dinheiro" (em pagamentos múltiplos)
		return pagamentosNum.reduce((s, p) => {
			const forma = formas.find(f => f.id === p.formaId)
			if (!forma) return s
			return forma.descricao.toLowerCase().includes('dinheiro') ? s + p.valorNum : s
		}, 0)
	}, [pagamentosNum, formas])

	const troco = useMemo(() => {
		if (totalDinheiro <= 0 || !lanc) return 0
		const nonCash = somaPagamentos - totalDinheiro
		const cashRequired = Math.max(0, valorFinal - nonCash)
		return Math.max(0, totalDinheiro - cashRequired)
	}, [totalDinheiro, somaPagamentos, valorFinal, lanc])

	async function executarPagamento() {
		if (!lanc) return
		try {
			setSaving(true)
			// Cortesia segue fluxo antigo (forma única + código)
			if (isCortesia) {
				if (!forma) return
				const codigo = normalizarCodigoCortesia(codigoCortesia)
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
				if (totalDinheiro > 0) {
					if (somaPagamentos < valorFinal) {
						setSaving(false)
						return alert(`Valor insuficiente. Faltam R$ ${(valorFinal - somaPagamentos).toFixed(2)}`)
					}
				} else if (Math.abs(somaPagamentos - valorFinal) > 0.01) {
					setSaving(false)
					return alert(`A soma das formas (R$ ${somaPagamentos.toFixed(2)}) deve ser igual ao valor total (R$ ${valorFinal.toFixed(2)})`)
				}
				// Desconta o troco das linhas de dinheiro antes de enviar ao backend
				let trocoRestante = troco
				const pagamentosAjustados = linhas.map(p => {
					if (trocoRestante <= 0) return { formaPagamentoId: p.formaId, valor: p.valorNum }
					const f = formas.find(f => f.id === p.formaId)
					if (f?.descricao.toLowerCase().includes('dinheiro')) {
						const ajuste = Math.min(trocoRestante, p.valorNum)
						trocoRestante -= ajuste
						return { formaPagamentoId: p.formaId, valor: Math.round((p.valorNum - ajuste) * 100) / 100 }
					}
					return { formaPagamentoId: p.formaId, valor: p.valorNum }
				})
				const opts: { valorCalculado?: number; valorDesconto?: number; valorRecebido?: number; pagamentos?: Array<{ formaPagamentoId: string; valor: number }> } = {
					valorCalculado: valorFinal,
					...(descontoNum > 0 && { valorDesconto: descontoNum }),
					...(troco > 0 && { valorRecebido: somaPagamentos }),
					pagamentos: pagamentosAjustados,
				}
				await lancamentosService.pagar(lanc.id, linhas[0].formaId, opts)
			}
			alert('Pagamento concluído. Gerando recibo...')
			navigate(`/recibo/pagamento/${lanc.id}`)
		} catch (error) {
			console.error('Erro ao processar pagamento:', error)
			alert(obterMensagemErroPagamento(error, codigoCortesia, isCortesia))
		} finally {
			setSaving(false)
		}
	}

	function cancelar() {
		if (!lanc) return
		setAdminApelidoCancelamento('')
		setAdminSenhaCancelamento('')
		setErroAdminCancelamento('')
		setMostrarModalCancelamento(true)
	}

	async function confirmarCancelamento() {
		if (!adminApelidoCancelamento.trim() || !adminSenhaCancelamento) {
			setErroAdminCancelamento('Apelido e senha são obrigatórios')
			return
		}
		const ok = await authService.validarDesconto(adminApelidoCancelamento.trim(), adminSenhaCancelamento)
		if (!ok) {
			setErroAdminCancelamento('Credenciais inválidas ou usuário sem permissão para autorizar cancelamentos e descontos')
			return
		}
		setMostrarModalCancelamento(false)
		try {
			setSaving(true)
			await lancamentosService.cancelar(lanc!.id)
			navigate('/acompanhamento')
		} catch (error) {
			console.error('Erro ao cancelar:', error)
			alert('Erro ao cancelar. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	async function finalizar() {
		if (!lanc) return
		if (isCortesia) {
			if (!forma) return
			const codigo = normalizarCodigoCortesia(codigoCortesia)
			if (codigo.length !== 8) {
				return alert('Informe o código de cortesia de 8 dígitos')
			}
			await executarPagamento()
			return
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
			<div className="container" style={{ maxWidth: 800 }}>
				<h2>Pagamento</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	if (!lanc) {
		return (
			<div className="container" style={{ maxWidth: 800 }}>
				<h2>Pagamento</h2>
				<div className="card">
					<div>Registro não encontrado</div>
				</div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 480, margin: '0 auto' }}>
			<h2>Pagamento</h2>
			<div className="card stack">
				<div className="stack">
					<div><strong>Criança:</strong> {resolverNomesCriancas(lanc)}</div>
					<div><strong>Responsável:</strong> {lanc.nomeResponsavel}</div>
					<div><strong>Status:</strong> {lanc.status.toUpperCase()}</div>
					<label className="field">
						<span>Valor total</span>
						<input className="input" style={compactControlStyle} readOnly value={`R$ ${valorFinal.toFixed(2)}`} />
					</label>
				</div>

				<div className="stack" style={{ marginTop: 16 }}>
					{!isCortesia && (
						<label className="field">
							<span>Desconto</span>
							<input 
								className="input" 
								style={compactControlStyle}
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
								<select className="select" style={compactControlStyle} value={forma} onChange={(e) => {
									setForma(e.target.value)
									setCodigoCortesia('')
									const novaForma = formas.find(f => f.id === e.target.value)
									if (novaForma?.descricao.toLowerCase().includes('cortesia')) setDesconto('')
								}}>
									<option value="">Selecione...</option>
									{formas.map((f) => <option key={f.id} value={f.id}>{f.descricao}</option>)}
								</select>
							</div>
						) : (
							<div className="stack" style={{ gap: 8 }}>
								{pagamentos.map((p, idx) => (
									<div key={p.id} className="stack" style={{ gap: 4 }}>
										<label className="field">
											<span>Forma</span>
											<select
												className="select"
												style={compactControlStyle}
												value={p.formaId}
												onChange={(e) => {
													const v = e.target.value
													const f = formas.find(f => f.id === v)
													if (f?.descricao.toLowerCase().includes('cortesia')) {
														setForma(v)
														setCodigoCortesia('')
														setPagamentos([{ id: crypto.randomUUID(), formaId: '', valor: '' }])
													} else {
														setPagamentos((prev) => prev.map(x => x.id === p.id ? { ...x, formaId: v } : x))
													}
												}}
											>
												<option value="">Selecione...</option>
												{formas.map((f) => <option key={f.id} value={f.id}>{f.descricao}</option>)}
											</select>
										</label>
										<label className="field">
											<span>Valor</span>
											<input
												className="input"
												style={compactControlStyle}
												type="text"
												placeholder="0,00"
												value={p.valor}
												onFocus={(e) => e.target.select()}
												onChange={(e) => {
													const v = e.target.value.replace(/[^\d,]/g, '')
													setPagamentos((prev) => prev.map(x => x.id === p.id ? { ...x, valor: v } : x))
												}}
											/>
										</label>
										<div className="row" style={{ gap: 8 }}>
											{pagamentos.length > 1 && (
												<button
													className="btn"
													type="button"
													onClick={() => setPagamentos(prev => prev.filter(x => x.id !== p.id))}
													title="Remover forma"
												>
													-
												</button>
											)}
											{idx === pagamentos.length - 1 && (
												<button
													className="btn"
													type="button"
													onClick={() => {
														setPagamentos(prev => [...prev, { id: crypto.randomUUID(), formaId: '', valor: '' }])
													}}
													title="Adicionar forma"
												>
													+
												</button>
											)}
										</div>
									</div>
								))}
								<div className="help">Soma: R$ {somaPagamentos.toFixed(2)} / Total: R$ {valorFinal.toFixed(2)}</div>
							{troco > 0 && (
								<div style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '1rem' }}>
									Troco: R$ {troco.toFixed(2)}
								</div>
							)}
							{totalDinheiro > 0 && somaPagamentos > 0 && somaPagamentos < valorFinal && (
								<div style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
									Valor insuficiente. Faltam R$ {(valorFinal - somaPagamentos).toFixed(2)}
								</div>
							)}
						</div>
						)}
					</label>

					{isCortesia && (
						<label className="field">
							<span>Código de Cortesia *</span>
							<input 
								className="input" 
								style={{ ...compactControlStyle, fontFamily: 'monospace', letterSpacing: 2 }}
								type="text"
								value={codigoCortesia}
								onChange={(e) => setCodigoCortesia(normalizarCodigoCortesia(e.target.value).slice(0, 8))}
								placeholder="8 dígitos"
								maxLength={8}
							/>
							<span className="help">Digite o código de 8 dígitos gerado na aba Cortesia</span>
						</label>
					)}

				</div>

				<div className="actions" style={{ justifyContent: 'space-between', marginTop: 16 }}>
					<button
						className="btn danger icon"
						onClick={cancelar}
						disabled={saving}
						title="Cancela o lançamento sem gerar cobrança"
					>
						❌ Cancelar sem cobrança
					</button>
					<button
						className="btn primary icon"
						onClick={finalizar}
						disabled={saving || (isCortesia && (!forma || normalizarCodigoCortesia(codigoCortesia).length !== 8))}
					>
						{saving ? 'Processando...' : '✅ Finalizar'}
					</button>
				</div>
			</div>

			{/* Modal de autorização de cancelamento */}
			{mostrarModalCancelamento && (
				<div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
					onClick={() => !saving && setMostrarModalCancelamento(false)}>
					<div className="card" style={{ maxWidth: 360, margin: 16 }} onClick={e => e.stopPropagation()}>
						<h3>Autorização de Cancelamento</h3>
						<p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 16 }}>
							Digite o apelido e a senha de um usuário com permissão para autorizar cancelamentos e descontos para cancelar o atendimento de {lanc?.nomeCrianca} sem cobrança.
						</p>
						<label className="field">
							<span>Apelido *</span>
							<input className="input" value={adminApelidoCancelamento} onChange={e => setAdminApelidoCancelamento(e.target.value)} placeholder="apelido" autoFocus />
						</label>
						<label className="field">
							<span>Senha *</span>
							<input className="input" type="password" value={adminSenhaCancelamento} onChange={e => setAdminSenhaCancelamento(e.target.value)} placeholder="senha" />
						</label>
						{erroAdminCancelamento && <div style={{ color: 'var(--danger)', fontSize: '0.9rem', marginBottom: 12 }}>{erroAdminCancelamento}</div>}
						<div className="row" style={{ gap: 8, marginTop: 16 }}>
							<button className="btn" onClick={() => setMostrarModalCancelamento(false)} disabled={saving}>Voltar</button>
							<button className="btn danger" onClick={confirmarCancelamento} disabled={saving}>
								{saving ? 'Cancelando...' : '❌ Confirmar Cancelamento'}
							</button>
						</div>
					</div>
				</div>
			)}

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
							Digite o apelido e a senha de um usuário com permissão para autorizar cancelamentos e descontos para autorizar o desconto de R$ {descontoNum.toFixed(2)}.
						</p>
						<label className="field">
							<span>Apelido *</span>
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


