import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, MouseEvent } from 'react'
import axios from 'axios'
import Cookies from 'js-cookie'
import DOMPurify from 'dompurify'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { SessionTypes } from '@/interfaces'
import { showErrorToast } from '@/lib/utils'
import { APISERVICE } from '@/services'

import { ChatSidebar } from './chat/chat-sidebar'
import { ChatWorkspace } from './chat/chat-workspace'
import { SettingsDrawer } from './chat/settings-drawer'
import { SourceDrawer } from './chat/source-drawer'
import {
	PROFILE_KEY,
	SCHEME_KEY,
	THEMES,
	type Accent,
	type ChatMessage,
	type ColorScheme,
	type Mode,
	type Profile,
	type SourceItem,
	type SourcePanelState,
} from './chat/chat-types'
import {
	loadProfile,
	loadScheme,
	normalizeMessages,
	normalizeSessions,
	normalizeSources,
} from './chat/chat-utils'

const TYPING_INTERVAL_MS = 1

export default function ChatApp() {
	const navigate = useNavigate()
	const [params, setParams] = useSearchParams()
	const token = Cookies.get('session_token')

	const [scheme, setScheme] = useState<ColorScheme>(() =>
		loadScheme(SCHEME_KEY),
	)
	const [profile, setProfile] = useState<Profile>(() =>
		loadProfile(PROFILE_KEY),
	)
	const [mode, setMode] = useState<Mode>(profile.defaultMode)

	const [sessions, setSessions] = useState<SessionTypes[]>([])
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [sessionQuery, setSessionQuery] = useState('')
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [loadingSessions, setLoadingSessions] = useState(false)
	const [loadingMessages, setLoadingMessages] = useState(false)
	const [sending, setSending] = useState(false)
	const [typing, setTyping] = useState(false)
	const [input, setInput] = useState('')
	const [retryPayload, setRetryPayload] = useState<{
		question: string
		mode: Mode
	} | null>(null)
	const [showScroll, setShowScroll] = useState(false)
	const [pinnedTop, setPinnedTop] = useState(false)
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const [settingsOpen, setSettingsOpen] = useState(false)
	const [sourcePanel, setSourcePanel] = useState<SourcePanelState>({
		open: false,
		sources: [],
		activeIndex: 0,
	})

	const listRef = useRef<HTMLDivElement>(null)
	const areaRef = useRef<HTMLTextAreaElement>(null)
	const typingRef = useRef<number | null>(null)
	const lastScrollTopRef = useRef(0)

	const theme = THEMES[profile.accent]
	const isDark = scheme === 'dark'
	const accentBackdrop: Record<Accent, { dark: string; light: string }> = {
		ocean: {
			dark: 'bg-[radial-gradient(circle_at_15%_15%,rgba(69,199,255,0.16),transparent_30%),radial-gradient(circle_at_90%_2%,rgba(255,200,100,0.12),transparent_22%),radial-gradient(circle_at_40%_100%,rgba(34,255,200,0.12),transparent_30%)]',
			light:
				'bg-[radial-gradient(circle_at_10%_10%,rgba(56,189,248,0.14),transparent_26%),radial-gradient(circle_at_85%_0%,rgba(244,114,182,0.10),transparent_22%),radial-gradient(circle_at_30%_100%,rgba(34,197,94,0.10),transparent_28%)]',
		},
		mint: {
			dark: 'bg-[radial-gradient(circle_at_15%_15%,rgba(52,211,153,0.16),transparent_30%),radial-gradient(circle_at_90%_2%,rgba(163,230,53,0.12),transparent_24%),radial-gradient(circle_at_35%_100%,rgba(20,184,166,0.12),transparent_30%)]',
			light:
				'bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.14),transparent_26%),radial-gradient(circle_at_88%_0%,rgba(132,204,22,0.12),transparent_24%),radial-gradient(circle_at_30%_100%,rgba(20,184,166,0.10),transparent_28%)]',
		},
		sunset: {
			dark: 'bg-[radial-gradient(circle_at_15%_15%,rgba(251,146,60,0.16),transparent_30%),radial-gradient(circle_at_90%_2%,rgba(251,113,133,0.12),transparent_24%),radial-gradient(circle_at_40%_100%,rgba(245,158,11,0.12),transparent_30%)]',
			light:
				'bg-[radial-gradient(circle_at_10%_10%,rgba(249,115,22,0.14),transparent_26%),radial-gradient(circle_at_85%_0%,rgba(251,113,133,0.10),transparent_22%),radial-gradient(circle_at_30%_100%,rgba(245,158,11,0.10),transparent_28%)]',
		},
	}

	const filteredSessions = useMemo(() => {
		const query = sessionQuery.trim().toLowerCase()
		if (!query) return sessions
		return sessions.filter(item =>
			(item.chat_name || 'chat').toLowerCase().includes(query),
		)
	}, [sessions, sessionQuery])

	const activeSession = useMemo(
		() => sessions.find(item => item.session_id === sessionId),
		[sessions, sessionId],
	)

	const activeSource = useMemo(() => {
		if (!sourcePanel.sources.length) return null
		return sourcePanel.sources[sourcePanel.activeIndex] || null
	}, [sourcePanel.activeIndex, sourcePanel.sources])

	const clearTyping = useCallback(() => {
		if (typingRef.current !== null) {
			window.clearInterval(typingRef.current)
			typingRef.current = null
		}
	}, [])

	const scrollBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
		const element = listRef.current
		if (!element) return
		element.scrollTo({ top: element.scrollHeight, behavior })
		lastScrollTopRef.current = Math.max(
			0,
			element.scrollHeight - element.clientHeight,
		)
		setShowScroll(false)
		setPinnedTop(false)
	}, [])

	const goLogin = useCallback(() => {
		Cookies.remove('session_token')
		navigate('/login')
	}, [navigate])

	const toggleScheme = useCallback(() => {
		setScheme(prev => (prev === 'dark' ? 'light' : 'dark'))
	}, [])

	const openSourcePanel = useCallback(
		(sources: SourceItem[], category?: string, index = 0) => {
			if (!sources.length) return
			const safe = Math.max(0, Math.min(index, sources.length - 1))
			setSourcePanel({ open: true, sources, category, activeIndex: safe })
			setSidebarOpen(false)
			setSettingsOpen(false)
		},
		[],
	)

	const closeSourcePanel = useCallback(() => {
		setSourcePanel(prev => ({ ...prev, open: false }))
	}, [])

	const loadSessions = useCallback(async () => {
		if (!token) return
		setLoadingSessions(true)
		try {
			const response = await axios.get(APISERVICE.sessions, {
				headers: { Authorization: `Bearer ${token}` },
				timeout: 15000,
			})
			setSessions(normalizeSessions(response.data))
		} catch (error) {
			if (axios.isAxiosError(error) && error.response?.status === 401) {
				goLogin()
				return
			}
			showErrorToast(error)
		} finally {
			setLoadingSessions(false)
		}
	}, [goLogin, token])

	const loadMessages = useCallback(
		async (id: string) => {
			if (!token) return
			setLoadingMessages(true)
			clearTyping()
			setTyping(false)
			try {
				const response = await axios.get(
					`${APISERVICE.sessions}/${id}?limit=100&offset=0`,
					{
						headers: {
							Accept: 'application/json',
							Authorization: `Bearer ${token}`,
						},
						timeout: 15000,
					},
				)
				setMessages(normalizeMessages(response.data))
				setTimeout(() => scrollBottom('auto'), 40)
			} catch (error) {
				if (axios.isAxiosError(error) && error.response?.status === 401) {
					goLogin()
					return
				}
				showErrorToast(error)
			} finally {
				setLoadingMessages(false)
			}
		},
		[clearTyping, goLogin, scrollBottom, token],
	)

	const animateAnswer = useCallback(
		(answer: string, sources: SourceItem[] = [], category?: string) => {
			const text = answer.trim() || 'Javob qaytmadi. Qayta urinib koring.'
			const createdAt = Date.now()

			setMessages(prev => [
				...prev,
				{
					role: 'assistant',
					content: '',
					created_at: createdAt,
					sources,
					category,
				},
			])

			const chars = Array.from(text)
			let cursor = 0
			clearTyping()

			typingRef.current = window.setInterval(() => {
				cursor += 1
				const partial = chars.slice(0, cursor).join('')
				setMessages(prev => {
					if (prev.length === 0) return prev
					const next = [...prev]
					const lastIndex = next.length - 1
					next[lastIndex] = {
						...next[lastIndex],
						role: 'assistant',
						content: partial,
					}
					return next
				})
				if (cursor >= chars.length) {
					clearTyping()
					setTyping(false)
				}
			}, TYPING_INTERVAL_MS)
		},
		[clearTyping],
	)

	const requestAnswer = useCallback(
		async ({
			question,
			selectedMode,
			appendUserMessage,
		}: {
			question: string
			selectedMode: Mode
			appendUserMessage: boolean
		}) => {
			if (!token) {
				goLogin()
				return
			}

			setSending(true)
			setTyping(true)
			if (appendUserMessage) {
				setMessages(prev => [
					...prev,
					{ role: 'user', content: question, created_at: Date.now() },
				])
			}

			try {
				const payload: Record<string, string> = { question, mode: selectedMode }
				if (sessionId) payload.session_id = sessionId

				const response = await axios.post(APISERVICE.chat, payload, {
					headers: { Authorization: `Bearer ${token}` },
					timeout: 60000,
				})

				const nextId =
					typeof response.data?.session_id === 'string'
						? response.data.session_id
						: sessionId
				if (nextId && nextId !== sessionId) setParams({ c: nextId })

				const answerText =
					typeof response.data?.answer === 'string' ? response.data.answer : ''
				const sources = normalizeSources(response.data?.sources)
				const category =
					typeof response.data?.category === 'string'
						? response.data.category
						: undefined
				animateAnswer(answerText, sources, category)
				setRetryPayload(null)
				void loadSessions()
			} catch (error) {
				clearTyping()
				setTyping(false)
				if (axios.isAxiosError(error) && error.response?.status === 401) {
					goLogin()
					return
				}
				if (axios.isAxiosError(error) && (error.response?.status ?? 0) >= 500) {
					setRetryPayload({ question, mode: selectedMode })
				} else {
					setRetryPayload(null)
				}
				showErrorToast(error)
			} finally {
				setSending(false)
			}
		},
		[
			animateAnswer,
			clearTyping,
			goLogin,
			loadSessions,
			sessionId,
			setParams,
			token,
		],
	)

	const send = useCallback(async () => {
		const question = DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [] })
		if (!question || sending || typing) return
		if (!token) {
			goLogin()
			return
		}

		setInput('')
		setRetryPayload(null)
		await requestAnswer({
			question,
			selectedMode: mode,
			appendUserMessage: true,
		})
	}, [goLogin, input, mode, requestAnswer, sending, token, typing])

	const retrySend = useCallback(async () => {
		if (!retryPayload || sending || typing) return
		await requestAnswer({
			question: retryPayload.question,
			selectedMode: retryPayload.mode,
			appendUserMessage: false,
		})
	}, [requestAnswer, retryPayload, sending, typing])

	const createChat = useCallback(async () => {
		if (!token) {
			goLogin()
			return
		}
		try {
			const response = await axios.post(
				APISERVICE.session,
				{},
				{ headers: { Authorization: `Bearer ${token}` }, timeout: 15000 },
			)

			const nextId =
				typeof response.data?.session_id === 'string'
					? response.data.session_id
					: null
			if (!nextId) {
				toast.error('Yangi chat yaratilmadi', {
					position: 'top-center',
					richColors: true,
				})
				return
			}

			clearTyping()
			setTyping(false)
			setMessages([])
			setRetryPayload(null)
			setParams({ c: nextId })
			setMode(profile.defaultMode)
			void loadSessions()
			setSidebarOpen(false)
		} catch (error) {
			if (axios.isAxiosError(error) && error.response?.status === 401) {
				goLogin()
				return
			}
			showErrorToast(error)
		}
	}, [
		clearTyping,
		goLogin,
		loadSessions,
		profile.defaultMode,
		setParams,
		token,
	])

	const deleteChat = useCallback(
		async (id: string, event: MouseEvent<HTMLButtonElement>) => {
			event.stopPropagation()
			if (!token) {
				goLogin()
				return
			}

			try {
				await axios.delete(`${APISERVICE.sessions}/${id}`, {
					headers: { Authorization: `Bearer ${token}` },
					timeout: 15000,
				})

				if (id === sessionId) {
					setMessages([])
					setRetryPayload(null)
					setParams(new URLSearchParams())
					setSourcePanel(prev => ({ ...prev, open: false }))
				}
				void loadSessions()
			} catch (error) {
				if (axios.isAxiosError(error) && error.response?.status === 401) {
					goLogin()
					return
				}
				showErrorToast(error)
			}
		},
		[goLogin, loadSessions, sessionId, setParams, token],
	)

	const onSubmit = useCallback(
		(event: FormEvent<HTMLFormElement>) => {
			event.preventDefault()
			void send()
		},
		[send],
	)

	const onComposerKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTextAreaElement>) => {
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault()
				void send()
			}
		},
		[send],
	)

	const onScroll = useCallback(() => {
		const element = listRef.current
		if (!element) return

		const distance =
			element.scrollHeight - element.scrollTop - element.clientHeight
		const atBottom = distance < 16
		const currentTop = element.scrollTop
		const movedUp = currentTop < lastScrollTopRef.current
		lastScrollTopRef.current = currentTop

		if (atBottom) {
			setShowScroll(false)
			setPinnedTop(false)
			return
		}

		setShowScroll(true)
		if (movedUp) setPinnedTop(true)
	}, [])

	useEffect(() => {
		if (!token) goLogin()
	}, [goLogin, token])

	useEffect(() => {
		setMode(profile.defaultMode)
	}, [profile.defaultMode])

	useEffect(() => {
		window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
	}, [profile])

	useEffect(() => {
		window.localStorage.setItem(SCHEME_KEY, scheme)
	}, [scheme])

	useEffect(() => {
		const id = params.get('c')
		setSessionId(id)
		setRetryPayload(null)
		setSourcePanel(prev => ({ ...prev, open: false }))
		setSidebarOpen(false)
	}, [params])

	useEffect(() => {
		void loadSessions()
	}, [loadSessions])

	useEffect(() => {
		if (!sessionId) {
			setMessages([])
			return
		}
		void loadMessages(sessionId)
	}, [loadMessages, sessionId])

	useEffect(() => {
		if (!profile.autoScroll || pinnedTop) return
		scrollBottom()
	}, [messages, pinnedTop, profile.autoScroll, scrollBottom, typing])

	useEffect(() => {
		const area = areaRef.current
		if (!area) return
		area.style.height = 'auto'
		area.style.height = `${Math.min(area.scrollHeight, 190)}px`
	}, [input])

	useEffect(() => () => clearTyping(), [clearTyping])

	return (
		<div
			className={`relative h-dvh w-screen overflow-hidden ${isDark ? 'bg-[#090f14] text-zinc-100' : 'bg-[#eef2f7] text-zinc-900'}`}
		>
			<div
				className={`pointer-events-none absolute inset-0 ${isDark ? accentBackdrop[profile.accent].dark : accentBackdrop[profile.accent].light}`}
			/>
			<div
				className={`pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(113,113,122,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(113,113,122,0.12)_1px,transparent_1px)] [background-size:40px_40px] ${isDark ? 'opacity-25' : 'opacity-20'}`}
			/>

			<div className='relative flex h-full w-full'>
				<aside
					className={`hidden h-full w-[300px] shrink-0 overflow-hidden border-r lg:flex lg:flex-col ${isDark ? `bg-[#0c1319]/95 ${theme.ring}` : 'bg-white/90 border-zinc-200/80'}`}
				>
					<ChatSidebar
						scheme={scheme}
						theme={theme}
						profile={profile}
						sessionQuery={sessionQuery}
						onSessionQueryChange={setSessionQuery}
						loadingSessions={loadingSessions}
						filteredSessions={filteredSessions}
						sessionId={sessionId}
						onSelectSession={id => setParams({ c: id })}
						onCreateChat={createChat}
						onDeleteChat={deleteChat}
						onOpenSettings={() => setSettingsOpen(true)}
					/>
				</aside>

				<Card
					className={`relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 p-0 ${isDark ? 'bg-[#0d141a]/88' : 'bg-white/88'}`}
				>
					<ChatWorkspace
						scheme={scheme}
						theme={theme}
						accent={profile.accent}
						mode={mode}
						onModeChange={setMode}
						activeTitle={activeSession?.chat_name || 'Yangi suhbat'}
						onOpenSidebar={() => setSidebarOpen(true)}
						onToggleScheme={toggleScheme}
						sending={sending}
						typing={typing}
						listRef={listRef}
						onScroll={onScroll}
						loadingMessages={loadingMessages}
						messages={messages}
						profileName={profile.name}
						onOpenSourcePanel={openSourcePanel}
						showScroll={showScroll}
						onScrollBottom={() => scrollBottom()}
						input={input}
						onInputChange={setInput}
						onSubmit={onSubmit}
						canRetry500={Boolean(retryPayload)}
						onRetry500={() => {
							void retrySend()
						}}
						onComposerKeyDown={onComposerKeyDown}
						textareaRef={areaRef}
					/>
				</Card>
			</div>

			<AnimatePresence>
				{sidebarOpen && (
					<>
						<motion.button
							type='button'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setSidebarOpen(false)}
							className='fixed inset-0 z-40 bg-black/55 lg:hidden'
							aria-label='Close sidebar'
						/>
						<motion.aside
							initial={{ x: -320 }}
							animate={{ x: 0 }}
							exit={{ x: -320 }}
							transition={{ type: 'spring', stiffness: 300, damping: 30 }}
							className={`fixed left-0 top-0 z-50 flex h-full w-[300px] flex-col overflow-hidden border-r backdrop-blur-xl lg:hidden ${isDark ? `bg-[#0c1319]/97 ${theme.ring}` : 'bg-white/97 border-zinc-200/80'}`}
						>
							<div
								className={`flex items-center justify-between border-b px-3 py-3 ${isDark ? 'border-white/10' : 'border-zinc-200/80'}`}
							>
								<p
									className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
								>
									Suhbatlar
								</p>
								<Button
									type='button'
									size='icon-sm'
									variant='ghost'
									onClick={() => setSidebarOpen(false)}
									className={`rounded-lg ${isDark ? 'bg-white/5' : 'bg-zinc-900/5'}`}
								>
									<X className='size-4' />
								</Button>
							</div>
							<ChatSidebar
								scheme={scheme}
								theme={theme}
								profile={profile}
								sessionQuery={sessionQuery}
								onSessionQueryChange={setSessionQuery}
								loadingSessions={loadingSessions}
								filteredSessions={filteredSessions}
								sessionId={sessionId}
								onSelectSession={id => setParams({ c: id })}
								onCreateChat={createChat}
								onDeleteChat={deleteChat}
								onOpenSettings={() => {
									setSettingsOpen(true)
									setSidebarOpen(false)
								}}
							/>
						</motion.aside>
					</>
				)}
			</AnimatePresence>

			<SettingsDrawer
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				scheme={scheme}
				theme={theme}
				profile={profile}
				onProfileChange={setProfile}
				onLogout={goLogin}
			/>

			<SourceDrawer
				open={sourcePanel.open}
				scheme={scheme}
				theme={theme}
				sourcePanel={sourcePanel}
				activeSource={activeSource}
				onClose={closeSourcePanel}
				onSelectIndex={index =>
					setSourcePanel(prev => ({ ...prev, activeIndex: index }))
				}
			/>
		</div>
	)
}
