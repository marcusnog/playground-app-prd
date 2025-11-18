import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { db } from '../../services/mockDb'
import { PaymentIcon, resolvePaymentKind } from '../../ui/icons'

export default function ReciboFechamento() {
	const { id } = useParams()
	const d = db.get()
	const caixa = d.caixas.find((c) => c.id === id)

	useEffect(() => {
		setTimeout(() => window.print(), 300)
	}, [])

	if (!caixa) return <div className="receipt"><h3>Comprovante</h3><div>Registro não encontrado</div></div>

	const params = d.parametros

	// Resumo por forma de pagamento usando lancamentos pagos do dia
	const resumo = useMemo(() => {
		if (!caixa) return []
		
		const dataCaixa = new Date(caixa.data).toDateString()
		const pagos = d.lancamentos.filter((l) => {
			if (l.status !== 'pago') return false
			const dataLancamento = new Date(l.dataHora).toDateString()
			return dataLancamento === dataCaixa
		})
		
		const map = new Map<string, number>()
		for (const l of pagos) {
			const forma = (l as any).formaPagamentoId as string | undefined
			if (!forma) continue
			map.set(forma, (map.get(forma) || 0) + l.valorCalculado)
		}
		return Array.from(map.entries())
	}, [caixa])

	// Calcular totais de sangrias e suprimentos
	const totalSangrias = useMemo(() => {
		if (!caixa || !caixa.movimentos) return 0
		return caixa.movimentos
			.filter(m => m.tipo === 'sangria')
			.reduce((sum, m) => sum + m.valor, 0)
	}, [caixa])

	const totalSuprimentos = useMemo(() => {
		if (!caixa || !caixa.movimentos) return 0
		return caixa.movimentos
			.filter(m => m.tipo === 'suprimento')
			.reduce((sum, m) => sum + m.valor, 0)
	}, [caixa])

	const totalVendas = useMemo(() => {
		return resumo.reduce((sum, [, total]) => sum + total, 0)
	}, [resumo])

	const saldoFinal = (caixa?.valorInicial || 0) + totalVendas + totalSuprimentos - totalSangrias

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
				COMPROVANTE DE FECHAMENTO DE CAIXA
			</div>
			
			<div><strong>Caixa:</strong> {caixa.nome}</div>
			<div><strong>Data de Abertura:</strong> {new Date(caixa.data).toLocaleDateString('pt-BR')}</div>
			<div><strong>Valor Inicial:</strong> R$ {caixa.valorInicial.toFixed(2)}</div>
			<hr />
			
			<div><strong>Total de Vendas:</strong> R$ {totalVendas.toFixed(2)}</div>
			{resumo.length > 0 && (
				<div style={{ marginLeft: 8, fontSize: '0.9em', marginTop: 4 }}>
					{resumo.map(([forma, total]) => (
						<div key={forma} style={{ display: 'flex', justifyContent: 'space-between' }}>
							<span><PaymentIcon kind={resolvePaymentKind(forma)} /> {forma}:</span>
							<span>R$ {total.toFixed(2)}</span>
						</div>
					))}
				</div>
			)}
			
			<div style={{ color: 'var(--danger)' }}><strong>Sangrias:</strong> - R$ {totalSangrias.toFixed(2)}</div>
			<div style={{ color: 'var(--success)' }}><strong>Suprimentos:</strong> + R$ {totalSuprimentos.toFixed(2)}</div>
			
			<hr />
			<div style={{ fontSize: '1.1em', fontWeight: 'bold', marginTop: 8 }}>
				<strong>SALDO FINAL: R$ {saldoFinal.toFixed(2)}</strong>
			</div>
			
			<hr />
			<small>Comprovante de fechamento de caixa gerado automaticamente.</small>
		</div>
	)
}

