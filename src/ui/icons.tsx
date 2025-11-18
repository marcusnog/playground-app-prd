
export type PaymentKind = 'pix' | 'cash' | 'card'

export function resolvePaymentKind(idOrText: string | undefined): PaymentKind {
	if (!idOrText) return 'card'
	const s = idOrText.toLowerCase()
	if (s.includes('pix')) return 'pix'
	if (s.includes('dinheiro') || s.includes('cash')) return 'cash'
	if (s.includes('debito') || s.includes('débito') || s.includes('credito') || s.includes('crédito') || s.includes('cartao') || s.includes('cartão') || s.includes('card')) return 'card'
	return 'card'
}


export function PaymentIcon({ kind, size = 16 }: { kind: PaymentKind; size?: number }) {
	if (kind === 'pix') {
		return (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
				<path d="M7 12l5-5 5 5-5 5-5-5z" fill="currentColor"/>
			</svg>
		)
	}
	if (kind === 'cash') {
		return (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
				<rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor"/>
				<circle cx="12" cy="12" r="3" stroke="currentColor"/>
			</svg>
		)
	}
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
			<rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor"/>
			<rect x="4" y="9" width="8" height="2" fill="currentColor"/>
			<rect x="14" y="9" width="6" height="6" stroke="currentColor"/>
		</svg>
	)
}


