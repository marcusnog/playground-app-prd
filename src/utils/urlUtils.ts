/** Retorna URL absoluta incluindo o base path (ex: /playground-app-prd/) para uso em window.open, etc. */
export function appUrl(path: string): string {
	const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
	const p = path.startsWith('/') ? path : `/${path}`
	return `${window.location.origin}${base}${p}`
}
