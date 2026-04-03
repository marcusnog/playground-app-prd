import { useState, useCallback, useRef, useEffect } from 'react'
import { AgentChat } from '@21st-sdk/react'
import type { UIMessage, ChatStatus } from 'ai'
import { Sparkles, X } from 'lucide-react'
import { config } from '../config'

let _msgId = 0
function newId() { return `msg-${++_msgId}` }

function toUIMessage(role: 'user' | 'assistant', text: string): UIMessage {
	return {
		id: newId(),
		role,
		parts: [{ type: 'text', text }],
		metadata: undefined,
	} as UIMessage
}

function getTextFromMessage(msg: UIMessage): string {
	return msg.parts
		.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
		.map(p => p.text)
		.join('')
}

export default function AIAssistant() {
	const [open, setOpen] = useState(false)
	const [messages, setMessages] = useState<UIMessage[]>([])
	const [status, setStatus] = useState<ChatStatus>('ready')
	const [error, setError] = useState<Error | undefined>()
	const abortRef = useRef<AbortController | null>(null)

	const [colorMode, setColorMode] = useState<'light' | 'dark'>('dark')
	useEffect(() => {
		function sync() {
			const isLight = document.documentElement.dataset.theme === 'light'
			setColorMode(isLight ? 'light' : 'dark')
		}
		sync()
		const obs = new MutationObserver(sync)
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
		return () => obs.disconnect()
	}, [])

	const handleSend = useCallback(async (msg: { role: 'user'; content: string }) => {
		if (status === 'streaming') return

		const userMsg = toUIMessage('user', msg.content)
		const nextMessages = [...messages, userMsg]
		setMessages(nextMessages)
		setStatus('streaming')
		setError(undefined)

		const ctrl = new AbortController()
		abortRef.current = ctrl

		try {
			const res = await fetch(`${config.apiBaseUrl}/api/ai/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: nextMessages.map(m => ({
						role: m.role,
						content: getTextFromMessage(m),
					}))
				}),
				signal: ctrl.signal,
			})

			if (!res.ok) {
				throw new Error(`Erro ${res.status}: ${await res.text()}`)
			}

			const data = await res.json() as { content: string }
			setMessages(prev => [...prev, toUIMessage('assistant', data.content)])
		} catch (e) {
			if ((e as Error).name === 'AbortError') return
			setError(e instanceof Error ? e : new Error('Erro ao conectar com o assistente'))
		} finally {
			setStatus('ready')
			abortRef.current = null
		}
	}, [messages, status])

	const handleStop = useCallback(() => {
		abortRef.current?.abort()
		setStatus('ready')
	}, [])

	return (
		<>
			{/* Floating button */}
			<button
				className={`ai-fab ${open ? 'ai-fab-active' : ''}`}
				onClick={() => setOpen(v => !v)}
				aria-label={open ? 'Fechar assistente' : 'Abrir assistente IA'}
			>
				{open ? <X size={20} /> : <Sparkles size={20} />}
				{!open && <span className="ai-fab-label">Assistente</span>}
			</button>

			{/* Chat drawer */}
			{open && (
				<div className="ai-drawer">
					<div className="ai-drawer-header">
						<div className="ai-drawer-title">
							<Sparkles size={16} style={{ color: 'var(--primary)' }} />
							<span>Assistente Playground</span>
						</div>
						<button className="ai-drawer-close" onClick={() => setOpen(false)}>
							<X size={18} />
						</button>
					</div>
					<div className="ai-drawer-body">
						<AgentChat
							messages={messages}
							onSend={handleSend}
							status={status}
							onStop={handleStop}
							error={error}
							colorMode={colorMode}
						/>
					</div>
				</div>
			)}

			{open && <div className="ai-backdrop" onClick={() => setOpen(false)} />}
		</>
	)
}
