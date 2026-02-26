'use client'

import { Button } from '@/components/ui/button'
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import axios from 'axios'
import { showErrorToast } from '@/lib/utils'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { APISERVICE } from '@/services'
import Cookies from 'js-cookie'

const formSchema = z.object({
	email: z.string().regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/),
	password: z.string().min(6).max(12),
})

function Login() {
	const [buttonloader, setButtonloader] = useState(false)
	const navigate = useNavigate()
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: '',
			password: '',
		},
	})

	function onSubmit(values: z.infer<typeof formSchema>) {
		setButtonloader(true)

		axios
			.post(APISERVICE.login, {
				email: values.email,
				password: values.password,
			})
			.then(res => {
				toast.success('Tizimga muvaffaqiyatli kirdingiz!', {
					position: 'top-center',
					richColors: true,
				})
				Cookies.set('session_token', res.data.token)
				navigate('/')
			})
			.catch(error => showErrorToast(error))
			.finally(() => setButtonloader(false))
	}

	return (
		<div className='fixed top-0 left-0 w-screen h-screen overflow-hidden flex items-center justify-center'>
			<Card className='w-full max-w-sm'>
				<CardHeader>
					<CardTitle>Tizimga kirish</CardTitle>
					<CardDescription>
						Tizimga kirish uchun username va parolingizni kiriting
					</CardDescription>
					<CardAction>
						<Link to={'/register'}>
							<Button variant='link'>Ro&lsquo;yhatdan o'tish</Button>
						</Link>
					</CardAction>
				</CardHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
						<CardContent className='flex flex-col gap-3'>
							<FormField
								control={form.control}
								name='email'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input placeholder='email' {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name='password'
								render={({ field }) => (
									<FormItem>
										<FormLabel>Password</FormLabel>
										<FormControl>
											<Input
												placeholder='password'
												onDoubleClick={e => {
													const input = e.currentTarget
													input.type =
														input.type === 'password' ? 'text' : 'password'
												}}
												type='password'
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</CardContent>
						<CardFooter className='flex-col gap-2'>
							<Button type='submit' className='w-full'>
								{buttonloader && <Loader2 className='animate-spin' />}
								Kirish
							</Button>
							{/* <Button variant='outline' className='w-full'>
								Login with Google
							</Button> */}
						</CardFooter>
					</form>
				</Form>
			</Card>
		</div>
	)
}

export default Login
