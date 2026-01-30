import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { caixasService } from '../../services/entitiesService'
import { usePermissions } from '../../hooks/usePermissions'
import { useCaixa } from '../../hooks/useCaixa'

export default function Abertura() {
	const { hasPermission, user } = usePermissions()
	const { caixas, caixa, refresh, loading } = useCaixa()
	const [valorInicial, setValorInicial] = useState<number>(0)
	const [caixaSelecionado, setCaixaSelecionado] = useState<string>('')
	const [saving, setSaving] = useState(false)
	const navigate = useNavigate()

	const caixasFechados = useMemo(() => caixas.filter(c => c.status === 'fechado'), [caixas])
	const aberto = caixa
	// Caixa que este usuário quer abrir (fixo ou selecionado); pode haver outros caixas abertos
	const temCaixaFixo = !!(user?.usaCaixa && user.caixaId)
	const caixaAlvoId = temCaixaFixo ? user!.caixaId! : caixaSelecionado
	const caixaAlvo = caixaAlvoId ? caixas.find(c => c.id === caixaAlvoId) : null
	const caixaAlvoJaAberto = !!caixaAlvo && caixaAlvo.status === 'aberto'

	// Verificar permissão
	if (!hasPermission('caixa', 'abertura')) {
		return (
			<div className="container" style={{ maxWidth: 600 }}>
				<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<h3 style={{ color: 'var(--danger)' }}>Acesso Negado</h3>
					<p>Você não tem permissão para acessar esta funcionalidade.</p>
				</div>
			</div>
		)
	}

	async function abrir() {
		// Determinar qual caixa usar: caixa fixo do usuário (se tiver) ou o selecionado no dropdown
		let caixaId = ''

		if (temCaixaFixo) {
			caixaId = user!.caixaId!
			const caixaEspecifico = caixas.find(c => c.id === caixaId && c.status === 'aberto')
			if (caixaEspecifico) {
				return alert('Já existe um caixa aberto para este usuário')
			}
		} else if (caixaSelecionado) {
			caixaId = caixaSelecionado
			const caixaSelecionadoObj = caixas.find(c => c.id === caixaId)
			if (!caixaSelecionadoObj) {
				return alert('Caixa selecionado não encontrado')
			}
			if (caixaSelecionadoObj.status === 'aberto') {
				return alert('Este caixa já está aberto')
			}
		} else {
			if (caixasFechados.length === 0) {
				return alert('Não há caixas cadastrados. Cadastre um caixa primeiro em "Cadastro de Caixas".')
			}
			return alert('Selecione um caixa para abrir')
		}
		
		try {
			setSaving(true)
			await caixasService.abrir(caixaId, valorInicial)
			setValorInicial(0)
			setCaixaSelecionado('')
			await refresh()
			// Disparar evento para atualizar outros componentes que usam useCaixa
			window.dispatchEvent(new Event('caixa:updated'))
			// Navegar para o comprovante de abertura
			navigate(`/recibo/abertura/${caixaId}`)
		} catch (error) {
			console.error('Erro ao abrir caixa:', error)
			alert('Erro ao abrir caixa. Tente novamente.')
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<div className="container" style={{ maxWidth: 600 }}>
				<h2>Abertura de Caixa</h2>
				<div className="card">
					<div>Carregando...</div>
				</div>
			</div>
		)
	}

	return (
		<div className="container" style={{ maxWidth: 600 }}>
			<h2>Abertura de Caixa</h2>
			<div className="card">
				<h3>Informações do Caixa</h3>
				<div className="form">
					<div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--primary)', marginBottom: 16 }}>
						<div className="row center" style={{ gap: 8 }}>
							<span style={{ fontSize: '1.2rem' }}>{caixaAlvoJaAberto ? '✅' : '💰'}</span>
							<div>
								<strong style={{ color: caixaAlvoJaAberto ? 'var(--success)' : 'var(--muted)' }}>
									{caixaAlvoJaAberto ? `${caixaAlvo?.nome ?? 'Caixa'} - Aberto` : caixaAlvo ? `${caixaAlvo.nome} - Fechado` : 'Selecione um caixa'}
								</strong>
								<div className="subtitle">
									{caixaAlvoJaAberto
										? `Caixa ${caixaAlvo?.nome} aberto em ${caixaAlvo?.data ? new Date(caixaAlvo.data).toLocaleDateString('pt-BR') : ''}`
										: aberto ? `Há ${caixas.filter(c => c.status === 'aberto').length} caixa(s) aberto(s). Você pode abrir outro.` : 'Nenhum caixa aberto'}
								</div>
							</div>
						</div>
					</div>

					{/* Mostrar select quando o usuário não tem caixa fixo (usaCaixa=false ou caixaId não definido) */}
					{(!user?.usaCaixa || !user?.caixaId) && (
						<label className="field">
							<span>Selecione o Caixa *</span>
							<select 
								className="select" 
								value={caixaSelecionado} 
								onChange={(e) => setCaixaSelecionado(e.target.value)}
							>
								<option value="">Selecione um caixa...</option>
								{caixasFechados.map((c) => (
									<option key={c.id} value={c.id}>
										{c.nome}
									</option>
								))}
							</select>
							<span className="help">
								{user?.usaCaixa && !user?.caixaId
									? 'Nenhum caixa foi atribuído ao seu usuário. Selecione um caixa para abrir.'
									: 'Selecione qual caixa deseja abrir'}
							</span>
						</label>
					)}

					{user?.usaCaixa && user.caixaId && (
						<label className="field">
							<span>Caixa</span>
							<input 
								className="input" 
								value={caixas.find(c => c.id === user.caixaId)?.nome || 'Caixa do usuário'} 
								readOnly 
							/>
							<span className="help">Você está usando o caixa atribuído ao seu usuário</span>
						</label>
					)}

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
						<button 
							className="btn primary" 
							onClick={abrir} 
							disabled={
								saving ||
								caixaAlvoJaAberto ||
								((!user?.usaCaixa || !user?.caixaId) && !caixaSelecionado && caixasFechados.length > 0)
							}
						>
							{saving ? 'Abrindo...' : caixaAlvoJaAberto ? 'Este caixa já está aberto' : 'Abrir Caixa'}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

