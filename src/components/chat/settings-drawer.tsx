import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, User2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'

import type {
	Accent,
	ColorScheme,
	Mode,
	Profile,
	ThemeTokens,
} from './chat-types'

interface SettingsDrawerProps {
	open: boolean
	onClose: () => void
	scheme: ColorScheme
	theme: ThemeTokens
	profile: Profile
	onProfileChange: (next: Profile) => void
	onLogout: () => void
}

export function SettingsDrawer({
	open,
	onClose,
	scheme,
	theme,
	profile,
	onProfileChange,
	onLogout,
}: SettingsDrawerProps) {
	const isDark = scheme === 'dark'

	const inputClass = isDark
		? 'h-10 rounded-xl border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500'
		: 'h-10 rounded-xl border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400'

	const selectTriggerClass = isDark
		? 'h-10 rounded-xl border-white/10 bg-white/5 text-zinc-100'
		: 'h-10 rounded-xl border-zinc-200 bg-white text-zinc-900'

	const selectContentClass = isDark
		? 'z-[120] border-white/20 bg-zinc-900 text-zinc-100'
		: 'z-[120] border-zinc-200 bg-white text-zinc-900'

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
						className='fixed inset-0 z-50 bg-black/55'
						aria-label='Close settings'
					/>
					<div className='fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6'>
						<motion.section
							initial={{ opacity: 0, scale: 0.96, y: 12 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.98, y: 8 }}
							transition={{ type: 'spring', stiffness: 320, damping: 30 }}
							className={`flex max-h-[90dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-[28px] border shadow-2xl backdrop-blur-xl ${
								isDark
									? 'border-white/10 bg-[#0f161d]/95 text-zinc-100'
									: 'border-zinc-200/80 bg-white/95 text-zinc-900'
							}`}
						>
							<div
								className={`border-b px-5 py-4 md:px-6 ${isDark ? 'border-white/10' : 'border-zinc-200/80'}`}
							>
								<div className='flex items-center justify-between gap-3'>
									<div className='min-w-0'>
										<p className='truncate text-lg font-semibold'>Sozlamalar</p>
									</div>
									<Button
										type='button'
										size='icon-sm'
										variant='ghost'
										onClick={onClose}
										className={`rounded-lg ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-zinc-900/5 hover:bg-zinc-900/10'}`}
									>
										<X className='size-4' />
									</Button>
								</div>
							</div>

							<div className='min-h-0 flex-1 space-y-4 overflow-y-auto p-5 md:p-6'>
								<div
									className={`rounded-2xl border p-4 ${theme.ring} ${theme.soft}`}
								>
									<div className='flex items-center gap-3 justify-between'>
										<div className='flex items-center gap-2'>
											<div
												className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${theme.badge} text-sm font-bold text-slate-900`}
											>
												{(profile.name || 'G').slice(0, 2).toUpperCase()}
											</div>
											<div className='min-w-0'>
												<p className='truncate text-sm font-semibold'>
													{profile.name || 'Guest'}
												</p>
												<p
													className={`truncate text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
												>
													{profile.role || 'Security Analyst'}
												</p>
											</div>
										</div>
										<Button
											type='button'
											variant='ghost'
											onClick={onLogout}
											className={`h-9 rounded-xl px-3 ${
												isDark
													? 'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
													: 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/20'
											}`}
										>
											<LogOut className='size-4' />
										</Button>
									</div>
								</div>

								<div
									className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-zinc-50/70'}`}
								>
									<div className='mb-3 flex items-center gap-2'>
										<User2
											className={`size-4 ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}
										/>
										<p className='text-sm font-medium'>Identity</p>
									</div>
									<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
										<div className='space-y-1.5'>
											<p
												className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
											>
												Display name
											</p>
											<Input
												value={profile.name}
												onChange={event =>
													onProfileChange({
														...profile,
														name: event.target.value.slice(0, 48),
													})
												}
												placeholder='Display name'
												className={inputClass}
											/>
										</div>
										<div className='space-y-1.5'>
											<p
												className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
											>
												Role
											</p>
											<Input
												value={profile.role}
												onChange={event =>
													onProfileChange({
														...profile,
														role: event.target.value.slice(0, 64),
													})
												}
												placeholder='Role'
												className={inputClass}
											/>
										</div>
									</div>
								</div>

								<div
									className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-zinc-50/70'}`}
								>
									<p className='mb-3 text-sm font-medium'>Preferences</p>
									<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
										<div className='space-y-1.5'>
											<p
												className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
											>
												Default mode
											</p>
											<Select
												value={profile.defaultMode}
												onValueChange={value =>
													onProfileChange({
														...profile,
														defaultMode: value as Mode,
													})
												}
											>
												<SelectTrigger
													className={`${selectTriggerClass} text-xs`}
												>
													<SelectValue placeholder='Mode' />
												</SelectTrigger>
												<SelectContent className={selectContentClass}>
													<SelectItem value='ask'>Ask mode</SelectItem>
													<SelectItem value='agent'>Agent mode</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div className='space-y-1.5'>
											<p
												className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
											>
												Accent
											</p>
											<Select
												value={profile.accent}
												onValueChange={value =>
													onProfileChange({
														...profile,
														accent: value as Accent,
													})
												}
											>
												<SelectTrigger
													className={`${selectTriggerClass} text-xs`}
												>
													<SelectValue placeholder='Accent' />
												</SelectTrigger>
												<SelectContent className={selectContentClass}>
													<SelectItem value='ocean'>Ocean</SelectItem>
													<SelectItem value='mint'>Mint</SelectItem>
													<SelectItem value='sunset'>Sunset</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
								</div>

								<div
									className={`rounded-xl border p-3 text-xs ${isDark ? 'border-white/10 bg-white/5' : 'border-zinc-200 bg-white'}`}
								>
									<div className='flex items-center justify-between gap-3'>
										<div>
											<p className='text-sm font-medium'>Auto scroll</p>
											<p
												className={`mt-0.5 text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}
											>
												Yangi javob kelganda chat avtomatik pastga tushadi.
											</p>
										</div>
										<button
											type='button'
											onClick={() =>
												onProfileChange({
													...profile,
													autoScroll: !profile.autoScroll,
												})
											}
											className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
												profile.autoScroll
													? isDark
														? `${theme.soft} ${theme.muted}`
														: `${theme.soft} text-zinc-800`
													: isDark
														? 'bg-zinc-700/50 text-zinc-300'
														: 'bg-zinc-200 text-zinc-700'
											}`}
										>
											{profile.autoScroll ? 'Enabled' : 'Disabled'}
										</button>
									</div>
								</div>
							</div>
						</motion.section>
					</div>
				</>
			)}
		</AnimatePresence>
	)
}
