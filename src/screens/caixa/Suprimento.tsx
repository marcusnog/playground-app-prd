import { useState } from 'react'
import { useCaixa } from '../../hooks/useCaixa'
import { caixasService } from '../../services/entitiesService'
import { usePermissions } from '../../hooks/usePermissions'

export default function Suprimento() {
	const { caixa: aberto, refresh } = useCaixa()
	const { hasPermission } = usePermissions()
	const [valor, setValor] = useState<number>(0)
	const [motivo, setMotivo] = useState('')
	const [saving, setSaving] = useState(false)

	// Verificar permissão
	if (!hasPermission('caixa', 'suprimento')) {
		return (
			<div className="container" style={{ maxWidth: 600 }}>
				<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<h3 style={{ color: 'var(--danger)' }}>Acesso Negado</h3>
					<p>Você não tem permissão para acessar esta funcionalidade.</p>
				</div>
			</div>
		)
	}

	async function registrar() {
		if (!aberto) return alert('É necessário ter um caixa aberto para registrar suprimento')
		if (valor <= 0) return alert('Informe um valor válido')
		
		try {
			setSaving(true)
			await caixasService.suprimento(aberto.id, valor, motivo.trim() || undefined)
			setValor(0)
			setMotivo('')
			await refresh()
			alert('Suprimento registrado com sucesso!')
		} catch (error) {
			console.error('Erro ao registrar suprimento:', error)
			alert('Erro ao registrar suprimento. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="container" style={{ maxWidth: 600 }}>
			<h2>Suprimento de Caixa</h2>
			<div className="card">
				<h3>Registrar Entrada de Dinheiro</h3>
				
				{!aberto ? (
					<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', marginBottom: 16 }}>
						<div className="row center" style={{ gap: 8 }}>
							<span style={{ fontSize: '1.2rem' }}>⚠️</span>
							<div>
								<strong style={{ color: 'var(--danger)' }}>Caixa Fechado</strong>
								<div className="subtitle">É necessário abrir o caixa antes de registrar suprimentos</div>
							</div>
						</div>
					</div>
				) : (
					<div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', marginBottom: 16 }}>
						<div className="row center" style={{ gap: 8 }}>
							<span style={{ fontSize: '1.2rem' }}>✅</span>
							<div>
								<strong style={{ color: 'var(--success)' }}>Caixa Aberto</strong>
								<div className="subtitle">Caixa aberto em {new Date(aberto.data).toLocaleDateString('pt-BR')}</div>
							</div>
						</div>
					</div>
				)}

				<div className="form">
					<label className="field">
						<span>Data/Hora</span>
						<input className="input" value={new Date().toLocaleString('pt-BR')} readOnly />
					</label>

					<label className="field">
						<span>Valor do Suprimento (R$) *</span>
						<input 
							className="input" 
							type="number" 
							value={valor} 
							onChange={(e) => setValor(Number(e.target.value))}
							step="0.01"
							min="0.01"
							placeholder="0.00"
						/>
						<span className="help">Valor a ser adicionado ao caixa</span>
					</label>

					<label className="field">
						<span>Motivo (Opcional)</span>
						<input 
							className="input" 
							type="text" 
							value={motivo} 
							onChange={(e) => setMotivo(e.target.value)}
							placeholder="Ex: Troco recebido, Depósito, etc."
						/>
						<span className="help">Descrição do motivo do suprimento</span>
					</label>

					<div className="actions">
						<button className="btn primary" onClick={registrar} disabled={!aberto || saving}>
							{saving ? 'Registrando...' : aberto ? '💰 Registrar Suprimento' : 'Caixa Fechado'}
						</button>
					</div>
				</div>
			</div>

			{/* Histórico de Suprimentos do Dia */}
			{aberto && aberto.movimentos && aberto.movimentos.filter(m => m.tipo === 'suprimento').length > 0 && (
				<div className="card">
					<h3>Suprimentos do Dia</h3>
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Data/Hora</th>
									<th>Valor</th>
									<th>Motivo</th>
								</tr>
							</thead>
							<tbody>
								{aberto.movimentos
									.filter(m => m.tipo === 'suprimento')
									.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())
									.map((mov) => (
										<tr key={mov.id}>
											<td>{new Date(mov.dataHora).toLocaleString('pt-BR')}</td>
											<td style={{ color: 'var(--success)' }}>+ R$ {mov.valor.toFixed(2)}</td>
											<td>{mov.motivo || '-'}</td>
										</tr>
									))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	)
}

