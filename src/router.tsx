import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import Login from './screens/Login'
import DashboardLayout from './screens/layouts/DashboardLayout'
import Parametros from './screens/Parametros'
import FormasPagamento from './screens/FormasPagamento'
import Brinquedos from './screens/Brinquedos'
import Caixa from './screens/Caixa'
import Lancamento from './screens/Lancamento'
import Acompanhamento from './screens/Acompanhamento'
import Pagamento from './screens/Pagamento'
import ReciboLancamento from './screens/recibos/ReciboLancamento'
import ReciboPagamento from './screens/recibos/ReciboPagamento'

function ProtectedRoute({ children }: { children: React.ReactElement }) {
	const { isAuthenticated } = useAuth()
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
			{ path: 'caixa', element: <Caixa /> },
			{ path: 'lancamento', element: <Lancamento /> },
			{ path: 'acompanhamento', element: <Acompanhamento /> },
			{ path: 'pagamento/:id', element: <Pagamento /> },
			{ path: 'recibo/lancamento/:id', element: <ReciboLancamento /> },
			{ path: 'recibo/pagamento/:id', element: <ReciboPagamento /> },
		],
	},
])


