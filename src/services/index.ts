const baseURL = import.meta.env.VITE_APP_BASE_URL

export const APISERVICE = {
	chat: `${baseURL}/api/v1/chat/chat`,
	history: `${baseURL}/api/v1/chat/chat/history`,
	session: (id: string) => `${baseURL}/api/v1/chat/chat/session/${id}`,
	statistics: `${baseURL}/api/v1/chat/chat/statistics`,
}
