import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { ColorScheme, SourceItem, SourcePanelState, ThemeTokens } from './chat-types'
import { shortText, sourceHost } from './chat-utils'

interface SourceDrawerProps {
	open: boolean
	scheme: ColorScheme
	theme: ThemeTokens
	sourcePanel: SourcePanelState
	activeSource: SourceItem | null
	onClose: () => void
	onSelectIndex: (index: number) => void
}

export function SourceDrawer({
	open,
	scheme,
	theme,
	sourcePanel,
	activeSource,
	onClose,
	onSelectIndex,
}: SourceDrawerProps) {
	const isDark = scheme === 'dark'

	return (
		<AnimatePresence>
			{open && (
				<>
					<motion.button
						type='button'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={onClose}
						className='fixed inset-0 z-[70] bg-black/50 backdrop-blur-[1px]'
						aria-label='Close source panel'
					/>
					<motion.aside
						initial={{ x: 420, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: 420, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 320, damping: 28 }}
						className={`fixed right-0 top-0 z-[80] flex h-full w-full max-w-xl flex-col border-l shadow-2xl backdrop-blur-xl ${
							isDark
								? `bg-[#0e151c]/95 border-white/10`
								: `bg-white/95 border-zinc-200/80`
						}`}
					>
						<div className={`flex items-center justify-between border-b px-4 py-3 ${isDark ? 'border-white/10' : 'border-zinc-200/80'}`}>
							<div>
								<p className={`text-xs uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
									Sources
								</p>
								<p className={`text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
									{sourcePanel.sources.length} ta manba
									{sourcePanel.category ? ` • ${sourcePanel.category}` : ''}
								</p>
							</div>
							<Button
								type='button'
								size='icon-sm'
								variant='ghost'
								onClick={onClose}
								className={`rounded-lg ${isDark ? 'bg-white/5' : 'bg-zinc-900/5'}`}
							>
								<X className='size-4' />
							</Button>
						</div>

						<div className='grid min-h-0 flex-1 gap-3 p-4 md:grid-cols-[220px_minmax(0,1fr)]'>
							<div className='min-h-0 space-y-2 overflow-y-auto pr-1'>
								{sourcePanel.sources.map((source, index) => (
									<button
										key={`${source.url}-${index}`}
										type='button'
										onClick={() => onSelectIndex(index)}
										className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
											sourcePanel.activeIndex === index
												? `${theme.ring} ${theme.soft} ${theme.muted}`
												: isDark
													? 'border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/10'
													: 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
										}`}
									>
										<p className='font-medium'>
											[{index + 1}] {shortText(source.title, 42)}
										</p>
										<p className={`mt-1 text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
											{shortText(sourceHost(source.url), 32)}
										</p>
									</button>
								))}
							</div>

							<div className={`min-h-0 overflow-y-auto rounded-xl border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-white'}`}>
								{activeSource ? (
									<div className='space-y-4'>
										<div>
											<p className={`text-xs uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
												Manba tafsiloti
											</p>
											<h3 className={`mt-1 text-base font-semibold ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
												{activeSource.title}
											</h3>
										</div>

										<a
											href={activeSource.url}
											target='_blank'
											rel='noreferrer noopener'
											className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${theme.ring} ${theme.soft} ${theme.muted}`}
										>
											Ochish
											<ExternalLink className='size-3.5' />
										</a>

										<div className={`rounded-lg border p-3 ${isDark ? 'border-white/10 bg-black/20' : 'border-zinc-200 bg-zinc-50/70'}`}>
											<p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>URL</p>
											<p className={`mt-1 break-all text-xs ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
												{activeSource.url}
											</p>
										</div>

										<div className={`rounded-lg border p-3 ${isDark ? 'border-white/10 bg-black/20' : 'border-zinc-200 bg-zinc-50/70'}`}>
											<p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>Snippet</p>
											<p className={`mt-1 text-sm leading-relaxed ${isDark ? 'text-zinc-100' : 'text-zinc-800'}`}>
												{activeSource.snippet || 'Snippet mavjud emas'}
											</p>
										</div>
									</div>
								) : (
									<div className={`flex h-full items-center justify-center text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
										Manba tanlang
									</div>
								)}
							</div>
						</div>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	)
}
