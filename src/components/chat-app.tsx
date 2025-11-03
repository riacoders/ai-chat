import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import {
	MessageSquare,
	Plus,
	Send,
	Trash2,
	Loader2,
	Copy,
	X,
	Edit2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card } from '@/components/ui/card'

interface Message {
	id: string
	content: string
	role: 'user' | 'assistant'
	timestamp: string
}

interface Chat {
	id: string
	title: string
	messages: Message[]
}

const ChatApp = () => {
	const [chats, setChats] = useState<Chat[]>([])
	const [currentChat, setCurrentChat] = useState<Chat | null>(null)
	const [message, setMessage] = useState('')
	const [sending, setSending] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const savedChats = localStorage.getItem('chats')
		if (savedChats) {
			const parsedChats: Chat[] = JSON.parse(savedChats)
			setChats(parsedChats)
			setCurrentChat(parsedChats[0] || null)
		}
	}, [])

	useEffect(() => {
		scrollToBottom()
	}, [currentChat?.messages])

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	const saveChatsToStorage = (updatedChats: Chat[]) => {
		localStorage.setItem('chats', JSON.stringify(updatedChats))
	}

	const createNewChat = () => {
		const newChat: Chat = {
			id: crypto.randomUUID(),
			title: `Suhbat ${chats.length + 1}`,
			messages: [],
		}

		const updatedChats = [newChat, ...chats]
		setChats(updatedChats)
		setCurrentChat(newChat)
		saveChatsToStorage(updatedChats)
		toast.success('Yangi suhbat yaratildi', {
			position: 'top-center',
			richColors: true,
		})
	}

	const deleteChat = (chatId: string, e: React.MouseEvent) => {
		e.stopPropagation()

		const updatedChats = chats.filter(chat => chat.id !== chatId)
		setChats(updatedChats)
		saveChatsToStorage(updatedChats)

		if (currentChat?.id === chatId) {
			setCurrentChat(updatedChats[0] || null)
		}

		toast.success("Suhbat o'chirildi", {
			position: 'top-center',
			richColors: true,
		})
	}

	const copyChat = async (chat: Chat, e: React.MouseEvent) => {
		e.stopPropagation()
		if (!chat.messages || chat.messages.length === 0) {
			toast.warning("Suhbat bo'sh", {
				position: 'top-center',
				richColors: true,
			})
			return
		}

		const text = chat.messages
			.map(
				m =>
					`${m.role === 'user' ? 'Siz' : 'AI'} [${new Date(
						m.timestamp
					).toLocaleString()}]: ${m.content}`
			)
			.join('\n\n')

		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text)
			} else {
				// fallback for older browsers
				const ta = document.createElement('textarea')
				ta.value = text
				ta.setAttribute('readonly', '')
				ta.style.position = 'absolute'
				ta.style.left = '-9999px'
				document.body.appendChild(ta)
				ta.select()
				document.execCommand('copy')
				document.body.removeChild(ta)
			}
			toast.info('Suhbat nusxalandi', {
				position: 'top-center',
				richColors: true,
			})
		} catch (err) {
			console.error(err)
			toast.error('Nusxalashda xatolik', {
				position: 'top-center',
				richColors: true,
			})
		}
	}

	const renameChat = (chat: Chat, e: React.MouseEvent) => {
		e.stopPropagation()
		const newTitle = window.prompt('Yangi chat nomi kiriting', chat.title)
		if (newTitle === null) return // cancelled
		const trimmed = newTitle.trim()
		if (!trimmed) {
			toast.warning("Bo'sh nom qabul qilinmaydi", { position: 'top-center' })
			return
		}

		const updatedChats = chats.map(c =>
			c.id === chat.id ? { ...c, title: trimmed } : c
		)
		setChats(updatedChats)
		saveChatsToStorage(updatedChats)
		if (currentChat?.id === chat.id) {
			setCurrentChat({ ...currentChat, title: trimmed })
		}
		toast.success('Chat nomi yangilandi', { position: 'top-center' })
	}

	const sendMessage = async (e: FormEvent) => {
		e.preventDefault()
		if (!message.trim()) return

		setSending(true)

		const userMessage: Message = {
			id: crypto.randomUUID(),
			content: message,
			role: 'user',
			timestamp: new Date().toISOString(),
		}

		// Ensure we have an active chat. If not, create one and persist it.
		let activeChat = currentChat
		if (!activeChat) {
			const newChat: Chat = {
				id: crypto.randomUUID(),
				title: `Suhbat ${chats.length + 1}`,
				messages: [],
			}

			// Use functional update to avoid stale state and persist immediately
			setChats(prev => {
				const next = [newChat, ...prev]
				saveChatsToStorage(next)
				return next
			})
			setCurrentChat(newChat)
			activeChat = newChat
		}

		// Append the user message to the active chat and persist
		const updatedChat: Chat = {
			...activeChat!,
			messages: [...activeChat!.messages, userMessage],
		}

		setCurrentChat(updatedChat)
		setMessage('')

		setChats(prev => {
			const exists = prev.some(c => c.id === updatedChat.id)
			const next = exists
				? prev.map(c => (c.id === updatedChat.id ? updatedChat : c))
				: [updatedChat, ...prev]
			saveChatsToStorage(next)
			return next
		})

		// Simulate AI response
		setTimeout(() => {
			const aiMessage: Message = {
				id: crypto.randomUUID(),
				content: 'Test javob: ' + message,
				role: 'assistant',
				timestamp: new Date().toISOString(),
			}

			const finalChat: Chat = {
				...updatedChat,
				messages: [...updatedChat.messages, aiMessage],
			}

			setChats(prev => {
				const next = prev.map(c => (c.id === finalChat.id ? finalChat : c))
				saveChatsToStorage(next)
				return next
			})

			setCurrentChat(finalChat)
			setSending(false)
		}, 1000)
	}

	return (
		<div className='min-h-screen w-screen bg-linear-to-br from-gray-900 via-slate-800 to-gray-900 p-4'>
			<div className=' w-full mx-auto h-[calc(100vh-2rem)] flex gap-4'>
				<Card className='w-80 p-4 flex flex-col backdrop-blur-md bg-white/10 border border-white/20 shadow-xl text-white'>
					<div className='flex items-center justify-between mb-6'>
						<h1 className='text-2xl! font-bold text-white'>Cyber AI Chat</h1>
						<Button
							onClick={createNewChat}
							size='icon'
							className='backdrop-blur-sm bg-white/10 text-white cursor-pointer border border-white/20 hover:bg-white/20 transition-all'
						>
							<Plus className='h-5 w-5' />
						</Button>
					</div>

					<ScrollArea className='flex-1 overflow-y-auto px-3'>
						{chats.length === 0 ? (
							<div className='text-center text-gray-400 mt-8'>
								<MessageSquare className='h-12 w-12 mx-auto mb-2 opacity-30' />
								<p className='text-sm'>Hali suhbatlar yo'q</p>
							</div>
						) : (
							<div className='space-y-2'>
								{chats.map(chat => (
									<div
										key={chat.id}
										onClick={() => setCurrentChat(chat)}
										className={`group p-3 rounded-lg cursor-pointer flex items-center justify-between backdrop-blur-sm transition-all ${
											currentChat?.id === chat.id
												? 'bg-white/20 text-white shadow-lg border border-white/30'
												: 'bg-white/10 hover:bg-white/15 border border-white/20'
										}`}
									>
										<div>
											<p className='font-medium truncate text-sm'>
												{chat.title}
											</p>
											<p className='text-xs'>{chat.messages.length} xabar</p>
										</div>
										<div className='flex items-center gap-2'>
											<Button
												size='icon'
												variant='ghost'
												onClick={e => copyChat(chat, e)}
												className='h-8 w-8 opacity-0 group-hover:opacity-100 text-white hover:text-black/90 transition-all'
											>
												<Copy className='h-4 w-4' />
											</Button>
											<Button
												size='icon'
												variant='ghost'
												onClick={e => renameChat(chat, e)}
												className='h-8 w-8 opacity-0 group-hover:opacity-100 text-white hover:text-black/90 transition-all'
											>
												<Edit2 className='h-4 w-4' />
											</Button>
											<Button
												size='icon'
												variant='ghost'
												onClick={e => deleteChat(chat.id, e)}
												className='h-8 w-8 opacity-0 group-hover:opacity-100 text-white hover:text-black/90 transition-all'
											>
												<Trash2 className='h-4 w-4' />
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</ScrollArea>
				</Card>

				<Card className='relative flex-1 flex flex-col bg-gray-800/50 border-gray-700 shadow-xl text-white overflow-hidden'>
					{currentChat ? (
						<>
							<div className='p-6 border-b border-gray-700 flex items-center justify-between'>
								<div>
									<h2 className='text-xl font-bold text-white'>
										{currentChat.title}
									</h2>
									<p className='text-sm text-gray-400'>
										{currentChat.messages.length} xabar
									</p>
								</div>
								<Button
									size='icon'
									variant='ghost'
									onClick={() => setCurrentChat(null)}
									className='h-8 w-8 text-gray-400 hover:text-white transition-colors'
								>
									<X className='h-5 w-5' />
								</Button>
							</div>

							<ScrollArea className='flex-1 p-6 pb-28 overflow-y-auto'>
								<div className='space-y-4 max-w-4xl mx-auto'>
									{currentChat.messages.map(msg => (
										<div
											key={msg.id}
											className={`flex ${
												msg.role === 'user' ? 'justify-end' : 'justify-start'
											}`}
										>
											<div
												className={`max-w-[75%] p-4 rounded-2xl shadow-md group relative flex flex-col ${
													msg.role === 'user'
														? 'bg-blue-600 text-white'
														: 'bg-gray-700 text-gray-100 border border-gray-600'
												}`}
											>
												<Button
													size='icon'
													variant='ghost'
													onClick={e => {
														e.stopPropagation()
														navigator.clipboard.writeText(msg.content)
														toast.info('Xabar nusxalandi', {
															position: 'top-center',
															richColors: true,
														})
													}}
													className='absolute top-2 right-10 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity'
												>
													<Copy className='h-3 w-3' />
												</Button>

												<Button
													size='icon'
													variant='ghost'
													onClick={e => {
														e.stopPropagation()
														const updatedMessages = currentChat.messages.filter(
															m => m.id !== msg.id
														)
														const updatedChat = {
															...currentChat,
															messages: updatedMessages,
														}
														setCurrentChat(updatedChat)
														setChats(prev =>
															prev.map(c =>
																c.id === currentChat.id ? updatedChat : c
															)
														)
														saveChatsToStorage(
															chats.map(c =>
																c.id === currentChat.id ? updatedChat : c
															)
														)
														toast.success("Xabar o'chirildi", {
															position: 'top-center',
															richColors: true,
														})
													}}
													className='absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity'
												>
													<Trash2 className='h-3 w-3' />
												</Button>

												<p className='pr-8'>{msg.content}</p>
												<p className='text-xs mt-2 text-gray-400'>
													{new Date(msg.timestamp).toLocaleTimeString()}
												</p>
											</div>
										</div>
									))}

									<div ref={messagesEndRef} />
								</div>
							</ScrollArea>
						</>
					) : (
						<div className='flex-1 flex flex-col items-center justify-center text-gray-400'>
							<MessageSquare className='h-20 w-20 mb-4 opacity-20' />
							<p className='text-xl mb-2'>Xush kelibsiz!</p>
							<p className='text-sm mb-8'>
								Yangi suhbatni boshlash uchun xabar yozing
							</p>
						</div>
					)}

					<div className='absolute left-0 right-0 bottom-0 p-4 bg-linear-to-t from-blue-500/10 via-transparent to-transparent backdrop-blur-sm z-20'>
						<form
							onSubmit={sendMessage}
							className='max-w-4xl mx-auto flex gap-3 items-center relative'
						>
							<Input
								value={message}
								onChange={e => setMessage(e.target.value)}
								placeholder='Xabar yozing...'
								className='flex-1 h-12 px-6 rounded-full bg-white/10 text-white placeholder-white/60 border border-white/10'
							/>
							<Button
								type='submit'
								disabled={sending || !message.trim()}
								className='h-12 px-6 bg-transparent! text-white border border-none! absolute right-0'
							>
								{sending ? <Loader2 className='animate-spin' /> : <Send />}
							</Button>
						</form>
					</div>
				</Card>
			</div>
		</div>
	)
}

export default ChatApp
