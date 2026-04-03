/* eslint-disable react-refresh/only-export-components */

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

// Nav icons

export function IcoDashboard({ size = 18 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<rect x="3" y="3" width="7" height="7" rx="1.5"/>
			<rect x="14" y="3" width="7" height="7" rx="1.5"/>
			<rect x="14" y="14" width="7" height="7" rx="1.5"/>
			<rect x="3" y="14" width="7" height="7" rx="1.5"/>
		</svg>
	)
}

export function IcoTicket({ size = 18 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
			<line x1="9" y1="12" x2="15" y2="12" strokeDasharray="2 2"/>
		</svg>
	)
}

export function IcoEdit({ size = 18 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
			<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
		</svg>
	)
}

export function IcoLock({ size = 18 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<rect x="3" y="11" width="18" height="11" rx="2"/>
			<path d="M7 11V7a5 5 0 0 1 10 0v4"/>
		</svg>
	)
}

export function IcoCashRegister({ size = 18 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<path d="M6 2h12a1 1 0 0 1 1 1v3H5V3a1 1 0 0 1 1-1z"/>
			<path d="M3 6h18v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>
			<path d="M9 11h6M12 8v6"/>
		</svg>
	)
}

export function IcoCar({ size = 18 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<path d="M5 17H3a1 1 0 0 1-1-1v-4l2.7-5.4A1 1 0 0 1 5.6 6h12.8a1 1 0 0 1 .9.6L22 12v4a1 1 0 0 1-1 1h-2"/>
			<circle cx="7.5" cy="17.5" r="2.5"/>
			<circle cx="16.5" cy="17.5" r="2.5"/>
			<path d="M2 12h20"/>
		</svg>
	)
}

export function IcoBarChart({ size = 18 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<line x1="18" y1="20" x2="18" y2="10"/>
			<line x1="12" y1="20" x2="12" y2="4"/>
			<line x1="6" y1="20" x2="6" y2="14"/>
			<line x1="2" y1="20" x2="22" y2="20"/>
		</svg>
	)
}

export function IcoSettings({ size = 18 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<circle cx="12" cy="12" r="3"/>
			<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
		</svg>
	)
}

export function IcoUsers({ size = 18 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
			<circle cx="9" cy="7" r="4"/>
			<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
			<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
		</svg>
	)
}

export function IcoUser({ size = 18 }: { size?: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
			<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
			<circle cx="12" cy="7" r="4"/>
		</svg>
	)
}
