'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Lock, Loader2, Mail, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, extractToken } from '@/lib/api-client'
import { setSessionToken } from '@/lib/auth'

export function RegisterForm() {
	const router = useRouter()
	const [email, setEmail] = React.useState('')
	const [password, setPassword] = React.useState('')
	const [loading, setLoading] = React.useState(false)

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (loading) return

		setLoading(true)
		try {
			await api.register(email.trim(), password)
			const payload = await api.login(email.trim(), password)
			const token = extractToken(payload)

			if (!token) {
				throw new Error('Token qaytmadi.')
			}

			setSessionToken(token)
			toast.success('Hisob yaratildi.', { richColors: true })
			router.replace('/chat')
			router.refresh()
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Ro'yxatdan o'tishda xatolik."
			toast.error(message, { richColors: true })
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className='auth-shell'>
			<form onSubmit={onSubmit} className='auth-card auth-card-elevated'>
				<div className='mb-4 flex items-center justify-center'>
					<Image
						src='/images/logo-main.png'
						alt='SecGPT'
						width={46}
						height={46}
						className='rounded-xl'
						priority
					/>
					SecGPT
				</div>

				<div className='space-y-3'>
					<div className='auth-input-wrap'>
						<Mail className='auth-input-icon' />
						<Input
							type='email'
							value={email}
							onChange={event => setEmail(event.target.value)}
							placeholder='Email'
							autoComplete='email'
							className='auth-input auth-input-pl'
							required
						/>
					</div>

					<div className='auth-input-wrap'>
						<Lock className='auth-input-icon' />
						<Input
							type='password'
							value={password}
							onChange={event => setPassword(event.target.value)}
							placeholder='Parol'
							autoComplete='new-password'
							className='auth-input auth-input-pl'
							minLength={6}
							required
						/>
					</div>
				</div>

				<Button type='submit' disabled={loading} className='auth-submit'>
					{loading ? (
						<Loader2 className='size-4 animate-spin' />
					) : (
						<UserPlus className='size-4' />
					)}
					Davom etish
				</Button>

				<Link href='/login' className='auth-link auth-link-center'>
					Kirish
				</Link>
			</form>
		</div>
	)
}
