import type { ChatHistory } from '@/interfaces'

export type Mode = 'ask' | 'agent'
export type Accent = 'ocean' | 'mint' | 'sunset'
export type ColorScheme = 'dark' | 'light'

export interface Profile {
	name: string
	role: string
	defaultMode: Mode
	autoScroll: boolean
	accent: Accent
}

export interface PromptChip {
	label: string
	text: string
	mode: Mode
}

export interface SourceItem {
	type: string
	title: string
	url: string
	snippet: string
}

export interface ChatMessage extends ChatHistory {
	sources?: SourceItem[]
	category?: string
}

export interface SourcePanelState {
	open: boolean
	sources: SourceItem[]
	category?: string
	activeIndex: number
}

export interface ThemeTokens {
	ring: string
	soft: string
	btn: string
	bubble: string
	badge: string
	muted: string
}

export const PROFILE_KEY = 'secgpt.profile.v4'
export const SCHEME_KEY = 'secgpt.color-scheme.v1'
export const SEC_LIMIT = 10_000_000_000

export const DEFAULT_PROFILE: Profile = {
	name: 'Guest',
	role: 'Security Analyst',
	defaultMode: 'ask',
	autoScroll: true,
	accent: 'ocean',
}

export const PROMPTS: PromptChip[] = [
	{
		label: 'Threat report',
		text: 'Pentest natijalari asosida ustuvor xavf reja tuzib ber.',
		mode: 'agent',
	},
	{
		label: 'Code review',
		text: 'Koddagi xavfsizlik xatolarini top va fix rejasini yoz.',
		mode: 'agent',
	},
	{
		label: 'Summarize',
		text: 'Oldingi javobni 5 ta aniq punktga qisqartir.',
		mode: 'ask',
	},
	{
		label: 'Explain simple',
		text: 'Shuni oddiy tilda, amaliy misollar bilan tushuntir.',
		mode: 'ask',
	},
]

export const THEMES: Record<Accent, ThemeTokens> = {
	ocean: {
		ring: 'border-cyan-300/30',
		soft: 'bg-cyan-500/10',
		btn: 'bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400',
		bubble: 'from-cyan-600 to-sky-700',
		badge: 'from-cyan-300 via-teal-200 to-emerald-200',
		muted: 'text-cyan-100',
	},
	mint: {
		ring: 'border-emerald-300/30',
		soft: 'bg-emerald-500/10',
		btn: 'bg-gradient-to-br from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400',
		bubble: 'from-emerald-600 to-teal-700',
		badge: 'from-emerald-300 via-lime-200 to-teal-200',
		muted: 'text-emerald-100',
	},
	sunset: {
		ring: 'border-orange-300/30',
		soft: 'bg-orange-500/10',
		btn: 'bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400',
		bubble: 'from-orange-600 to-amber-700',
		badge: 'from-orange-300 via-amber-200 to-rose-200',
		muted: 'text-orange-100',
	},
}
