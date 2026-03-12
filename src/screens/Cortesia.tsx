import { useState } from 'react'
import { cortesiasService } from '../services/entitiesService'
import { usePermissions } from '../hooks/usePermissions'
import { useNavigate } from 'react-router-dom'

export default function Cortesia() {
	const navigate = useNavigate()
	const { hasPermission } = usePermissions()
	const [codigo, setCodigo] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [copiado, setCopiado] = useState(false)

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
		try {
			setLoading(true)
			setCodigo(null)
			const { codigo: novoCodigo } = await cortesiasService.gerar()
			setCodigo(novoCodigo)
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
					Gere um código de cortesia de 8 dígitos para ser utilizado no momento do pagamento.
				</p>
				<div className="actions">
					<button
						className="btn primary icon"
						onClick={gerar}
						disabled={loading}
					>
						{loading ? 'Gerando...' : '🎫 Gerar Código de Cortesia'}
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
						<button className="btn" onClick={copiar}>
							{copiado ? '✓ Copiado!' : '📋 Copiar'}
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
