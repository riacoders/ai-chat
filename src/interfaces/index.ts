export interface Message {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: string
}

export interface ChatSession {
	session_id: string
	message_count: number
	last_message: string
	last_message_role: 'user' | 'assistant'
	last_activity: string
	created_at: string
	updated_at: string
}

export interface HistoryResponse {
	sessions: ChatSession[]
	total_sessions: number
	total_messages: number
	active_sessions_24h: number
}
