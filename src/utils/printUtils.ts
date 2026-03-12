/** Estilos para impressão térmica Tanca TCP-650 (papel 80mm) */
const RECEIPT_PRINT_STYLES = `
@media print {
  @page { size: 80mm auto; margin: 0; }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: 80mm;
  margin: 0;
  padding: 0;
  background: white;
  color: #000;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  font-weight: 600;
}
body { padding: 4mm; }
.receipt, #recibo {
  width: 72mm;
  max-width: 72mm;
  margin: 0;
  padding: 0;
}
.receipt h3, #recibo h3 { margin: 0 0 6px; text-align: center; font-size: 14px; font-weight: 700; }
.receipt hr, #recibo hr { border: none; border-top: 2px solid #000; margin: 6px 0; }
.receipt img, #recibo img { max-width: 65mm; height: auto; display: block; margin: 0 auto; }
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

/** Garante impressão só após renderização completa. Usa janela dedicada para recibo (impressora térmica Tanca TCP-650). */
export function imprimirRecibo() {
	setTimeout(() => {
		const recibo = document.getElementById('recibo')
		if (!recibo) {
			window.print()
			return
		}

		const win = window.open('', '_blank', 'width=300,height=400')
		if (!win) {
			window.print()
			return
		}

		let html = recibo.innerHTML
		html = html.replace(/<img([^>]*)src="([^"]*)"/gi, (_m, attrs, src) => `<img${attrs}src="${toAbsoluteUrl(src)}"`)

		const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recibo</title><style>${RECEIPT_PRINT_STYLES}</style></head><body><div id="recibo" class="receipt">${html}</div></body></html>`
		win.document.open()
		win.document.write(doc)
		win.document.close()

		const doPrint = () => {
			win.focus()
			win.print()
			const closeAfterPrint = () => {
				win.close()
			}
			win.onafterprint = closeAfterPrint
			setTimeout(closeAfterPrint, 1000)
		}

		if (win.document.readyState === 'complete') {
			setTimeout(doPrint, 100)
		} else {
			win.onload = () => setTimeout(doPrint, 100)
		}
	}, 300)
}
