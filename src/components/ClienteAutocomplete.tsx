import { useState, useMemo, useRef, useEffect } from 'react'
import type { Cliente } from '../services/entitiesService'

function formatClienteLabel(c: Cliente): string {
	return `${c.nomeCompleto} - ${new Date(c.dataNascimento).toLocaleDateString('pt-BR')}`
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
	placeholder = 'Selecione ou digite para buscar...',
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
		const term = inputValue.trim().toLowerCase()
		if (!term) return clientes
		return clientes.filter((c) =>
			c.nomeCompleto.toLowerCase().includes(term)
		)
	}, [clientes, inputValue])

	// Sync input display when value changes from parent
	useEffect(() => {
		if (value && selectedCliente) {
			setInputValue(formatClienteLabel(selectedCliente))
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
		setInputValue(formatClienteLabel(cliente))
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
					setInputValue(formatClienteLabel(selectedCliente))
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
						maxHeight: 220,
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
						filteredClientes.map((c, i) => (
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
								{formatClienteLabel(c)}
							</li>
						))
					)}
				</ul>
			)}
		</div>
	)
}
