import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
	MessageSquare,
	Plus,
	Send,
	Trash2,
	Loader2,
	Copy,
	X,
	CirclePlusIcon,
	ArrowUpIcon,
	ArrowDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import axios from 'axios'
import type { ChatHistory, SessionTypes } from '@/interfaces'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { APISERVICE } from '@/services'
import { cn, showErrorToast } from '@/lib/utils'
import Cookies from 'js-cookie'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupText,
	InputGroupTextarea,
} from './ui/input-group'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Separator } from './ui/separator'
import DOMPurify from 'dompurify'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from './ui/select'

export default function ChatApp() {
	const [searchParams, setSearchParams] = useSearchParams()
	const [chatId, setChatId] = useState<string | null>(null)
	const [chats, setChats] = useState<SessionTypes[] | null>(null)
	const [currentChat, setCurrentChat] = useState<ChatHistory[]>([])
	const [message, setMessage] = useState('')
	const [sending, setSending] = useState(false)
	const [aiTyping, setAiTyping] = useState(false)
	const [typedResponse, setTypedResponse] = useState('')
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const scrollAreaRef = useRef<HTMLDivElement>(null)
	const [reload, setReload] = useState(false)
	const [showScrollButton, setShowScrollButton] = useState(false)
	const [userScrolledUp, setUserScrolledUp] = useState(false)
	const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const token = Cookies.get('session_token')
	const navigate = useNavigate()
	const [mode, setMode] = useState('ask')
	const [session, setSession] = useState<string | null>(null)
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	useEffect(() => {
		if (!textareaRef.current) return

		const textarea = textareaRef.current
		textarea.style.height = 'auto'
		textarea.style.height = textarea.scrollHeight + 'px'
	}, [message])

	const newSessionId = async (): Promise<string | null> => {
		try {
			const res = await axios.post(
				APISERVICE.session,
				{},
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)
			setSession(res.data.session_id)

			return res.data.session_id
		} catch (err) {
			showErrorToast(err)
			if (axios.isAxiosError(err) && err.response?.status === 401) {
				navigate('/login')
			}
			return null
		}
	}

	useEffect(() => {
		const sync = async () => {
			const id = searchParams.get('c')
			if (id) {
				setChatId(id)
				setReload(!reload)
			}
		}
		sync()
	}, [searchParams])

	useEffect(() => {
		axios
			.get(APISERVICE.sessions, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
			.then(res => setChats(res.data))
			.catch(err => {
				showErrorToast(err)
				if (axios.isAxiosError(err) && err.response?.status === 401) {
					navigate('/login')
				}
			})
	}, [reload])

	useEffect(() => {
		if (!chatId) return
		const fetchSession = async () => {
			try {
				const res = await axios.get(
					`${APISERVICE.sessions}/${chatId}?limit=50&offset=0`,
					{
						headers: {
							Accept: 'application/json',
							Authorization: `Bearer ${token}`,
						},
					},
				)
				const data = res.data

				setCurrentChat(data)
				console.log(data)
				setTypedResponse('')
			} catch (err) {
				toast.error('Suhbat ochilmadi')
				if (axios.isAxiosError(err) && err.response?.status === 401) {
					navigate('/login')
				}
			}
		}
		fetchSession()
	}, [chatId])

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
		setShowScrollButton(false)
		setUserScrolledUp(false)
	}

	const handleScroll = (e: any) => {
		const scrollElement = e.target as HTMLDivElement
		const isAtBottom =
			scrollElement.scrollHeight -
				scrollElement.scrollTop -
				scrollElement.clientHeight <
			100

		setShowScrollButton(!isAtBottom)

		if (!isAtBottom) {
			setUserScrolledUp(true)
			// Reset the timeout if user scrolls up
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current)
			}
			// Auto-enable scroll after user stops scrolling for 2 seconds
			scrollTimeoutRef.current = setTimeout(() => {
				setUserScrolledUp(false)
			}, 2000)
		}
	}

	useEffect(() => {
		const t = setTimeout(scrollToBottom, 100)
		return () => clearTimeout(t)
	}, [currentChat])

	useEffect(() => {
		if (aiTyping && !userScrolledUp) {
			const t = setTimeout(() => {
				scrollToBottom()
			}, 300)
			return () => clearTimeout(t)
		}
	}, [typedResponse, aiTyping, userScrolledUp])

	useEffect(() => {
		return () => {
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current)
			}
		}
	}, [])

	const createNewChat = async () => {
		const id = await newSessionId()
		if (!id) return
		setChatId(id)
		setCurrentChat([])
		setSearchParams({ c: id })
		setReload(!reload)
	}

	const deleteChat = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation()

		try {
			await axios.delete(`${APISERVICE.sessions}/${id}`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
			toast.success('Suhbat o‘chirildi', {
				position: 'top-center',
				richColors: true,
			})
			setReload(!reload)
		} catch (err) {
			showErrorToast('O‘chirishda xato')
			if (axios.isAxiosError(err) && err.response?.status === 401) {
				navigate('/login')
			}
		}

		if (chatId === id) {
			navigate('/')
			window.location.reload
		}
	}

	const sendMessage = async (e: FormEvent) => {
		e.preventDefault()
		const text = message.trim()
		if (!text) return

		const sanitizedText = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })

		setMessage('')
		setSending(true)
		setAiTyping(true)
		setTypedResponse('')

		setCurrentChat(prev => [
			...prev,
			{ role: 'user', content: sanitizedText, created_at: Date.now() },
		])

		try {
			const res = await axios.post(
				APISERVICE.chat,
				{
					question: sanitizedText,
					...(chatId && { session_id: chatId }),
					mode,
				},
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			)

			setSession(res.data.session_id)
			setChatId(res.data.session_id)
			navigate(`/?c=${res.data.session_id}`)

			const answerText = res.data.answer || 'Javob yo‘q.'
			setCurrentChat(prev => [
				...prev,
				{ role: 'assistant', content: '', created_at: Date.now() },
			])
			let i = 0
			const interval = setInterval(() => {
				if (i < answerText.length) {
					setTypedResponse(prev => prev + answerText[i])
					i++
				} else {
					clearInterval(interval)
					setAiTyping(false)

					setCurrentChat(prev => {
						if (!prev) return prev
						const msgs = [...prev]
						const lastIndex = msgs.length - 1
						msgs[lastIndex] = {
							...msgs[lastIndex],
							content: answerText,
							created_at: Date.now(),
						}
						return msgs
					})

					setTypedResponse('')
				}
			}, 15)
		} catch (err: any) {
			setAiTyping(false)
			showErrorToast(err)
			if (axios.isAxiosError(err) && err.response?.status === 401) {
				navigate('/login')
			}
		} finally {
			setSending(false)
		}
	}

	return (
		<div className='min-h-screen bg-linear-to-br from-blue-950 via-slate-900 to-blue-950 text-white p-4'>
			<div className='max-w-screen mx-auto h-[calc(100vh-2rem)] flex gap-6'>
				<Card className='w-72 p-4 bg-black/30 backdrop-blur-2xl border border-blue-500/20 shadow-2xl flex flex-col'>
					<div className='flex items-center justify-between mb-6'>
						<div className='flex items-center gap-2'>
							<img src='/images/logo-white.png' alt='logo' className='h-10' />
							<h1 className='text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent'>
								SecGPT
							</h1>
						</div>
						<Button
							onClick={createNewChat}
							size='icon'
							className='bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30'
						>
							<Plus className='h-5 w-5' />
						</Button>
					</div>

					<ScrollArea className='flex-1 pr-2 max-h-full overflow-y-auto'>
						<AnimatePresence>
							{!chats ? (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className='text-center text-gray-400 mt-10'
								>
									<MessageSquare className='h-12 w-12 mx-auto mb-3 opacity-40' />
									<p className='text-sm text-white'>Hali suhbatlar yo‘q</p>
								</motion.div>
							) : (
								<div className='space-y-2 '>
									{chats
										.sort((a, b) => b.created_at - a.created_at)
										.map(chat => (
											<motion.div
												key={chat.session_id}
												initial={{ opacity: 0, x: -20 }}
												animate={{ opacity: 1, x: 0 }}
												exit={{ opacity: 0, x: 20 }}
												onClick={() => setSearchParams({ c: chat.session_id })}
												className={`group p-3 rounded-xl cursor-pointer transition-all backdrop-blur-sm border w-[99%] ${
													chatId === chat.session_id
														? 'bg-blue-600/20 border-blue-500/50 shadow-lg'
														: 'bg-white/5 hover:bg-blue-600/10 border-blue-500/20'
												}`}
											>
												<div className='flex items-center justify-between w-full'>
													<div className='flex-1 min-w-0'>
														<p className='font-medium text-sm truncate text-white'>
															{chat.chat_name
																? chat.chat_name.split('\n')[0].slice(0, 35)
																: 'Yangi chat'}
															...
														</p>
														<p className='text-xs text-blue-300'>
															{chat.chat_count}
														</p>
													</div>
													<Button
														size='icon'
														variant='ghost'
														onClick={e => deleteChat(chat.session_id, e)}
														className='h-7 w-7 opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/20'
													>
														<Trash2 className='h-4 w-4' />
													</Button>
												</div>
											</motion.div>
										))}
								</div>
							)}
						</AnimatePresence>
					</ScrollArea>
				</Card>

				<Card className='flex-1 bg-black/40 backdrop-blur-3xl border border-blue-500/20 shadow-2xl flex flex-col overflow-hidden'>
					{chatId ? (
						<>
							<div className='p-5 border-b border-blue-500/20 flex items-center justify-between backdrop-blur-sm'>
								<div>
									<h2 className='text-xl font-bold text-blue-300'>
										Yangi suhbat
									</h2>
									{/* <p className='text-sm text-blue-400'>
										{currentChat.messages.length} xabar
									</p> */}
								</div>
								<Button
									size='icon'
									variant='ghost'
									onClick={() => {
										navigate('/')
										window.location.reload()
									}}
									className='text-blue-400 hover:text-black'
								>
									<X className='h-5 w-5' />
								</Button>
							</div>

							<ScrollArea
								ref={scrollAreaRef}
								onScroll={handleScroll}
								className='flex-1 p-6 overflow-y-auto relative'
							>
								<img
									src='/images/logo-bg.png'
									alt='logo'
									className='absolute top-1/2 left-1/2 -translate-1/2 opacity-[2%]'
								/>
								<div className='max-w-4xl mx-auto w-full -translate-x-1/2 left-1/2 space-y-5 absolute z-10 pb-20'>
									<AnimatePresence>
										{currentChat?.map((msg, i) => (
											<motion.div
												key={`${msg.created_at}-${i}`}
												initial={{ opacity: 0, y: 15 }}
												animate={{ opacity: 1, y: 0 }}
												className={`flex ${
													msg.role === 'user' ? 'justify-end' : 'justify-start'
												}`}
											>
												<div
													className={`max-w-2xl p-4 rounded-2xl shadow-lg relative group backdrop-blur-md  ${
														msg.role === 'user'
															? 'bg-linear-to-r from-blue-600 to-blue-700 text-white'
															: 'bg-white/10 border border-blue-500/30'
													}`}
												>
													<Button
														size='icon'
														variant='ghost'
														onClick={() => {
															navigator.clipboard.writeText(msg.content)
															toast.success('Nusxalandi', {
																position: 'top-center',
																richColors: true,
															})
														}}
														className='absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 text-blue-300'
													>
														<Copy className='h-4 w-4' />
													</Button>

													{(msg.content.length > 0 ||
														(aiTyping && i === currentChat.length - 1)) &&
													msg.role === 'assistant' ? (
														<>
															{aiTyping &&
															i === currentChat.length - 1 &&
															!typedResponse ? (
																<div className='flex gap-1.5'>
																	<span
																		className='w-2 h-2 bg-blue-400 rounded-full animate-bounce'
																		style={{ animationDelay: '0ms' }}
																	></span>
																	<span
																		className='w-2 h-2 bg-blue-500 rounded-full animate-bounce'
																		style={{ animationDelay: '150ms' }}
																	></span>
																	<span
																		className='w-2 h-2 bg-cyan-400 rounded-full animate-bounce'
																		style={{ animationDelay: '300ms' }}
																	></span>
																</div>
															) : (
																<div className='prose prose-invert max-w-none text-gray-100'>
																	<ReactMarkdown
																		components={{
																			code({
																				//@ts-ignore
																				inline,
																				className,
																				children,
																				...props
																			}) {
																				const match = /language-(\w+)/.exec(
																					className || '',
																				)
																				return !inline && match ? (
																					<SyntaxHighlighter
																						//@ts-ignore
																						style={vscDarkPlus}
																						language={match[1]}
																						PreTag='div'
																						className='rounded-lg mt-2 text-sm'
																						{...props}
																					>
																						{String(children).replace(
																							/\n$/,
																							'',
																						)}
																					</SyntaxHighlighter>
																				) : (
																					<code
																						className='px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-200 text-sm'
																						{...props}
																					>
																						{children}
																					</code>
																				)
																			},
																		}}
																	>
																		{aiTyping && i === currentChat.length - 1
																			? typedResponse
																			: msg.content}
																	</ReactMarkdown>
																</div>
															)}
														</>
													) : (
														<>
															{msg.content.length > 0 && (
																<p className='pr-8 text-base'>{msg.content}</p>
															)}
														</>
													)}

													<p className='text-xs mt-2 text-blue-300 opacity-70'>
														{new Date(msg.created_at).toLocaleTimeString(
															'uz-UZ',
															{ hour: '2-digit', minute: '2-digit' },
														)}
													</p>
												</div>
											</motion.div>
										))}

										{aiTyping &&
											currentChat.length > 0 &&
											currentChat[currentChat.length - 1]?.role !==
												'assistant' && (
												<motion.div
													initial={{ opacity: 0 }}
													animate={{ opacity: 1 }}
													className='flex justify-start'
												>
													<div className='bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-blue-500/30'>
														<div className='flex gap-1.5'>
															<span
																className='w-2 h-2 bg-blue-400 rounded-full animate-bounce'
																style={{ animationDelay: '0ms' }}
															></span>
															<span
																className='w-2 h-2 bg-blue-500 rounded-full animate-bounce'
																style={{ animationDelay: '150ms' }}
															></span>
															<span
																className='w-2 h-2 bg-cyan-400 rounded-full animate-bounce'
																style={{ animationDelay: '300ms' }}
															></span>
														</div>
													</div>
												</motion.div>
											)}
									</AnimatePresence>

									<div ref={messagesEndRef} />
								</div>
							</ScrollArea>

							{showScrollButton && (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 10 }}
									className='absolute bottom-40 left-1/2 -translate-x-1/2 z-20'
								>
									<Button
										onClick={scrollToBottom}
										className='rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg'
										size='icon'
									>
										<ArrowDown className='h-5 w-5' />
									</Button>
								</motion.div>
							)}

							<div className='fixed bottom-0 left-0 right-0 z-50 bg-linear-to-t from-black/60 to-transparent'>
								<form
									onSubmit={sendMessage}
									className='max-w-4xl mx-auto px-4 pb-4'
								>
									<div className='flex items-end gap-3 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-3'>
										<div className='flex items-center flex-auto h-full'>
											<textarea
												ref={textareaRef}
												value={message}
												onChange={e => setMessage(e.target.value)}
												onKeyDown={e => {
													if (e.key === 'Enter' && !e.shiftKey) {
														e.preventDefault()
														sendMessage(e as any)
													}
												}}
												placeholder='Xabaringizni yozing...'
												rows={1}
												className=' flex-1 resize-none bg-transparent text-white placeholder:text-white/40 focus:outline-none text-sm leading-relaxed overflow-y-auto max-h-40 transition-[height] duration-200 ease-out min-h-7'
											/>
										</div>

										<Select
											value={mode}
											onValueChange={value => setMode(value)}
										>
											<SelectTrigger className='h-9 rounded-full px-3 text-xs bg-white/10 border-white/20 hover:bg-white/20 transition text-white'>
												<SelectValue
													placeholder='Mode'
													className='text-white'
												/>
											</SelectTrigger>
											<SelectContent className='bg-[#333] border-white/20'>
												<SelectItem
													className='hover:bg-white/10 focus:bg-white/10 focus:text-white text-white text-xs'
													value='ask'
												>
													💬 Ask
												</SelectItem>
												<SelectItem
													className='hover:bg-white/10 focus:bg-white/10 focus:text-white text-white text-xs'
													value='agent'
												>
													🤖 Agent
												</SelectItem>
											</SelectContent>
										</Select>

										<button
											type='submit'
											disabled={sending || aiTyping || !message.trim()}
											className=' h-9 w-9 flex items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-md hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:hover:scale-100 '
										>
											<ArrowUpIcon className='h-4 w-4' />
										</button>
									</div>
								</form>
								<div className='flex items-center justify-center'>
									<p className='text-center text-muted-foreground text-xs'>
										SecGPT xatoliklar qilishi mumkin. Iltimos muhim
										ma'lumotlarni tekshirib oling.
									</p>
								</div>
							</div>
						</>
					) : (
						<div className='flex items-center flex-col gap-1 justify-center w-full mt-96'>
							<div className='flex-1 flex flex-col items-center justify-center text-center p-8'>
								<motion.div
									initial={{ scale: 0.8, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{ duration: 0.5 }}
								>
									<div className='flex flex-col items-center justify-center'>
										<div className='w-24 h-24 bg-linear-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mb-6 shadow-2xl'>
											<MessageSquare className='h-12 w-12 text-white' />
										</div>
										<h2 className='text-3xl font-bold mb-2 bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent'>
											Xush kelibsiz!
										</h2>
										<p className='text-blue-300 text-lg'>
											Yangi suhbatni boshlang
										</p>
									</div>
								</motion.div>
							</div>
							<div className='fixed bottom-0 left-0 right-0 z-50 bg-linear-to-t from-black/60 to-transparent'>
								<form
									onSubmit={sendMessage}
									className='max-w-4xl mx-auto px-4 pb-4'
								>
									<div className='flex items-end gap-3 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg p-3'>
										<div className='flex items-center flex-auto h-full'>
											<textarea
												ref={textareaRef}
												value={message}
												onChange={e => setMessage(e.target.value)}
												onKeyDown={e => {
													if (e.key === 'Enter' && !e.shiftKey) {
														e.preventDefault()
														sendMessage(e as any)
													}
												}}
												placeholder='Xabaringizni yozing...'
												rows={1}
												className=' flex-1 resize-none bg-transparent text-white placeholder:text-white/40 focus:outline-none text-sm leading-relaxed overflow-y-auto max-h-40 transition-[height] duration-200 ease-out min-h-7'
											/>
										</div>

										<Select
											value={mode}
											onValueChange={value => setMode(value)}
										>
											<SelectTrigger className='h-9 rounded-full px-3 text-xs bg-white/10 border-white/20 hover:bg-white/20 transition text-white'>
												<SelectValue
													placeholder='Mode'
													className='text-white'
												/>
											</SelectTrigger>
											<SelectContent className='bg-[#333] border-white/20'>
												<SelectItem
													className='hover:bg-white/10 focus:bg-white/10 focus:text-white text-white text-xs'
													value='ask'
												>
													💬 Ask
												</SelectItem>
												<SelectItem
													className='hover:bg-white/10 focus:bg-white/10 focus:text-white text-white text-xs'
													value='agent'
												>
													🤖 Agent
												</SelectItem>
											</SelectContent>
										</Select>

										<button
											type='submit'
											disabled={sending || aiTyping || !message.trim()}
											className=' h-9 w-9 flex items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-md hover:scale-105 active:scale-95 transition disabled:opacity-40 disabled:hover:scale-100 '
										>
											<ArrowUpIcon className='h-4 w-4' />
										</button>
									</div>
								</form>
							</div>
							<div className='flex items-center justify-center'>
								<p className='text-center text-muted-foreground text-xs'>
									SecGPT xatoliklar qilishi mumkin. Iltimos muhim ma'lumotlarni
									tekshirib oling.
								</p>
							</div>
						</div>
					)}
				</Card>
			</div>
		</div>
	)
}
