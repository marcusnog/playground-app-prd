import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Login from './screens/Login'
import DashboardLayout from './screens/layouts/DashboardLayout'
import Parametros from './screens/Parametros'
import FormasPagamento from './screens/FormasPagamento'
import Brinquedos from './screens/Brinquedos'
import Clientes from './screens/Clientes'
import Abertura from './screens/caixa/Abertura'
import Fechamento from './screens/caixa/Fechamento'
import Sangria from './screens/caixa/Sangria'
import Suprimento from './screens/caixa/Suprimento'
import Lancamento from './screens/Lancamento'
import Acompanhamento from './screens/Acompanhamento'
import Relatorios from './screens/Relatorios'
import Pagamento from './screens/Pagamento'
import ReciboLancamento from './screens/recibos/ReciboLancamento'
import ReciboPagamento from './screens/recibos/ReciboPagamento'
import ReciboAbertura from './screens/recibos/ReciboAbertura'
import ReciboFechamento from './screens/recibos/ReciboFechamento'
import Usuarios from './screens/Usuarios'
import Caixas from './screens/Caixas'
import Estacionamentos from './screens/Estacionamentos'
import LancamentoEstacionamento from './screens/estacionamento/Lancamento'
import AcompanhamentoEstacionamento from './screens/estacionamento/Acompanhamento'
import CaixaAberturaEstacionamento from './screens/estacionamento/CaixaAbertura'
import CaixaFechamentoEstacionamento from './screens/estacionamento/CaixaFechamento'
import ReciboEstacionamentoPagamento from './screens/recibos/ReciboEstacionamentoPagamento'
import ReciboEstacionamentoAbertura from './screens/recibos/ReciboEstacionamentoAbertura'
import ReciboEstacionamentoFechamento from './screens/recibos/ReciboEstacionamentoFechamento'

function ProtectedRoute({ children }: { children: React.ReactElement }) {
	const { isAuthenticated, loading } = useAuth()
	
	// Aguardar o carregamento da sessão antes de verificar autenticação
	if (loading) {
		return (
			<div style={{ 
				display: 'flex', 
				justifyContent: 'center', 
				alignItems: 'center', 
				height: '100vh',
				flexDirection: 'column',
				gap: 16
			}}>
				<div>Carregando...</div>
			</div>
		)
	}
	
	if (!isAuthenticated) return <Navigate to="/login" replace />
	return children
}

export const router = createBrowserRouter([
	{ path: '/', element: <Navigate to="/acompanhamento" replace /> },
	{ path: '/login', element: <Login /> },
	{
		path: '/',
		element: (
			<ProtectedRoute>
				<DashboardLayout />
			</ProtectedRoute>
		),
		children: [
			{ path: 'parametros', element: <Parametros /> },
			{ path: 'formas-pagamento', element: <FormasPagamento /> },
			{ path: 'brinquedos', element: <Brinquedos /> },
			{ path: 'clientes', element: <Clientes /> },
			{ path: 'usuarios', element: <Usuarios /> },
			{ path: 'caixas', element: <Caixas /> },
			{ path: 'caixa', element: <Navigate to="/caixa/abertura" replace /> },
			{ path: 'caixa/abertura', element: <Abertura /> },
			{ path: 'caixa/fechamento', element: <Fechamento /> },
			{ path: 'caixa/sangria', element: <Sangria /> },
			{ path: 'caixa/suprimento', element: <Suprimento /> },
			{ path: 'lancamento', element: <Lancamento /> },
			{ path: 'acompanhamento', element: <Acompanhamento /> },
			{ path: 'relatorios', element: <Relatorios /> },
			{ path: 'pagamento/:id', element: <Pagamento /> },
			{ path: 'recibo/lancamento/:id', element: <ReciboLancamento /> },
			{ path: 'recibo/pagamento/:id', element: <ReciboPagamento /> },
			{ path: 'recibo/abertura/:id', element: <ReciboAbertura /> },
			{ path: 'recibo/fechamento/:id', element: <ReciboFechamento /> },
			{ path: 'estacionamentos', element: <Estacionamentos /> },
			{ path: 'estacionamento/lancamento', element: <LancamentoEstacionamento /> },
			{ path: 'estacionamento/acompanhamento', element: <AcompanhamentoEstacionamento /> },
			{ path: 'estacionamento/caixa/abertura', element: <CaixaAberturaEstacionamento /> },
			{ path: 'estacionamento/caixa/fechamento', element: <CaixaFechamentoEstacionamento /> },
			{ path: 'recibo/estacionamento/pagamento/:id', element: <ReciboEstacionamentoPagamento /> },
			{ path: 'recibo/estacionamento/abertura/:id', element: <ReciboEstacionamentoAbertura /> },
			{ path: 'recibo/estacionamento/fechamento/:id', element: <ReciboEstacionamentoFechamento /> },
		],
	},
])


