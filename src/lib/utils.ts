import axios from 'axios'
import { clsx, type ClassValue } from 'clsx'
import { toast } from 'sonner'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function showErrorToast(error: unknown) {
	const toStr = (e: unknown): string => {
		if (e === null || e === undefined) return "Noma'lum xatolik"
		if (typeof e === 'string') return e
		if (typeof e === 'number' || typeof e === 'boolean') return e.toString()
		if (Array.isArray(e)) return e.map(toStr).join(', ')
		if (typeof e === 'object') {
			const errObj = e as Record<string, unknown>
			if ('message' in errObj && typeof errObj.message === 'string')
				return errObj.message
			return JSON.stringify(errObj)
		}
		return String(e)
	}

	if (axios.isAxiosError(error) && error.response?.data) {
		const errors = error.response.data

		if (Array.isArray(errors)) {
			errors.forEach(msg =>
				toast.error(toStr(msg), { position: 'top-center', richColors: true })
			)
			return
		}

		if (typeof errors === 'object' && errors !== null) {
			const errorMap = errors as Record<string, unknown>
			for (const key in errorMap) {
				const item = errorMap[key]
				if (Array.isArray(item)) {
					item.forEach(msg =>
						toast.error(toStr(msg), {
							position: 'top-center',
							richColors: true,
						})
					)
				} else {
					toast.error(toStr(item), { position: 'top-center', richColors: true })
				}
			}
			return
		}

		toast.error(toStr(errors), { position: 'top-center', richColors: true })
		return
	}

	toast.error("Noma'lum xatolik", { position: 'top-center', richColors: true })
	console.error('Unknown error:', error)
}
