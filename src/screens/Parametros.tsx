import { useState } from 'react'
import { db, type Parametros } from '../services/mockDb'

export default function Parametros() {
	const current = db.get().parametros
	const [form, setForm] = useState<Parametros>({ ...current })

	function onSave() {
		db.update((d) => {
			d.parametros = { ...form }
		})
		alert('Dados cadastrais salvos com sucesso!')
	}

	return (
		<div className="container" style={{ maxWidth: 800 }}>
			<h2>Configurações da Empresa</h2>
			<p className="subtitle">Configure os dados cadastrais e logo da sua empresa</p>
			
			{/* Dados Cadastrais */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>Dados Cadastrais</h3>
				<div className="form two">
					<label className="field">
						<span>Nome da Empresa *</span>
						<input 
							className="input" 
							value={form.empresaNome || ''} 
							onChange={(e) => setForm({ ...form, empresaNome: e.target.value })} 
							placeholder="Ex: Parque Infantil ABC"
						/>
					</label>
					
					<label className="field">
						<span>CNPJ</span>
						<input 
							className="input" 
							value={form.empresaCnpj || ''} 
							onChange={(e) => setForm({ ...form, empresaCnpj: e.target.value })} 
							placeholder="00.000.000/0000-00"
						/>
					</label>
				</div>
			</div>

			{/* Logo da Empresa */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>Logo da Empresa</h3>
				<div className="form">
					<label className="field">
						<span>URL do Logo</span>
						<input 
							className="input" 
							value={form.empresaLogoUrl || ''} 
							onChange={(e) => setForm({ ...form, empresaLogoUrl: e.target.value })} 
							placeholder="https://exemplo.com/logo.png"
						/>
						<span className="help">Cole a URL completa da imagem do logo</span>
					</label>
					
					{form.empresaLogoUrl && (
						<div className="card" style={{ background: 'rgba(255, 255, 255, 0.05)', marginTop: 12 }}>
							<h4>Preview do Logo</h4>
							<div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
								<img 
									src={form.empresaLogoUrl} 
									alt="Logo da Empresa" 
									style={{ 
										maxWidth: '200px', 
										maxHeight: '200px', 
										objectFit: 'contain',
										border: '1px solid var(--border)',
										borderRadius: '8px',
										padding: '10px',
										background: 'white'
									}}
									onError={(e) => {
										(e.target as HTMLImageElement).style.display = 'none'
									}}
								/>
							</div>
							<p className="help" style={{ textAlign: 'center', marginTop: 8 }}>
								Se a imagem não aparecer, verifique se a URL está correta e acessível
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Configurações PIX */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>Configurações PIX</h3>
				<p className="subtitle" style={{ marginBottom: 16 }}>
					Configure as informações PIX para geração de QR Codes nos recibos
				</p>
				<div className="form two">
					<label className="field">
						<span>Chave PIX</span>
						<input 
							className="input" 
							value={form.pixChave || ''} 
							onChange={(e) => setForm({ ...form, pixChave: e.target.value })} 
							placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
						/>
						<span className="help">Chave PIX principal da empresa</span>
					</label>
					
					<label className="field">
						<span>Cidade</span>
						<input 
							className="input" 
							value={form.pixCidade || ''} 
							onChange={(e) => setForm({ ...form, pixCidade: e.target.value })} 
							placeholder="Cidade da empresa"
						/>
						<span className="help">Cidade para geração do QR Code PIX</span>
					</label>
				</div>
			</div>

			{/* Regras Globais Padrão */}
			<div className="card" style={{ marginBottom: 16 }}>
				<h3>Regras Globais Padrão</h3>
				<p className="subtitle" style={{ marginBottom: 16 }}>
					Estas regras são usadas quando um brinquedo não tem regras específicas configuradas
				</p>
				<div className="form two">
					<label className="field">
						<span>Inicial (minutos)</span>
						<input 
							className="input" 
							type="number" 
							value={form.valorInicialMinutos} 
							onChange={(e) => setForm({ ...form, valorInicialMinutos: Number(e.target.value) })} 
							min="1"
						/>
					</label>
					
					<label className="field">
						<span>Valor inicial (R$)</span>
						<input 
							className="input" 
							type="number" 
							value={form.valorInicialReais} 
							onChange={(e) => setForm({ ...form, valorInicialReais: Number(e.target.value) })} 
							step="0.01"
							min="0"
						/>
					</label>
					
					<label className="field">
						<span>Ciclo (minutos)</span>
						<input 
							className="input" 
							type="number" 
							value={form.valorCicloMinutos} 
							onChange={(e) => setForm({ ...form, valorCicloMinutos: Number(e.target.value) })} 
							min="1"
						/>
					</label>
					
					<label className="field">
						<span>Valor ciclo (R$)</span>
						<input 
							className="input" 
							type="number" 
							value={form.valorCicloReais} 
							onChange={(e) => setForm({ ...form, valorCicloReais: Number(e.target.value) })} 
							step="0.01"
							min="0"
						/>
					</label>
				</div>
			</div>

			<div className="actions">
				<button className="btn primary icon" onClick={onSave}>💾 Salvar Configurações</button>
			</div>
		</div>
	)
}
