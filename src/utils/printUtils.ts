/** Garante impressão só após renderização completa (impressora térmica Tanca TCP-650) */
export function imprimirRecibo() {
	setTimeout(() => {
		window.print()
	}, 300)
}
