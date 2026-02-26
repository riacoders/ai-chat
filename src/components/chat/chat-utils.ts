import type { SessionTypes } from '@/interfaces'

import type { ChatMessage, Profile, SourceItem } from './chat-types'
import { DEFAULT_PROFILE, SEC_LIMIT } from './chat-types'

export const toMs = (value: unknown): number => {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value < SEC_LIMIT ? value * 1000 : value
	}
	if (typeof value === 'string') {
		const numeric = Number(value)
		if (Number.isFinite(numeric)) return numeric < SEC_LIMIT ? numeric * 1000 : numeric
		const parsed = Date.parse(value)
		if (!Number.isNaN(parsed)) return parsed
	}
	return Date.now()
}

export const shortText = (value: string, max = 70): string =>
	value.length > max ? `${value.slice(0, max - 1)}...` : value

export const sourceHost = (value: string): string => {
	try {
		return new URL(value).hostname.replace(/^www\./, '')
	} catch {
		return value
	}
}

export const normalizeSources = (payload: unknown): SourceItem[] => {
	if (!Array.isArray(payload)) return []

	const sources: SourceItem[] = []
	for (const row of payload) {
		if (!row || typeof row !== 'object') continue
		const item = row as Record<string, unknown>
		const url = typeof item.url === 'string' ? item.url.trim() : ''
		if (!url) continue

		sources.push({
			type: typeof item.type === 'string' ? item.type : 'web',
			title:
				typeof item.title === 'string' && item.title.trim()
					? item.title.trim()
					: sourceHost(url),
			url,
			snippet: typeof item.snippet === 'string' ? item.snippet : '',
		})
	}
	return sources
}

export const normalizeSessions = (payload: unknown): SessionTypes[] => {
	const data = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
	const rows: unknown[] = Array.isArray(payload)
		? payload
		: data && Array.isArray(data.data)
			? (data.data as unknown[])
			: data && Array.isArray(data.sessions)
				? (data.sessions as unknown[])
				: []

	const sessions: SessionTypes[] = []
	for (const row of rows) {
		if (!row || typeof row !== 'object') continue
		const item = row as Record<string, unknown>
		const sessionId = String(item.session_id ?? item.id ?? '')
		if (!sessionId) continue
		sessions.push({
			session_id: sessionId,
			chat_name:
				typeof item.chat_name === 'string'
					? item.chat_name
					: typeof item.title === 'string'
						? item.title
						: null,
			chat_count: Number(item.chat_count ?? item.messages_count ?? 0) || 0,
			created_at: toMs(item.created_at),
		})
	}

	return sessions.sort((a, b) => b.created_at - a.created_at)
}

export const normalizeMessages = (payload: unknown): ChatMessage[] => {
	const data = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
	const rows: unknown[] = Array.isArray(payload)
		? payload
		: data && Array.isArray(data.messages)
			? (data.messages as unknown[])
			: data && Array.isArray(data.chat_history)
				? (data.chat_history as unknown[])
				: []

	const list: ChatMessage[] = []
	for (const row of rows) {
		if (!row || typeof row !== 'object') continue
		const item = row as Record<string, unknown>
		const question = typeof item.question === 'string' ? item.question.trim() : ''
		const answer = typeof item.answer === 'string' ? item.answer.trim() : ''
		const category = typeof item.category === 'string' ? item.category : undefined
		const sources = normalizeSources(item.sources)

		if (question || answer) {
			if (question) {
				list.push({ role: 'user', content: question, created_at: toMs(item.created_at) })
			}
			if (answer) {
				list.push({
					role: 'assistant',
					content: answer,
					created_at: toMs(item.created_at),
					category,
					sources,
				})
			}
			continue
		}

		const role = item.role === 'assistant' || item.role === 'ai' ? 'assistant' : 'user'
		const content =
			typeof item.content === 'string'
				? item.content.trim()
				: typeof item.text === 'string'
					? item.text.trim()
					: ''
		if (!content) continue

		list.push({ role, content, created_at: toMs(item.created_at), category, sources })
	}
	return list
}

export const loadProfile = (key: string): Profile => {
	if (typeof window === 'undefined') return DEFAULT_PROFILE
	try {
		const raw = window.localStorage.getItem(key)
		if (!raw) return DEFAULT_PROFILE
		const parsed = JSON.parse(raw) as Partial<Profile>
		return {
			name: typeof parsed.name === 'string' ? parsed.name.slice(0, 48) : DEFAULT_PROFILE.name,
			role: typeof parsed.role === 'string' ? parsed.role.slice(0, 64) : DEFAULT_PROFILE.role,
			defaultMode: parsed.defaultMode === 'agent' ? 'agent' : 'ask',
			autoScroll: typeof parsed.autoScroll === 'boolean' ? parsed.autoScroll : true,
			accent:
				parsed.accent === 'mint' || parsed.accent === 'sunset' ? parsed.accent : 'ocean',
		}
	} catch {
		return DEFAULT_PROFILE
	}
}

export const loadScheme = (key: string): 'dark' | 'light' => {
	if (typeof window === 'undefined') return 'dark'
	const stored = window.localStorage.getItem(key)
	if (stored === 'dark' || stored === 'light') return stored
	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
	return prefersDark ? 'dark' : 'light'
}

export const timeLabel = (value: number): string =>
	new Date(value).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
