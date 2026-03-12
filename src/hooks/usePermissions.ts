import { useAuth } from '../auth/AuthContext'

export function usePermissions() {
	const { user } = useAuth()

	function hasPermission(modulo: string, tela?: string, subtela?: string): boolean {
		if (!user) return false
		
		// Se não tem permissões definidas, negar acesso
		if (!user.permissoes) return false

		if (subtela) {
			// Verificar permissão de subtela (ex: estacionamento.caixa.abertura)
			if (modulo === 'estacionamento' && tela === 'caixa' && user.permissoes.estacionamento?.caixa) {
				return !!user.permissoes.estacionamento.caixa[subtela as keyof typeof user.permissoes.estacionamento.caixa]
			}
			return false
		} else if (tela) {
			// Verificar permissão de tela específica
			if (modulo === 'caixa' && user.permissoes.caixa) {
				return !!user.permissoes.caixa[tela as keyof typeof user.permissoes.caixa]
			}
			if (modulo === 'parametros' && user.permissoes.parametros) {
				return !!user.permissoes.parametros[tela as keyof typeof user.permissoes.parametros]
			}
			if (modulo === 'estacionamento' && user.permissoes.estacionamento) {
				return !!user.permissoes.estacionamento[tela as keyof typeof user.permissoes.estacionamento]
			}
			return false
		} else {
			// Verificar permissão de módulo completo
			if (modulo === 'estacionamento') {
				const est = user.permissoes.estacionamento
				if (!est) return false
				return !!(est.cadastro || est.lancamento || est.acompanhamento || est.caixa?.abertura || est.caixa?.fechamento)
			}
			if (modulo === 'caixa') {
				const caixa = user.permissoes.caixa
				if (!caixa) return false
				return !!(caixa.abertura || caixa.fechamento || caixa.sangria || caixa.suprimento)
			}
			if (modulo === 'parametros') {
				const param = user.permissoes.parametros
				if (!param) return false
				return !!(param.empresa || param.formasPagamento || param.brinquedos)
			}
			if (modulo === 'cortesia') return !!(user.permissoes as { cortesia?: boolean }).cortesia
			return !!user.permissoes[modulo as keyof typeof user.permissoes]
		}
	}

	function canUseCaixa(caixaId: string): boolean {
		if (!user) return false
		if (!user.usaCaixa) return false
		// Se não tem caixaId específico, pode usar qualquer caixa
		if (!user.caixaId) return true
		// Se tem caixaId, só pode usar o caixa específico
		return user.caixaId === caixaId
	}

	return {
		hasPermission,
		canUseCaixa,
		user,
	}
}

