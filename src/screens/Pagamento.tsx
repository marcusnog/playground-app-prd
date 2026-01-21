import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../services/mockDb'
import { PaymentIcon, resolvePaymentKind } from '../ui/icons'

export default function Pagamento() {
	const { id } = useParams()
	const navigate = useNavigate()
	const d = db.get()
	const lanc = d.lancamentos.find((l) => l.id === id)
	const formas = d.formasPagamento.filter((f) => f.status === 'ativo')
	const [forma, setForma] = useState<string>(formas[0]?.id || '')
	const [recebido, setRecebido] = useState<string>('')

	const formaSelecionada = useMemo(() => 
		formas.find(f => f.id === forma),
		[forma, formas]
	)

	const isDinheiro = useMemo(() => {
		if (!formaSelecionada) return false
		return formaSelecionada.descricao.toLowerCase().includes('dinheiro')
	}, [formaSelecionada])

	const troco = useMemo(() => {
		if (!isDinheiro || !recebido) return 0
		const recebidoNum = parseFloat(recebido.replace(',', '.')) || 0
		return Math.max(0, recebidoNum - lanc.valorCalculado)
	}, [isDinheiro, recebido, lanc])

	if (!lanc) return <div>Registro não encontrado</div>

	function finalizar() {
		if (!lanc) return
		if (isDinheiro && (!recebido || parseFloat(recebido.replace(',', '.')) < lanc.valorCalculado)) {
			return alert('O valor recebido deve ser maior ou igual ao valor do pagamento')
		}
		db.update((dbb) => {
			const l = dbb.lancamentos.find((x) => x.id === lanc.id)
			if (l) {
				l.status = 'pago'
				;(l as any).formaPagamentoId = forma
			}
		})
		alert('Pagamento concluído. Gerando recibo...')
		navigate(`/recibo/pagamento/${lanc.id}`)
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
					<button className="btn primary icon" onClick={finalizar}>✅ Finalizar</button>
				</div>
			</div>
		</div>
	)
}


