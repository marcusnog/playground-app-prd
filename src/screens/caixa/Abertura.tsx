import { useMemo, useState } from 'react'
import { db } from '../../services/mockDb'

export default function Abertura() {
	const [_, force] = useState(0)
	const caixas = useMemo(() => db.get().caixas, [_])
	const aberto = caixas.find((c) => c.status === 'aberto')
	const [valorInicial, setValorInicial] = useState<number>(0)

	function refresh() { force((x) => x + 1 as unknown as number) }

	function abrir() {
		if (aberto) return alert('Já existe um caixa aberto')
		db.update((d) => {
			d.caixas.push({ 
				id: String(Date.now()), 
				data: new Date().toISOString(), 
				valorInicial, 
				status: 'aberto',
				movimentos: []
			})
		})
		setValorInicial(0)
		refresh()
		alert('Caixa aberto com sucesso!')
	}

	return (
		<div className="container" style={{ maxWidth: 600 }}>
			<h2>Abertura de Caixa</h2>
			<div className="card">
				<h3>Informações do Caixa</h3>
				<div className="form">
					<div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--primary)', marginBottom: 16 }}>
						<div className="row center" style={{ gap: 8 }}>
							<span style={{ fontSize: '1.2rem' }}>{aberto ? '✅' : '💰'}</span>
							<div>
								<strong style={{ color: aberto ? 'var(--success)' : 'var(--muted)' }}>
									{aberto ? 'Caixa Aberto' : 'Caixa Fechado'}
								</strong>
								<div className="subtitle">
									{aberto ? `Caixa aberto em ${new Date(aberto.data).toLocaleDateString('pt-BR')}` : 'Nenhum caixa aberto'}
								</div>
							</div>
						</div>
					</div>

					<label className="field">
						<span>Data</span>
						<input className="input" value={new Date().toLocaleDateString('pt-BR')} readOnly />
					</label>

					<label className="field">
						<span>Valor Inicial (R$)</span>
						<input 
							className="input" 
							type="number" 
							value={valorInicial} 
							onChange={(e) => setValorInicial(Number(e.target.value))}
							step="0.01"
							min="0"
							placeholder="0.00"
						/>
						<span className="help">Valor em dinheiro disponível no caixa no momento da abertura</span>
					</label>

					<div className="actions">
						<button className="btn primary" onClick={abrir} disabled={!!aberto}>
							{aberto ? 'Caixa já está aberto' : 'Abrir Caixa'}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

