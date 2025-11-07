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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'
import axios from 'axios'
import type { HistoryResponse, Message } from '@/interfaces'
import { useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { APISERVICE } from '@/services'

const genId = () => crypto.randomUUID?.() ?? String(Date.now())

export default function ChatApp() {
	const [searchParams, setSearchParams] = useSearchParams()
	const [chatId, setChatId] = useState<string | null>(null)
	const [chats, setChats] = useState<HistoryResponse | null>(null)
	const [currentChat, setCurrentChat] = useState<{
		session_id: string
		messages: Message[]
	} | null>(null)
	const [message, setMessage] = useState('')
	const [sending, setSending] = useState(false)
	const [aiTyping, setAiTyping] = useState(false)
	const [typedResponse, setTypedResponse] = useState('')
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const [reload, setReload] = useState(false)

	// URL dan chatId
	useEffect(() => {
		const id = searchParams.get('c')
		if (id) {
			setChatId(id)
		} else {
			const newId = genId()
			setChatId(newId)
			setSearchParams({ c: newId })
		}
	}, [searchParams, setSearchParams])

	// Barcha chatlar
	useEffect(() => {
		axios
			.get(APISERVICE.history)
			.then(res => setChats(res.data))
			.catch(() => toast.error('Suhbatlar yuklanmadi'))
	}, [reload])

	// Joriy chat
	useEffect(() => {
		if (!chatId) return
		axios
			.get(`${APISERVICE.history}/${chatId}`)
			.then(res => {
				setCurrentChat(res.data)
				setTypedResponse('')
			})
			.catch(() => toast.error('Suhbat ochilmadi'))
	}, [chatId])

	// Scroll
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}
	useEffect(() => {
		const t = setTimeout(scrollToBottom, 100)
		return () => clearTimeout(t)
	}, [currentChat?.messages, aiTyping])

	// Yangi chat
	const createNewChat = () => {
		const newId = genId()
		setChatId(newId)
		setCurrentChat({ session_id: newId, messages: [] })
		setSearchParams({ c: newId })
		setReload(!reload)
	}

	// O'chirish
	const deleteChat = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation()
		try {
			await axios.delete(APISERVICE.session(id))
			toast.success('Suhbat o‘chirildi')
			setReload(!reload)
			if (chatId === id) createNewChat()
		} catch {
			toast.error('O‘chirishda xato')
		}
	}

	// Xabar yuborish
	const sendMessage = async (e: FormEvent) => {
		e.preventDefault()
		if (!message.trim() || !chatId) return

		const userMsg: Message = {
			id: genId(),
			role: 'user',
			content: message.trim(),
			timestamp: new Date().toISOString(),
		}

		setCurrentChat(prev => ({
			session_id: chatId!,
			messages: [...(prev?.messages || []), userMsg],
		}))
		setMessage('')
		setSending(true)
		setAiTyping(true)

		try {
			const res = await axios.post(APISERVICE.chat, {
				message: message.trim(),
				session_id: chatId,
			})

			const assistantMsg: Message = {
				id: genId(),
				role: 'assistant',
				content: res.data.response || 'Javob yo‘q.',
				timestamp: new Date().toISOString(),
			}

			setCurrentChat(prev => ({
				...prev!,
				messages: [...prev!.messages, assistantMsg],
			}))

			// Typing animatsiyasi
			let text = assistantMsg.content
			setTypedResponse('')
			let i = 0
			const interval = setInterval(() => {
				if (i < text.length) {
					setTypedResponse(prev => prev + text[i])
					i++
				} else {
					clearInterval(interval)
					setAiTyping(false)
				}
			}, 15)
		} catch (err: any) {
			toast.error(err.response?.data?.error || 'Xato yuz berdi')
			setCurrentChat(prev => ({
				...prev!,
				messages: prev!.messages.filter(m => m.id !== userMsg.id),
			}))
		} finally {
			setSending(false)
		}
	}

	return (
		<div className='min-h-screen bg-linear-to-br from-blue-950 via-slate-900 to-blue-950 text-white p-4'>
			<div className='max-w-screen mx-auto h-[calc(100vh-2rem)] flex gap-6'>
				{/* Sidebar */}
				<Card className='w-80 p-4 bg-black/30 backdrop-blur-2xl border border-blue-500/20 shadow-2xl flex flex-col'>
					<div className='flex items-center justify-between mb-6'>
						<h1 className='text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent'>
							Shunqor AI
						</h1>
						<Button
							onClick={createNewChat}
							size='icon'
							className='bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30'
						>
							<Plus className='h-5 w-5' />
						</Button>
					</div>

					<ScrollArea className='flex-1 pr-2'>
						<AnimatePresence>
							{!chats || chats.sessions.length === 0 ? (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className='text-center text-gray-400 mt-10'
								>
									<MessageSquare className='h-12 w-12 mx-auto mb-3 opacity-40' />
									<p className='text-sm text-white'>Hali suhbatlar yo‘q</p>
								</motion.div>
							) : (
								<div className='space-y-2'>
									{chats.sessions.map(chat => (
										<motion.div
											key={chat.session_id}
											initial={{ opacity: 0, x: -20 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: 20 }}
											onClick={() => setSearchParams({ c: chat.session_id })}
											className={`group p-3 rounded-xl cursor-pointer transition-all backdrop-blur-sm border ${
												chatId === chat.session_id
													? 'bg-blue-600/20 border-blue-500/50 shadow-lg'
													: 'bg-white/5 hover:bg-blue-600/10 border-blue-500/20'
											}`}
										>
											<div className='flex items-center justify-between w-11/12'>
												<div className='flex-1 min-w-0'>
													<p className='font-medium text-sm truncate text-white'>
														{chat.last_message.split('\n')[0].slice(0, 35)}...
													</p>
													<p className='text-xs text-blue-300'>
														{chat.message_count} xabar
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

				{/* Chat Area */}
				<Card className='flex-1 bg-black/40 backdrop-blur-3xl border border-blue-500/20 shadow-2xl flex flex-col overflow-hidden'>
					{currentChat ? (
						<>
							{/* Header */}
							<div className='p-5 border-b border-blue-500/20 flex items-center justify-between backdrop-blur-sm'>
								<div>
									<h2 className='text-xl font-bold text-blue-300'>
										{currentChat.messages[0]?.content.slice(0, 40) ||
											'Yangi suhbat'}
									</h2>
									<p className='text-sm text-blue-400'>
										{currentChat.messages.length} xabar
									</p>
								</div>
								<Button
									size='icon'
									variant='ghost'
									onClick={createNewChat}
									className='text-blue-400 hover:text-white'
								>
									<X className='h-5 w-5' />
								</Button>
							</div>

							{/* Messages */}
							<ScrollArea className='flex-1 p-6 overflow-y-auto'>
								<div className='max-w-4xl mx-auto space-y-5'>
									<AnimatePresence>
										{currentChat.messages.map((msg, i) => (
											<motion.div
												key={msg.id}
												initial={{ opacity: 0, y: 15 }}
												animate={{ opacity: 1, y: 0 }}
												className={`flex ${
													msg.role === 'user' ? 'justify-end' : 'justify-start'
												}`}
											>
												<div
													className={`max-w-2xl p-4 rounded-2xl shadow-lg relative group backdrop-blur-md ${
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
															toast.success('Nusxalandi')
														}}
														className='absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 text-blue-300'
													>
														<Copy className='h-4 w-4' />
													</Button>

													{msg.role === 'assistant' ? (
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
																			className || ''
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
																				{String(children).replace(/\n$/, '')}
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
																{i === currentChat.messages.length - 1 &&
																aiTyping
																	? typedResponse
																	: msg.content}
															</ReactMarkdown>
														</div>
													) : (
														<p className='pr-8 text-base'>{msg.content}</p>
													)}

													<p className='text-xs mt-2 text-blue-300 opacity-70'>
														{new Date(msg.timestamp).toLocaleTimeString(
															'uz-UZ',
															{ hour: '2-digit', minute: '2-digit' }
														)}
													</p>
												</div>
											</motion.div>
										))}

										{aiTyping && (
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

							{/* Input */}
							<div className='p-4 bg-linear-to-t from-black/70 to-transparent backdrop-blur-2xl'>
								<form onSubmit={sendMessage} className='max-w-4xl mx-auto'>
									<div className='flex gap-3 items-center'>
										<Input
											value={message}
											onChange={e => setMessage(e.target.value)}
											placeholder='Xabar yozing...'
											className='flex-1 h-14 px-6 rounded-full bg-white/10 backdrop-blur-md border border-blue-500/30 text-white placeholder-blue-300 focus:border-blue-400 focus:ring-0 transition-all'
											disabled={sending}
										/>
										<Button
											type='submit'
											size='icon'
											disabled={sending || !message.trim()}
											className='h-14 w-14 rounded-full bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-xl'
										>
											{sending ? (
												<Loader2 className='h-5 w-5 animate-spin' />
											) : (
												<Send className='h-5 w-5' />
											)}
										</Button>
									</div>
								</form>
							</div>
						</>
					) : (
						<div className='flex-1 flex flex-col items-center justify-center text-center p-8'>
							<motion.div
								initial={{ scale: 0.8, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ duration: 0.5 }}
							>
								<div className='w-24 h-24 bg-linear-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mb-6 shadow-2xl'>
									<MessageSquare className='h-12 w-12 text-white' />
								</div>
								<h2 className='text-3xl font-bold mb-2 bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent'>
									Xush kelibsiz!
								</h2>
								<p className='text-blue-300 text-lg'>Yangi suhbatni boshlang</p>
							</motion.div>
						</div>
					)}
				</Card>
			</div>
		</div>
	)
}
