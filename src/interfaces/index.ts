export interface Chat {
	question: string
	session_id: string
	top_k: number
}

export interface SessionTypes {
	session_id: string
}

export interface ChatHistory {
	role: 'user' | 'assistant'
	content: string
	category?: string
	created_at: number
}
