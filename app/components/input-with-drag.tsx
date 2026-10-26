import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { cn, countDecimals } from '#app/utils/misc.js'
type InputModifier = 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'
export type InputDragModifiers = {
	[key in InputModifier]?: number
}
export type InputWithDragChangeHandler = (newValue: number) => void
interface InputProps
	extends Omit<
		React.InputHTMLAttributes<HTMLInputElement>,
		'onChange' | 'onInput' | 'value'
	> {
	label: React.ReactNode
	// mouseDragThreshold?: number;
	// tabletDragThreshold?: number;
	modifiers?: InputDragModifiers
}
/*  * Input with drag functionality
  @prop {number} mouseDragThreshold - The number of pixels that a User Interface element has to be moved before it is recognized.
  @prop {number} tabletDragThreshold - The drag threshold for tablet events. */
export default function InputDrag({
	// mouseDragThreshold = 3,
	// tabletDragThreshold = 10,
	modifiers: _modifiers = {},
	defaultValue,
	className,
	...props
}: InputProps) {
	const [value, setValue] = React.useState<number>(+(defaultValue || 0))
	const [inputValue, setInputValue] = useState<string>(String(value))
	const [modifier, setModifier] = useState<InputModifier | ''>('')
	const startValue = useRef(0)
	const step = props.step ? +props.step : 1
	const modifiers: InputDragModifiers = useMemo(
		() => ({
			shiftKey: 0.1,
			..._modifiers,
		}),
		[_modifiers],
	)
	const startPosition = useRef([0, 0])

	useEffect(() => {
		setInputValue(String(value))
	}, [value])

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { value } = e.target

		if (value === '-' || value === '') {
			setInputValue(value)
			return
		}

		setValue(parseInt(value, 10))
	}

	const handleMove = useCallback(
		(e: MouseEvent) => {
			// where the mouse was when the drag started
			const pos = startPosition.current
			const [x1, y1] = pos

			// where the mouse is now
			const { clientX: x2, clientY: y2 } = e

			// the distance between the two points
			const a = x1 - x2
			const b = y1 - y2

			let mod = 1
			if (modifier) {
				mod = modifiers[modifier] || 1
			}
			const stepModifer = step * mod
			const decimals = countDecimals(stepModifer)

			// Get the hypotenuse of the triangle
			let delta = Math.sqrt(a * a + b * b) * stepModifer

			// if the current x position is less than the previous x position, then the delta should be negative
			if (x2 < x1) delta = -delta
			let newValue: number = startValue.current + delta
			if (props.min) newValue = Math.max(newValue, +props.min)
			if (props.max) newValue = Math.min(newValue, +props.max)
			newValue = +newValue.toFixed(decimals)
			setValue(newValue)
		},
		[modifier, props.max, props.min, step, modifiers],
	)
	const handleMoveEnd = useCallback(() => {
		document.documentElement.style.cursor = 'auto'
		document.documentElement.style.userSelect = 'auto'
		document.body.style.pointerEvents = 'auto'

		document.removeEventListener('mousemove', handleMove)
		document.removeEventListener('mouseup', handleMoveEnd)
	}, [handleMove])

	const handleDown = useCallback(
		(e: React.MouseEvent<HTMLInputElement>) => {
			let _startValue = +value
			if (isNaN(_startValue)) {
				_startValue = +(defaultValue || props.min || 0)
			}
			startValue.current = _startValue
			startPosition.current = [e.clientX, e.clientY]

			document.documentElement.style.cursor = 'ew-resize'
			document.documentElement.style.userSelect = 'none'
			document.body.style.pointerEvents = 'none'

			document.addEventListener('mousemove', handleMove)
			document.addEventListener('mouseup', handleMoveEnd)
		},
		[handleMove, handleMoveEnd, value, props.min, defaultValue],
	)

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.metaKey) {
			setModifier('metaKey')
		} else if (e.ctrlKey) {
			setModifier('ctrlKey')
		} else if (e.altKey) {
			setModifier('altKey')
		} else if (e.shiftKey) {
			setModifier('shiftKey')
		}
	}

	const handleKeyUp = () => {
		setModifier('')
	}

	useEffect(() => {
		document.addEventListener('keydown', handleKeyDown)
		document.addEventListener('keyup', handleKeyUp)

		return () => {
			document.removeEventListener('mousemove', handleMove)
			document.removeEventListener('mouseup', handleMoveEnd)
			document.removeEventListener('keydown', handleKeyDown)
			document.removeEventListener('keyup', handleKeyUp)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<label
			className={cn(
				'relative flex h-10 w-full items-center space-x-4 rounded-md border border-input px-4 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring',
				className,
			)}
		>
			<span
				className="cursor-ew-resize select-none text-foreground/60"
				onMouseDown={handleDown}
			>
				{props.label}
			</span>
			<input
				{...props}
				type="text"
				// inputMode="numeric"
				// pattern="/^-?(0|[1-9]\d*)(\.\d+)?$/"
				value={inputValue}
				className="bg-background focus:outline-none"
				onChange={handleInputChange}
			/>
		</label>
	)
}
