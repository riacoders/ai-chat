const baseURL = import.meta.env.VITE_APP_BASE_URL

export const APISERVICE = {
	chat: `${baseURL}/chat`,
	sessions: `${baseURL}/sessions`,
	session: `${baseURL}/session/new`,
	register: `${baseURL}/auth/register`,
	login: `${baseURL}/auth/login`,
}
