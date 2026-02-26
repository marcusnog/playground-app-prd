import { useState, useEffect, useMemo } from 'react'
import { useCaixa } from '../../hooks/useCaixa'
import { caixasService } from '../../services/entitiesService'
import { usePermissions } from '../../hooks/usePermissions'
import type { MovimentoCaixa } from '../../services/entitiesService'

export default function Suprimento() {
	const { caixas, refresh } = useCaixa()
	const { hasPermission } = usePermissions()
	const [valor, setValor] = useState<number>(0)
	const [motivo, setMotivo] = useState('')
	const [saving, setSaving] = useState(false)

	const caixasAbertos = useMemo(
		() => caixas.filter((c) => c.status === 'aberto'),
		[caixas]
	)

	const defaultSelectedId = useMemo(() => {
		if (caixasAbertos.length === 0) return ''
		return caixasAbertos[0]?.id ?? ''
	}, [caixasAbertos])

	const [selectedId, setSelectedId] = useState(defaultSelectedId)

	useEffect(() => {
		setSelectedId((prev) => {
			if (caixas.some((c) => c.id === prev)) return prev
			return defaultSelectedId
		})
	}, [caixas, defaultSelectedId])

	const selectedCaixa = useMemo(
		() => caixas.find((c) => c.id === selectedId),
		[caixas, selectedId]
	)

	const selectedCaixaAberto = selectedCaixa?.status === 'aberto'

	// Histórico agregado de todos os caixas abertos
	const historicoSuprimentos = useMemo(() => {
		const items: { mov: MovimentoCaixa; caixaNome: string }[] = []
		for (const c of caixasAbertos) {
			if (!c.movimentos) continue
			for (const m of c.movimentos.filter((x) => x.tipo === 'suprimento')) {
				items.push({ mov: m, caixaNome: c.nome })
			}
		}
		return items.sort(
			(a, b) => new Date(b.mov.dataHora).getTime() - new Date(a.mov.dataHora).getTime()
		)
	}, [caixasAbertos])

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
		if (!selectedCaixa) return alert('Selecione um caixa para registrar o suprimento')
		if (selectedCaixa.status !== 'aberto') return alert('O caixa selecionado está fechado. Selecione um caixa aberto.')
		if (valor <= 0) return alert('Informe um valor válido')

		try {
			setSaving(true)
			await caixasService.suprimento(selectedCaixa.id, valor, motivo.trim() || undefined)
			setValor(0)
			setMotivo('')
			await refresh()
			window.dispatchEvent(new Event('caixa:updated'))
			alert('Suprimento registrado com sucesso!')
		} catch (error) {
			console.error('Erro ao registrar suprimento:', error)
			alert('Erro ao registrar suprimento. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	// Sem caixas abertos
	if (caixasAbertos.length === 0) {
		return (
			<div className="container" style={{ maxWidth: 600 }}>
				<h2>Suprimento de Caixa</h2>
				<div className="card">
					<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
						<div className="row center" style={{ gap: 8 }}>
							<span style={{ fontSize: '1.2rem' }}>⚠️</span>
							<div>
								<strong style={{ color: 'var(--danger)' }}>Caixa Fechado</strong>
								<div className="subtitle">É necessário abrir o caixa antes de registrar suprimentos.</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 600 }}>
			<h2>Suprimento de Caixa</h2>
			<div className="card">
				<h3>Registrar Entrada de Dinheiro</h3>

				{selectedCaixaAberto ? (
					<div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', marginBottom: 16 }}>
						<div className="row center" style={{ gap: 8 }}>
							<span style={{ fontSize: '1.2rem' }}>✅</span>
							<div>
								<strong style={{ color: 'var(--success)' }}>Caixa Aberto</strong>
								<div className="subtitle">
									{selectedCaixa ? `Caixa ${selectedCaixa.nome} aberto em ${new Date(selectedCaixa.data).toLocaleDateString('pt-BR')}` : 'Selecione o caixa abaixo'}
								</div>
							</div>
						</div>
					</div>
				) : (
					<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', marginBottom: 16 }}>
						<div className="row center" style={{ gap: 8 }}>
							<span style={{ fontSize: '1.2rem' }}>⚠️</span>
							<div>
								<strong style={{ color: 'var(--danger)' }}>Caixa Fechado</strong>
								<div className="subtitle">Selecione um caixa aberto para registrar o suprimento</div>
							</div>
						</div>
					</div>
				)}

				<div className="form">
					<label className="field">
						<span>Selecione um caixa *</span>
						<select
							className="input"
							value={selectedId}
							onChange={(e) => setSelectedId(e.target.value)}
							style={{ minWidth: 200 }}
						>
							{caixas.map((c) => (
								<option key={c.id} value={c.id}>
									{c.nome} {c.status === 'aberto' ? '(Aberto)' : '(Fechado)'}
								</option>
							))}
						</select>
						<span className="help">Selecione o caixa que teve o suprimento junto com o motivo</span>
					</label>

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
						<button className="btn primary" onClick={registrar} disabled={!selectedCaixaAberto || saving}>
							{saving ? 'Registrando...' : '💰 Registrar Suprimento'}
						</button>
					</div>
				</div>
			</div>

			{/* Histórico de Suprimentos do Dia - todos os caixas abertos */}
			{historicoSuprimentos.length > 0 && (
				<div className="card">
					<h3>Suprimentos do Dia</h3>
					<div className="table-wrap">
						<table className="table">
							<thead>
								<tr>
									<th>Caixa</th>
									<th>Data/Hora</th>
									<th>Valor</th>
									<th>Motivo</th>
								</tr>
							</thead>
							<tbody>
								{historicoSuprimentos.map(({ mov, caixaNome }) => (
									<tr key={mov.id}>
										<td>{caixaNome}</td>
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

