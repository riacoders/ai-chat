export interface Chat {
	question: string
	session_id: string
	top_k: number
}

export interface SessionTypes {
	session_id: string
	chat_name: string | null
	chat_count: number
	created_at: number
}

export interface ChatHistory {
	role: 'user' | 'assistant'
	content: string
	category?: string
	created_at: number
}
