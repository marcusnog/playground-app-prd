/** Estilos para impressão - 7cm largura x 8cm altura (retrato) - cores escuras para boa visibilidade em impressora térmica */
const RECEIPT_PRINT_STYLES = `
:root {
  --danger: #000;
  --success: #000;
}
@media print {
  @page { size: 7cm 8cm; margin: 0; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    min-height: 0 !important;
  }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: 7cm;
  margin: 0;
  padding: 0;
  height: auto;
  min-height: 0;
  background: white;
  color: #000;
  font-family: 'Courier New', Courier, monospace;
  font-size: 13px;
  font-weight: 600;
}
body { padding: 2mm; }
.receipt, #recibo {
  width: 6.6cm;
  max-width: 6.6cm;
  margin: 0 !important;
  padding: 0 !important;
  position: static !important;
}
.receipt h3, #recibo h3 { margin: 0 0 6px; text-align: center; font-size: 15px; font-weight: 700; }
.receipt hr, #recibo hr { border: none; border-top: 2px solid #000; margin: 6px 0; }
.receipt img, #recibo img { max-width: 6.6cm; height: auto; display: block; margin: 0 auto; }
.receipt *, #recibo * { color: #000; }
`

/** Converte src de img relativo para URL absoluta */
function toAbsoluteUrl(src: string): string {
	if (!src || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
		return src
	}
	try {
		return new URL(src, window.location.origin).href
	} catch {
		return src
	}
}

/** Garante impressão só após renderização completa. Usa iframe (evita bloqueio de pop-up) para recibo - impressora térmica Tanca TCP-650. */
export function imprimirRecibo() {
	setTimeout(() => {
		const recibo = document.getElementById('recibo')
		if (!recibo) {
			window.print()
			return
		}

		let html = recibo.innerHTML
		html = html.replace(/<img([^>]*)src="([^"]*)"/gi, (_m, attrs, src) => `<img${attrs}src="${toAbsoluteUrl(src)}"`)

		const iframe = document.createElement('iframe')
		iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden'
		document.body.appendChild(iframe)

		const doc = iframe.contentDocument || iframe.contentWindow?.document
		if (!doc) {
			document.body.removeChild(iframe)
			window.print()
			return
		}

		doc.open()
		doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recibo</title><style>${RECEIPT_PRINT_STYLES}</style></head><body><div id="recibo" class="receipt">${html}</div></body></html>`)
		doc.close()

		const printFrame = () => {
			try {
				iframe.contentWindow?.focus()
				iframe.contentWindow?.print()
			} finally {
				setTimeout(() => {
					document.body.removeChild(iframe)
				}, 500)
			}
		}

		if (iframe.contentDocument?.readyState === 'complete') {
			setTimeout(printFrame, 400)
		} else {
			iframe.onload = () => setTimeout(printFrame, 400)
		}
	}, 300)
}
