import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { lancamentosService, formasPagamentoService } from '../services/entitiesService'
import { PaymentIcon, resolvePaymentKind } from '../ui/icons'
import type { Lancamento, FormaPagamento } from '../services/entitiesService'

export default function Pagamento() {
	const { id } = useParams()
	const navigate = useNavigate()
	const [lanc, setLanc] = useState<Lancamento | null>(null)
	const [formas, setFormas] = useState<FormaPagamento[]>([])
	const [loading, setLoading] = useState(true)
	const [forma, setForma] = useState<string>('')
	const [recebido, setRecebido] = useState<string>('')
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		async function loadData() {
			try {
				setLoading(true)
				const [lancamentoData, formasData] = await Promise.all([
					lancamentosService.get(id!),
					formasPagamentoService.list(),
				])
				setLanc(lancamentoData)
				const formasAtivas = formasData.filter(f => f.status === 'ativo')
				setFormas(formasAtivas)
				if (formasAtivas.length > 0) {
					setForma(formasAtivas[0].id)
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

	const isDinheiro = useMemo(() => {
		if (!formaSelecionada) return false
		return formaSelecionada.descricao.toLowerCase().includes('dinheiro')
	}, [formaSelecionada])

	const troco = useMemo(() => {
		if (!isDinheiro || !recebido || !lanc) return 0
		const recebidoNum = parseFloat(recebido.replace(',', '.')) || 0
		return Math.max(0, recebidoNum - lanc.valorCalculado)
	}, [isDinheiro, recebido, lanc])

	async function finalizar() {
		if (!lanc || !forma) return
		if (isDinheiro && (!recebido || parseFloat(recebido.replace(',', '.')) < lanc.valorCalculado)) {
			return alert('O valor recebido deve ser maior ou igual ao valor do pagamento')
		}
		
		try {
			setSaving(true)
			await lancamentosService.pagar(lanc.id, forma)
			alert('Pagamento concluído. Gerando recibo...')
			navigate(`/recibo/pagamento/${lanc.id}`)
		} catch (error) {
			console.error('Erro ao processar pagamento:', error)
			alert('Erro ao processar pagamento. Tente novamente.')
		} finally {
			setSaving(false)
		}
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
						<span>Valor</span>
						<input className="input" readOnly value={`R$ ${lanc.valorCalculado.toFixed(2)}`} />
					</label>
					<label className="field">
						<span>Forma de pagamento</span>
						<div className="row center">
							<PaymentIcon kind={resolvePaymentKind(forma)} />
							<select className="select" value={forma} onChange={(e) => {
								setForma(e.target.value)
								setRecebido('')
							}}>
								{formas.map((f) => <option key={f.id} value={f.id}>{f.descricao}</option>)}
							</select>
						</div>
					</label>
					{isDinheiro && (
						<>
							<label className="field">
								<span>Valor Recebido *</span>
								<input 
									className="input" 
									type="text"
									value={recebido}
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
						disabled={saving || !forma}
					>
						{saving ? 'Processando...' : '✅ Finalizar'}
					</button>
				</div>
			</div>
		</div>
	)
}


