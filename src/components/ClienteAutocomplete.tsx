import { useState, useMemo, useRef, useEffect } from 'react'
import type { Cliente } from '../services/entitiesService'

function formatDataNascimento(d: string): string {
	try {
		return new Date(d).toLocaleDateString('pt-BR')
	} catch {
		return ''
	}
}

function formatResponsavel(c: Cliente): string {
	if (c.nomePai && c.nomeMae) return `Pai: ${c.nomePai} / Mãe: ${c.nomeMae}`
	if (c.nomePai) return `Pai: ${c.nomePai}`
	if (c.nomeMae) return `Mãe: ${c.nomeMae}`
	return ''
}

/** Label curto para o input quando selecionado */
function formatClienteLabelShort(c: Cliente): string {
	const parts = [c.nomeCompleto]
	const resp = formatResponsavel(c)
	if (resp) parts.push(resp)
	parts.push(formatDataNascimento(c.dataNascimento))
	if (c.telefoneWhatsapp) parts.push(c.telefoneWhatsapp)
	return parts.join(' • ')
}

/** Linha principal no dropdown: nome + infos ao lado */
function formatClienteDisplay(c: Cliente): { nome: string; infos: string } {
	const infos: string[] = []
	if (formatResponsavel(c)) infos.push(formatResponsavel(c))
	infos.push(formatDataNascimento(c.dataNascimento))
	if (c.telefoneWhatsapp) infos.push(c.telefoneWhatsapp)
	return {
		nome: c.nomeCompleto,
		infos: infos.join(' | '),
	}
}

type Props = {
	clientes: Cliente[]
	value: string
	onSelect: (clienteId: string) => void
	placeholder?: string
	disabled?: boolean
	className?: string
	style?: React.CSSProperties
}

export default function ClienteAutocomplete({
	clientes,
	value,
	onSelect,
	placeholder = 'Nome, responsável, data nasc. ou telefone...',
	disabled = false,
	className = '',
	style,
}: Props) {
	const [inputValue, setInputValue] = useState('')
	const [isOpen, setIsOpen] = useState(false)
	const [highlightedIndex, setHighlightedIndex] = useState(0)
	const containerRef = useRef<HTMLDivElement>(null)

	const selectedCliente = useMemo(
		() => clientes.find((c) => c.id === value),
		[clientes, value]
	)

	const filteredClientes = useMemo(() => {
		const term = inputValue.trim()
		if (!term) return clientes
		const termos = term.toLowerCase().split(/\s+/).filter(Boolean)
		return clientes.filter((c) => {
			const nome = (c.nomeCompleto || '').toLowerCase()
			const pai = (c.nomePai || '').toLowerCase()
			const mae = (c.nomeMae || '').toLowerCase()
			const telefone = (c.telefoneWhatsapp || '').replace(/\D/g, '')
			let dataStr = ''
			try {
				dataStr = new Date(c.dataNascimento).toLocaleDateString('pt-BR')
			} catch { /* noop */ }
			const dataFormatada = dataStr.replace(/\D/g, '')
			const campos = [nome, pai, mae, dataStr.toLowerCase(), dataFormatada, telefone]
			const termoMatch = (t: string) => {
				const tDig = t.replace(/\D/g, '')
				return campos.some((campo) => campo.includes(t)) || (tDig.length >= 2 && telefone.includes(tDig))
			}
			return termos.every(termoMatch)
		})
	}, [clientes, inputValue])

	// Sync input display when value changes from parent
	useEffect(() => {
		if (value && selectedCliente) {
			setInputValue(formatClienteLabelShort(selectedCliente))
		} else {
			setInputValue('')
		}
	}, [value, selectedCliente])

	// Reset highlighted index when filtered list changes
	useEffect(() => {
		setHighlightedIndex(0)
	}, [filteredClientes])

	// Click outside to close
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	function handleSelect(cliente: Cliente) {
		onSelect(cliente.id)
		setInputValue(formatClienteLabelShort(cliente))
		setIsOpen(false)
	}

	function handleClear() {
		onSelect('')
		setInputValue('')
		setIsOpen(false)
	}

	function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const v = e.target.value
		setInputValue(v)
		setIsOpen(true)
		if (!v) {
			onSelect('')
		}
	}

	function handleInputFocus() {
		setIsOpen(true)
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (!isOpen) {
			if (e.key === 'ArrowDown' || e.key === 'Enter') {
				e.preventDefault()
				setIsOpen(true)
			}
			return
		}

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				setHighlightedIndex((i) =>
					i < filteredClientes.length - 1 ? i + 1 : 0
				)
				break
			case 'ArrowUp':
				e.preventDefault()
				setHighlightedIndex((i) =>
					i > 0 ? i - 1 : filteredClientes.length - 1
				)
				break
			case 'Enter':
				e.preventDefault()
				if (filteredClientes[highlightedIndex]) {
					handleSelect(filteredClientes[highlightedIndex])
				}
				break
			case 'Escape':
				e.preventDefault()
				setIsOpen(false)
				if (value && selectedCliente) {
					setInputValue(formatClienteLabelShort(selectedCliente))
				}
				break
			case 'Backspace':
				if (!inputValue && value) {
					handleClear()
				}
				break
		}
	}

	const showDropdown = isOpen && !disabled

	return (
		<div
			ref={containerRef}
			className={`cliente-autocomplete ${className}`.trim()}
			style={{ position: 'relative', ...style }}
		>
			<div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
				<input
					type="text"
					className="input"
					value={inputValue}
					onChange={handleInputChange}
					onFocus={handleInputFocus}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={disabled}
					autoComplete="off"
					style={{ flex: 1, paddingRight: value ? 36 : 12 }}
				/>
				{value && (
					<button
						type="button"
						onClick={handleClear}
						disabled={disabled}
						aria-label="Limpar seleção"
						style={{
							position: 'absolute',
							right: 8,
							background: 'none',
							border: 'none',
							color: 'var(--muted)',
							cursor: disabled ? 'not-allowed' : 'pointer',
							padding: 4,
							fontSize: '1rem',
							lineHeight: 1,
						}}
					>
						✕
					</button>
				)}
			</div>
			{showDropdown && (
				<ul
					className="cliente-autocomplete-dropdown"
					role="listbox"
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						right: 0,
						margin: 0,
						marginTop: 4,
						padding: 0,
						listStyle: 'none',
						maxHeight: 280,
						overflowY: 'auto',
						zIndex: 100,
						borderRadius: 8,
						border: '1px solid var(--border)',
						background: 'var(--bg-soft)',
						boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
					}}
				>
					{filteredClientes.length === 0 ? (
						<li
							style={{
								padding: '12px 16px',
								color: 'var(--muted)',
								fontSize: '0.9rem',
							}}
						>
							Nenhum cliente encontrado
						</li>
					) : (
						filteredClientes.map((c, i) => {
							const { nome, infos } = formatClienteDisplay(c)
							return (
								<li
									key={c.id}
									role="option"
									aria-selected={i === highlightedIndex}
									onClick={() => handleSelect(c)}
									style={{
										padding: '10px 12px',
										cursor: 'pointer',
										background:
											i === highlightedIndex
												? 'rgba(59, 130, 246, 0.2)'
												: 'transparent',
										borderBottom:
											i < filteredClientes.length - 1
												? '1px solid var(--border)'
												: 'none',
										fontSize: '0.95rem',
									}}
									onMouseEnter={() => setHighlightedIndex(i)}
								>
									<div style={{ fontWeight: 600 }}>{nome}</div>
									{infos && (
										<div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>
											{infos}
										</div>
									)}
								</li>
							)
						})
					)}
				</ul>
			)}
		</div>
	)
}
