import type { MouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageSquare, Plus, Search, Settings, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SessionTypes } from '@/interfaces'

import type { ColorScheme, Profile, ThemeTokens } from './chat-types'

interface ChatSidebarProps {
	scheme: ColorScheme
	theme: ThemeTokens
	profile: Profile
	sessionQuery: string
	onSessionQueryChange: (value: string) => void
	loadingSessions: boolean
	filteredSessions: SessionTypes[]
	sessionId: string | null
	onSelectSession: (sessionId: string) => void
	onCreateChat: () => void
	onDeleteChat: (
		sessionId: string,
		event: MouseEvent<HTMLButtonElement>,
	) => void
	onOpenSettings: () => void
}

export function ChatSidebar({
	scheme,
	theme,
	profile,
	sessionQuery,
	onSessionQueryChange,
	loadingSessions,
	filteredSessions,
	sessionId,
	onSelectSession,
	onCreateChat,
	onDeleteChat,
	onOpenSettings,
}: ChatSidebarProps) {
	const isDark = scheme === 'dark'

	return (
		<>
			<div
				className={`flex items-center justify-between border-b px-3 py-3 ${isDark ? 'border-white/10' : 'border-zinc-200/80'}`}
			>
				<div className='flex items-center gap-2'>
					<div
						className={`flex size-9 items-center justify-center rounded-xl ${isDark ? 'bg-white/10' : 'bg-zinc-900/5'}`}
					>
						<img
							src='/images/logo-white.png'
							alt='SecGPT'
							className='h-5 w-5'
						/>
					</div>
					<div>
						<p
							className={`text-xl font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
						>
							SecGPT
						</p>
					</div>
				</div>
				<Button
					type='button'
					size='icon-sm'
					onClick={onCreateChat}
					className={`rounded-lg ${isDark ? 'text-zinc-100' : 'text-zinc-950'} ${theme.btn}`}
				>
					<Plus className='size-4' />
				</Button>
			</div>

			<div className='px-3 pt-3'>
				<div className='relative'>
					<Search
						className={`pointer-events-none absolute left-3 top-2.5 size-4 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
					/>
					<Input
						value={sessionQuery}
						onChange={event => onSessionQueryChange(event.target.value)}
						placeholder='Suhbat qidirish'
						className={`h-9 rounded-xl pl-9 ${
							isDark
								? 'border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500'
								: 'border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400'
						}`}
					/>
				</div>
			</div>

			<div className='min-h-0 flex-1 overflow-y-auto px-3 py-3'>
				<AnimatePresence mode='popLayout'>
					{loadingSessions ? (
						<div className='space-y-2'>
							{Array.from({ length: 6 }).map((_, index) => (
								<div
									key={index}
									className={`h-14 animate-pulse rounded-xl ${isDark ? 'bg-white/5' : 'bg-zinc-200/70'}`}
								/>
							))}
						</div>
					) : filteredSessions.length === 0 ? (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className={`mt-8 px-2 text-center text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}
						>
							<MessageSquare className='mx-auto mb-2 size-8 opacity-50' />
							Suhbatlar topilmadi
						</motion.div>
					) : (
						<div className='space-y-2'>
							{filteredSessions.map(item => {
								const active = item.session_id === sessionId
								return (
									<motion.button
										key={item.session_id}
										layout
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -8 }}
										onClick={() => onSelectSession(item.session_id)}
										className={`group w-full rounded-xl border px-3 py-2 text-left transition ${
											active
												? `${theme.ring} ${theme.soft} ${isDark ? '' : 'text-zinc-900'}`
												: isDark
													? 'border-white/10 bg-white/5 hover:bg-white/10'
													: 'border-zinc-200 bg-white hover:bg-zinc-50'
										}`}
									>
										<div className='flex items-center justify-between gap-2'>
											<div className='min-w-0'>
												<p
													className={`truncate text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
												>
													{item.chat_name?.split('\n')[0] || 'Yangi chat'}
												</p>
												<p
													className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
												>
													{item.chat_count} messages
												</p>
											</div>
											<Button
												type='button'
												size='icon-sm'
												variant='ghost'
												onClick={event => onDeleteChat(item.session_id, event)}
												className='opacity-0 text-rose-300 transition group-hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-200'
											>
												<Trash2 className='size-4' />
											</Button>
										</div>
									</motion.button>
								)
							})}
						</div>
					)}
				</AnimatePresence>
			</div>

			<div
				className={`border-t p-3 ${isDark ? 'border-white/10' : 'border-zinc-200/80'}`}
			>
				<button
					type='button'
					onClick={onOpenSettings}
					className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${
						isDark
							? 'border-white/10 bg-white/5 hover:bg-white/10'
							: 'border-zinc-200 bg-white hover:bg-zinc-50'
					}`}
				>
					<div
						className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${theme.badge} text-xs font-bold text-slate-900`}
					>
						{(profile.name || 'G').slice(0, 2).toUpperCase()}
					</div>
					<div className='min-w-0'>
						<p
							className={`truncate text-sm ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
						>
							{profile.name || 'Guest'}
						</p>
						<p
							className={`truncate text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
						>
							{profile.role || 'Security Analyst'}
						</p>
					</div>
					<Settings
						className={`ml-auto size-4 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
					/>
				</button>
			</div>
		</>
	)
}
