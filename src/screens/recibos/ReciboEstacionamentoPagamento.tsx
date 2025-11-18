import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { db } from '../../services/mockDb'
import { PaymentIcon, resolvePaymentKind } from '../../ui/icons'

export default function ReciboEstacionamentoPagamento() {
	const { id } = useParams()
	const d = db.get()
	const lanc = d.lancamentosEstacionamento.find((l) => l.id === id)

	useEffect(() => {
		setTimeout(() => window.print(), 300)
	}, [])

	if (!lanc) return <div className="receipt"><h3>Cupom</h3><div>Registro não encontrado</div></div>

	const params = d.parametros
	const estacionamento = d.estacionamentos.find(e => e.id === lanc.estacionamentoId)
	const forma = lanc.formaPagamentoId ? d.formasPagamento.find(f => f.id === lanc.formaPagamentoId) : null

	// Gerar payload PIX se for PIX
	const pixPayload = forma?.id === 'pix' && params.pixChave
		? `00020126580014BR.GOV.BCB.PIX0136${params.pixChave}5204000053039865802BR5913${params.empresaNome || 'Empresa'}6009${params.pixCidade || 'Cidade'}62070503***6304`
		: ''

	return (
		<div className="receipt">
			{params.empresaLogoUrl ? (
				<div style={{ textAlign: 'center' }}>
					<img alt="logo" src={params.empresaLogoUrl} style={{ height: 40, objectFit: 'contain' }} />
				</div>
			) : null}
			<h3>{params.empresaNome || 'Cupom'}</h3>
			{params.empresaCnpj && <div style={{ textAlign: 'center', marginBottom: 8 }}>CNPJ: {params.empresaCnpj}</div>}
			<div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 12, marginBottom: 12 }}>
				CUPOM DE PAGAMENTO - ESTACIONAMENTO
			</div>
			<div><strong>Estacionamento:</strong> {estacionamento?.nome || 'N/A'}</div>
			<div>Data/Hora: {new Date(lanc.dataHora).toLocaleString('pt-BR')}</div>
			<div><strong>Placa:</strong> {lanc.placa}</div>
			{lanc.modelo && <div><strong>Modelo:</strong> {lanc.modelo}</div>}
			<div><strong>Valor pago:</strong> R$ {lanc.valor.toFixed(2)}</div>
			{forma && <div>Forma: <PaymentIcon kind={resolvePaymentKind(forma.id)} /> {forma.descricao.toUpperCase()}</div>}
			{forma?.id === 'pix' && pixPayload && (
				<div style={{ textAlign: 'center', marginTop: 8 }}>
					<img alt="PIX QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`} />
					<div style={{ fontSize: 10 }}>Aponte a câmera para pagar</div>
				</div>
			)}
			<hr />
			<small>Obrigado pela preferência.</small>
		</div>
	)
}

