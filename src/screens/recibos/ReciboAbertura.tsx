import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { db } from '../../services/mockDb'

export default function ReciboAbertura() {
	const { id } = useParams()
	const d = db.get()
	const caixa = d.caixas.find((c) => c.id === id)

	useEffect(() => {
		setTimeout(() => window.print(), 300)
	}, [])

	if (!caixa) return <div className="receipt"><h3>Comprovante</h3><div>Registro não encontrado</div></div>

	const params = d.parametros
	return (
		<div className="receipt">
			{params.empresaLogoUrl ? (
				<div style={{ textAlign: 'center' }}>
					<img alt="logo" src={params.empresaLogoUrl} style={{ height: 40, objectFit: 'contain' }} />
				</div>
			) : null}
			<h3>{params.empresaNome || 'Comprovante'}</h3>
			{params.empresaCnpj && <div style={{ textAlign: 'center', marginBottom: 8 }}>CNPJ: {params.empresaCnpj}</div>}
			<div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: 12, marginBottom: 12 }}>
				COMPROVANTE DE ABERTURA DE CAIXA
			</div>
			<div><strong>Caixa:</strong> {caixa.nome}</div>
			<div>Data/Hora: {new Date(caixa.data).toLocaleString('pt-BR')}</div>
			<div>Valor Inicial: R$ {caixa.valorInicial.toFixed(2)}</div>
			<div>Status: {caixa.status === 'aberto' ? 'ABERTO' : 'FECHADO'}</div>
			<hr />
			<small>Comprovante de abertura de caixa gerado automaticamente.</small>
		</div>
	)
}

