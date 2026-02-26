import type { FormEvent, KeyboardEvent, RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
	ArrowDown,
	ArrowUp,
	BookOpen,
	Copy,
	Menu,
	Moon,
	RotateCcw,
	Sun,
	MessageCircle,
	BotMessageSquare,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import {
	oneLight,
	vscDarkPlus,
} from 'react-syntax-highlighter/dist/esm/styles/prism'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import type {
	Accent,
	ChatMessage,
	ColorScheme,
	Mode,
	SourceItem,
	ThemeTokens,
} from './chat-types'
import { shortText, timeLabel } from './chat-utils'

interface ChatWorkspaceProps {
	scheme: ColorScheme
	theme: ThemeTokens
	accent: Accent
	mode: Mode
	onModeChange: (value: Mode) => void
	activeTitle: string
	onOpenSidebar: () => void
	onToggleScheme: () => void
	sending: boolean
	typing: boolean
	listRef: RefObject<HTMLDivElement | null>
	onScroll: () => void
	loadingMessages: boolean
	messages: ChatMessage[]
	profileName: string
	onOpenSourcePanel: (
		sources: SourceItem[],
		category?: string,
		index?: number,
	) => void
	showScroll: boolean
	onScrollBottom: () => void
	input: string
	onInputChange: (value: string) => void
	onSubmit: (event: FormEvent<HTMLFormElement>) => void
	canRetry500: boolean
	onRetry500: () => void
	onComposerKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
	textareaRef: RefObject<HTMLTextAreaElement | null>
}

export function ChatWorkspace({
	scheme,
	theme,
	accent,
	mode,
	onModeChange,
	activeTitle,
	onOpenSidebar,
	onToggleScheme,
	sending,
	typing,
	listRef,
	onScroll,
	loadingMessages,
	messages,
	profileName,
	onOpenSourcePanel,
	showScroll,
	onScrollBottom,
	input,
	onInputChange,
	onSubmit,
	canRetry500,
	onRetry500,
	onComposerKeyDown,
	textareaRef,
}: ChatWorkspaceProps) {
	const isDark = scheme === 'dark'
	const accentStyle: Record<
		Accent,
		{
			userBubbleDark: string
			modeActiveDark: string
			modeActiveLight: string
			codeBlockBorderDark: string
			codeHeaderDark: string
			codeInlineDark: string
			sourceIndexDark: string
			dot1: string
			dot2: string
			dot3: string
		}
	> = {
		ocean: {
			userBubbleDark:
				'border-cyan-400/30 bg-gradient-to-br from-cyan-600/35 to-sky-700/35 text-zinc-100 backdrop-blur-xl',
			modeActiveDark: 'bg-cyan-500/25 text-zinc-100',
			modeActiveLight: 'bg-cyan-100 text-cyan-800',
			codeBlockBorderDark: 'border-cyan-500/20',
			codeHeaderDark: 'bg-cyan-500/10 text-cyan-100',
			codeInlineDark: 'bg-cyan-500/15 text-cyan-200',
			sourceIndexDark: 'text-cyan-200',
			dot1: 'bg-cyan-300',
			dot2: 'bg-cyan-400',
			dot3: 'bg-emerald-300',
		},
		mint: {
			userBubbleDark:
				'border-emerald-400/30 bg-gradient-to-br from-emerald-600/35 to-teal-700/35 text-zinc-100 backdrop-blur-xl',
			modeActiveDark: 'bg-emerald-500/25 text-zinc-100',
			modeActiveLight: 'bg-emerald-100 text-emerald-800',
			codeBlockBorderDark: 'border-emerald-500/20',
			codeHeaderDark: 'bg-emerald-500/10 text-emerald-100',
			codeInlineDark: 'bg-emerald-500/15 text-emerald-200',
			sourceIndexDark: 'text-emerald-200',
			dot1: 'bg-emerald-300',
			dot2: 'bg-teal-300',
			dot3: 'bg-lime-300',
		},
		sunset: {
			userBubbleDark:
				'border-orange-400/30 bg-gradient-to-br from-orange-600/35 to-amber-700/35 text-zinc-100 backdrop-blur-xl',
			modeActiveDark: 'bg-orange-500/25 text-zinc-100',
			modeActiveLight: 'bg-orange-100 text-orange-800',
			codeBlockBorderDark: 'border-orange-500/20',
			codeHeaderDark: 'bg-orange-500/10 text-orange-100',
			codeInlineDark: 'bg-orange-500/15 text-orange-200',
			sourceIndexDark: 'text-orange-200',
			dot1: 'bg-orange-300',
			dot2: 'bg-amber-300',
			dot3: 'bg-rose-300',
		},
	}
	const palette = accentStyle[accent]
	const codeTheme = (isDark ? vscDarkPlus : oneLight) as any
	const copyText = (value: string, label = 'Nusxa olindi') => {
		void navigator.clipboard.writeText(value)
		toast.success(label, {
			position: 'top-center',
			richColors: true,
		})
	}

	return (
		<>
			<div
				className={`flex items-center justify-between border-b px-4 py-3 md:px-6 ${isDark ? 'border-white/10' : 'border-zinc-200/80'}`}
			>
				<div className='flex min-w-0 items-center gap-2'>
					<Button
						type='button'
						size='icon-sm'
						variant='ghost'
						onClick={onOpenSidebar}
						className={`rounded-lg lg:hidden ${isDark ? 'bg-white/5' : 'bg-zinc-900/5'}`}
					>
						<Menu className='size-4' />
					</Button>
					<div className='min-w-0'>
						<p
							className={`truncate text-xs uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}
						>
							{mode === 'agent' ? 'Agent workspace' : 'Chat workspace'}
						</p>
						<p
							className={`truncate text-sm font-medium md:text-base ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
						>
							{activeTitle}
						</p>
					</div>
				</div>

				<div className='flex items-center gap-2'>
					<Button
						type='button'
						size='icon-sm'
						variant='ghost'
						onClick={onToggleScheme}
						className={`rounded-lg ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-zinc-900/5 hover:bg-zinc-900/10'}`}
						title={isDark ? 'Light mode' : 'Dark mode'}
					>
						{isDark ? <Sun className='size-4' /> : <Moon className='size-4' />}
					</Button>
				</div>
			</div>

			<div className='relative min-h-0 flex-1'>
				<div
					ref={listRef}
					onScroll={onScroll}
					className='h-full overflow-y-auto px-4 py-5 md:px-6 md:py-6'
				>
					<div className='mx-auto flex w-full max-w-4xl flex-col gap-4 pb-8'>
						{loadingMessages ? (
							<div className='space-y-3'>
								{Array.from({ length: 6 }).map((_, index) => (
									<div
										key={index}
										className={`h-20 animate-pulse rounded-2xl border ${isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-zinc-100/70'}`}
									/>
								))}
							</div>
						) : messages.length === 0 ? (
							<div className='h-1' />
						) : (
							<AnimatePresence initial={false}>
								{messages.map((message, index) => {
									const isTypingMessage =
										typing &&
										message.role === 'assistant' &&
										index === messages.length - 1
									const isUser = message.role === 'user'

									return (
										<motion.div
											key={`${message.created_at}-${index}`}
											initial={{ opacity: 0, y: 12 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -10 }}
											className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
										>
											<div
												className={`group relative rounded-2xl border px-4 py-3 ${
													isUser
														? 'w-fit max-w-[88%] md:max-w-[76%]'
														: 'w-full max-w-3xl'
												} ${
													isUser
														? isDark
															? palette.userBubbleDark
															: 'border-zinc-200 bg-zinc-100 text-zinc-900 shadow-sm'
														: isDark
															? 'border-white/10 bg-white/[0.04] text-zinc-100 backdrop-blur-xl'
															: 'border-zinc-200 bg-white text-zinc-900 shadow-sm'
												}`}
											>
												<Button
													type='button'
													size='icon-sm'
													variant='ghost'
													onClick={() => copyText(message.content)}
													className='absolute right-2 top-2 opacity-0 transition group-hover:opacity-100'
												>
													<Copy className='size-4' />
												</Button>

												{message.role === 'assistant' ? (
													<div className='space-y-3 pr-8'>
														<div
															className={` text-sm leading-7 ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}
														>
															<ReactMarkdown
																components={{
																	p({ children }) {
																		return (
																			<p
																				className={`mb-3 last:mb-0 ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}
																			>
																				{children}
																			</p>
																		)
																	},
																	strong({ children }) {
																		return (
																			<strong
																				className={`${isDark ? 'text-zinc-50' : 'text-zinc-950'} font-semibold`}
																			>
																				{children}
																			</strong>
																		)
																	},
																	ul({ children }) {
																		return (
																			<ul className='mb-3 ml-5 list-disc space-y-1'>
																				{children}
																			</ul>
																		)
																	},
																	ol({ children }) {
																		return (
																			<ol className='mb-3 ml-5 list-decimal space-y-1'>
																				{children}
																			</ol>
																		)
																	},
																	li({ children }) {
																		return (
																			<li
																				className={
																					isDark
																						? 'text-zinc-100'
																						: 'text-zinc-800'
																				}
																			>
																				{children}
																			</li>
																		)
																	},
																	code({ className, children, ...props }) {
																		const content = String(children).replace(
																			/\n$/,
																			'',
																		)
																		const language = /language-(\w+)/
																			.exec(className || '')?.[1]
																			?.toLowerCase()
																		const isBlock =
																			Boolean(language) ||
																			content.includes('\n')

																		if (isBlock) {
																			return (
																				<div
																					className={`mt-2 overflow-hidden rounded-lg border ${
																						isDark
																							? `${palette.codeBlockBorderDark} bg-[#020817]`
																							: `${theme.ring} bg-gray-200`
																					}`}
																				>
																					<div
																						className={`flex items-center justify-between border-b px-2.5 text-[10px] ${
																							isDark
																								? `border-white/10 ${palette.codeHeaderDark}`
																								: 'border-white/10 bg-slate-300 text-slate-900'
																						}`}
																					>
																						<span className='font-medium tracking-wider'>
																							{(
																								language || 'code'
																							).toUpperCase()}
																						</span>
																						<button
																							type='button'
																							onClick={() =>
																								copyText(
																									content,
																									'Kod nusxalandi',
																								)
																							}
																							className='inline-flex items-center gap-1 rounded-md px-1.5 transition hover:bg-white/10'
																						>
																							<Copy className='size-3' />
																							<span className='hidden sm:inline'>
																								Copy
																							</span>
																						</button>
																					</div>
																					<SyntaxHighlighter
																						language={language || 'text'}
																						style={codeTheme}
																						PreTag='div'
																						customStyle={{
																							margin: 0,
																							padding: '0.5rem 0.625rem',
																							background: 'transparent',
																							fontSize: '12px',
																							lineHeight: '1.45',
																						}}
																						codeTagProps={{
																							style: {
																								fontFamily:
																									'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace',
																							},
																						}}
																					>
																						{content}
																					</SyntaxHighlighter>
																				</div>
																			)
																		}

																		return (
																			<code
																				className={`rounded px-1.5 py-0.5 font-mono text-[12px] ${
																					isDark
																						? palette.codeInlineDark
																						: `${theme.soft} text-slate-800`
																				}`}
																				{...props}
																			>
																				{children}
																			</code>
																		)
																	},
																}}
															>
																{message.content}
															</ReactMarkdown>
														</div>

														{!isTypingMessage &&
															Array.isArray(message.sources) &&
															message.sources.length > 0 && (
																<div
																	className={`rounded-xl border p-2.5 ${theme.ring} ${theme.soft}`}
																>
																	<div className='mb-2 flex items-center justify-between'>
																		<button
																			type='button'
																			onClick={() =>
																				onOpenSourcePanel(
																					message.sources ?? [],
																					message.category,
																				)
																			}
																			className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${isDark ? 'bg-white/10 text-zinc-100 hover:bg-white/15' : 'bg-zinc-900/5 text-zinc-800 hover:bg-zinc-900/10'}`}
																		>
																			<BookOpen className='size-3.5' />
																			Manbalar ({message.sources.length})
																		</button>
																		{message.category && (
																			<span
																				className={`text-[10px] uppercase tracking-wide ${isDark ? 'text-zinc-300' : 'text-zinc-500'}`}
																			>
																				{message.category}
																			</span>
																		)}
																	</div>
																	<div className='flex flex-wrap gap-1.5'>
																		{message.sources
																			.slice(0, 4)
																			.map((source, sourceIndex) => (
																				<button
																					key={`${source.url}-${sourceIndex}`}
																					type='button'
																					onClick={() =>
																						onOpenSourcePanel(
																							message.sources ?? [],
																							message.category,
																							sourceIndex,
																						)
																					}
																					className={`rounded-md border px-2 py-1 text-[11px] ${isDark ? 'border-white/10 bg-black/25 text-zinc-200 hover:border-white/20 hover:bg-black/35' : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'}`}
																				>
																					<span
																						className={`mr-1 ${isDark ? palette.sourceIndexDark : 'text-zinc-700'}`}
																					>
																						[{sourceIndex + 1}]
																					</span>
																					{shortText(source.title, 40)}
																				</button>
																			))}
																	</div>
																</div>
															)}
													</div>
												) : (
													<p className='pr-8 text-sm leading-relaxed whitespace-pre-wrap break-words text-inherit'>
														{message.content}
													</p>
												)}

												<div
													className={`mt-2 flex items-center justify-between text-xs ${
														isUser
															? isDark
																? 'text-zinc-200/80'
																: 'text-zinc-600'
															: isDark
																? 'text-zinc-400'
																: 'text-zinc-500'
													}`}
												>
													<span>
														{message.role === 'user'
															? profileName || 'Guest'
															: 'SecGPT'}
													</span>
													<span>{timeLabel(message.created_at)}</span>
												</div>
											</div>
										</motion.div>
									)
								})}
							</AnimatePresence>
						)}

						{typing && (
							<div className='flex justify-start'>
								<div
									className={`rounded-2xl border px-4 py-3 ${isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-white'}`}
								>
									<div className='flex items-center gap-1.5'>
										<span
											className={`size-2 animate-bounce rounded-full ${palette.dot1} [animation-delay:0ms]`}
										/>
										<span
											className={`size-2 animate-bounce rounded-full ${palette.dot2} [animation-delay:150ms]`}
										/>
										<span
											className={`size-2 animate-bounce rounded-full ${palette.dot3} [animation-delay:300ms]`}
										/>
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{showScroll && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 8 }}
						className='absolute bottom-28 right-5 md:right-6'
					>
						<Button
							type='button'
							size='icon'
							onClick={onScrollBottom}
							className={`rounded-full ${isDark ? 'text-zinc-100' : 'text-zinc-950'} ${theme.btn}`}
						>
							<ArrowDown className='size-4' />
						</Button>
					</motion.div>
				)}
			</div>

			<form
				onSubmit={onSubmit}
				className={`border-t p-3 md:p-4 ${isDark ? 'border-white/10 bg-black/20' : 'border-zinc-200/80 bg-zinc-50/70'}`}
			>
				<div
					className={`mx-auto max-w-4xl rounded-2xl border p-3 ${isDark ? 'border-white/10 bg-zinc-900/80' : 'border-zinc-200 bg-white'}`}
				>
					<div className='flex items-end gap-3'>
						<textarea
							ref={textareaRef}
							value={input}
							onChange={event => onInputChange(event.target.value)}
							onKeyDown={onComposerKeyDown}
							placeholder='Savol yoki topshiriqni yozing...'
							rows={1}
							className={`max-h-48 min-h-9 flex-1 resize-none bg-transparent text-sm focus:outline-none ${isDark ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'}`}
						/>
						{canRetry500 && (
							<Button
								type='button'
								size='icon'
								variant='ghost'
								onClick={onRetry500}
								disabled={sending || typing}
								title='Server xatodan keyin qayta yuborish'
								className={`rounded-xl ${isDark ? 'border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10' : 'border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'}`}
							>
								<RotateCcw className='size-4' />
							</Button>
						)}
						<Button
							type='submit'
							size='icon'
							disabled={sending || typing || input.trim().length === 0}
							className={`rounded-xl ${isDark ? 'text-zinc-100' : 'text-zinc-950'} ${theme.btn}`}
						>
							<ArrowUp className='size-4' />
						</Button>
					</div>
					<div className='mt-2 flex items-center'>
						<div
							className={`inline-flex rounded-lg border p-0.5 text-xs ${isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-zinc-100'}`}
						>
							<button
								type='button'
								onClick={() => onModeChange('ask')}
								className={`rounded-md px-3 py-1.5 transition flex items-center gap-1 ${
									mode === 'ask'
										? isDark
											? palette.modeActiveDark
											: `${palette.modeActiveLight} shadow-sm`
										: isDark
											? 'text-zinc-400 hover:text-zinc-200'
											: 'text-zinc-600 hover:text-zinc-900'
								}`}
							>
								<MessageCircle size={16} />
								Ask mode
							</button>
							<button
								type='button'
								onClick={() => onModeChange('agent')}
								className={`rounded-md px-3 py-1.5 transition flex items-center gap-1 ${
									mode === 'agent'
										? isDark
											? palette.modeActiveDark
											: `${palette.modeActiveLight} shadow-sm`
										: isDark
											? 'text-zinc-400 hover:text-zinc-200'
											: 'text-zinc-600 hover:text-zinc-900'
								}`}
							>
								<BotMessageSquare size={16} />
								Agent mode
							</button>
						</div>
					</div>
				</div>
			</form>
		</>
	)
}
