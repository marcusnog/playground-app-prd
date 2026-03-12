import { useState, useEffect } from 'react'
import { cortesiasService, clientesService } from '../services/entitiesService'
import { usePermissions } from '../hooks/usePermissions'
import { useNavigate } from 'react-router-dom'
import ClienteAutocomplete from '../components/ClienteAutocomplete'
import type { Cliente } from '../services/entitiesService'

type ModoCliente = 'cadastrado' | 'whatsapp'

function formatarWhatsappParaWaMe(num: string): string {
	const limpo = num.replace(/\D/g, '')
	if (limpo.startsWith('55') && limpo.length >= 12) return limpo
	if (limpo.length >= 10) return '55' + limpo
	return limpo
}

export default function Cortesia() {
	const navigate = useNavigate()
	const { hasPermission } = usePermissions()
	const [clientes, setClientes] = useState<Cliente[]>([])
	const [modoCliente, setModoCliente] = useState<ModoCliente>('cadastrado')
	const [clienteId, setClienteId] = useState('')
	const [whatsappManual, setWhatsappManual] = useState('')
	const [validadeDias, setValidadeDias] = useState(7)
	const [codigo, setCodigo] = useState<string | null>(null)
	const [validadeGerada, setValidadeGerada] = useState<number | null>(null)
	const [loading, setLoading] = useState(false)
	const [loadingClientes, setLoadingClientes] = useState(true)
	const [copiado, setCopiado] = useState(false)

	useEffect(() => {
		clientesService.list().then((data) => {
			setClientes(Array.isArray(data) ? data : [])
		}).catch(() => setClientes([])).finally(() => setLoadingClientes(false))
	}, [])

	const whatsappDestino = (() => {
		if (modoCliente === 'cadastrado' && clienteId) {
			const c = clientes.find((x) => x.id === clienteId)
			return c ? c.telefoneWhatsapp.replace(/\D/g, '') : ''
		}
		return whatsappManual.replace(/\D/g, '')
	})()

	const podeAvancarCliente = modoCliente === 'cadastrado' ? !!clienteId : whatsappManual.replace(/\D/g, '').length >= 10

	if (!hasPermission('cortesia')) {
		return (
			<div className="container" style={{ maxWidth: 560 }}>
				<div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)' }}>
					<h3 style={{ color: 'var(--danger)' }}>Acesso Negado</h3>
					<p>Você não tem permissão para gerar códigos de cortesia. Contate o administrador.</p>
					<button className="btn" onClick={() => navigate('/acompanhamento')}>Voltar</button>
				</div>
			</div>
		)
	}

	async function gerar() {
		if (!podeAvancarCliente || validadeDias < 1) return
		try {
			setLoading(true)
			setCodigo(null)
			setValidadeGerada(null)
			const params: { clienteId?: string; whatsappDestino?: string; validadeDias: number } = {
				validadeDias,
			}
			if (modoCliente === 'cadastrado' && clienteId) {
				params.clienteId = clienteId
			} else {
				params.whatsappDestino = whatsappManual.trim()
			}
			const { codigo: novoCodigo, validadeDias: vd } = await cortesiasService.gerar(params)
			setCodigo(novoCodigo)
			setValidadeGerada(vd)

			// Abrir WhatsApp com a mensagem
			const numero = modoCliente === 'cadastrado'
				? (clientes.find((c) => c.id === clienteId)?.telefoneWhatsapp || '')
				: whatsappManual
			const waNum = formatarWhatsappParaWaMe(numero)
			const msg = `Segue sua cortesia - código ${novoCodigo}. Prazo de ${vd} dias de validade.`
			const url = `https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`
			window.open(url, '_blank')
		} catch (error) {
			console.error('Erro ao gerar cortesia:', error)
			alert(error instanceof Error ? error.message : 'Erro ao gerar código de cortesia.')
		} finally {
			setLoading(false)
		}
	}

	function copiar() {
		if (!codigo) return
		navigator.clipboard.writeText(codigo).then(() => {
			setCopiado(true)
			setTimeout(() => setCopiado(false), 2000)
		}).catch(() => alert('Não foi possível copiar'))
	}

	return (
		<div className="container" style={{ maxWidth: 560 }}>
			<h2>Cortesia</h2>
			<div className="card">
				<p style={{ color: 'var(--muted)', marginBottom: 24 }}>
					Gere um código de cortesia de 8 dígitos e envie pelo WhatsApp para o cliente.
				</p>

				{/* Etapa 1: Cliente */}
				<div className="field" style={{ marginBottom: 16 }}>
					<span style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Cliente</span>
					<div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
						<label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
							<input
								type="radio"
								name="modoCliente"
								checked={modoCliente === 'cadastrado'}
								onChange={() => { setModoCliente('cadastrado'); setWhatsappManual('') }}
							/>
							Cliente cadastrado
						</label>
						<label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
							<input
								type="radio"
								name="modoCliente"
								checked={modoCliente === 'whatsapp'}
								onChange={() => { setModoCliente('whatsapp'); setClienteId('') }}
							/>
							Apenas WhatsApp
						</label>
					</div>
					{modoCliente === 'cadastrado' ? (
						<ClienteAutocomplete
							clientes={clientes}
							value={clienteId}
							onSelect={setClienteId}
							placeholder="Buscar cliente por nome, telefone..."
							disabled={loadingClientes}
						/>
					) : (
						<input
							className="input"
							type="tel"
							value={whatsappManual}
							onChange={(e) => setWhatsappManual(e.target.value.replace(/\D/g, '').slice(0, 15))}
							placeholder="Ex: 5511999999999"
						/>
						<span className="help">DDD + número sem espaços</span>
					)}
				</div>

				{/* Etapa 2: Vencimento */}
				<div className="field" style={{ marginBottom: 24 }}>
					<label>
						<span style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Prazo de validade (dias)</span>
						<input
							className="input"
							type="number"
							min={1}
							max={365}
							value={validadeDias}
							onChange={(e) => setValidadeDias(Math.max(1, parseInt(e.target.value, 10) || 1))}
						/>
					</label>
				</div>

				<div className="actions">
					<button
						className="btn primary icon"
						onClick={gerar}
						disabled={loading || !podeAvancarCliente || validadeDias < 1}
					>
						{loading ? 'Gerando...' : '🎫 Gerar e Enviar por WhatsApp'}
					</button>
				</div>

				{codigo && (
					<div style={{ marginTop: 24, padding: 20, background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: 8 }}>
						<div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 8 }}>Código gerado:</div>
						<div style={{
							fontSize: '1.8rem',
							fontWeight: 'bold',
							fontFamily: 'monospace',
							letterSpacing: 4,
							marginBottom: 12
						}}>
							{codigo}
						</div>
						{validadeGerada != null && (
							<div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 12 }}>
								Validade: {validadeGerada} dias
							</div>
						)}
						<p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 12 }}>
							O WhatsApp foi aberto com a mensagem. Se não enviou, copie o código abaixo.
						</p>
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
							<button className="btn" onClick={copiar}>
								{copiado ? '✓ Copiado!' : '📋 Copiar código'}
							</button>
							<button className="btn" onClick={() => { setCodigo(null); setValidadeGerada(null) }}>
								🎫 Nova cortesia
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
