export type HttpMethod = "GET" | "POST" | "DELETE"

type RequestOptions = {
  method?: HttpMethod
  token?: string
  body?: unknown
}

export type SessionOut = {
  session_id: string
  chat_name?: string | null
  chat_count: number
  created_at: number
}

export type MessageOut = {
  role: "user" | "assistant"
  content: string
  created_at: number
  category?: string | null
}

export type UserOut = {
  id: number
  email: string
  is_admin?: boolean
}

export type SourceItem = {
  title: string
  url: string
  snippet: string
  type?: string
}

type LoginResponse = {
  token?: string
  access_token?: string
  bearer_token?: string
  jwt?: string
}

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

export const API_BASE_URL = "/api"

function parseErrorMessage(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim()) {
    return payload
  }

  if (payload && typeof payload === "object") {
    const row = payload as Record<string, unknown>
    if (typeof row.message === "string" && row.message.trim()) {
      return row.message
    }
    if (typeof row.detail === "string" && row.detail.trim()) {
      return row.detail
    }
    if (Array.isArray(row.detail) && row.detail.length > 0) {
      const first = row.detail[0]
      if (typeof first === "string" && first.trim()) return first
      if (first && typeof first === "object") {
        const detail = first as Record<string, unknown>
        if (typeof detail.msg === "string" && detail.msg.trim()) {
          return detail.msg
        }
      }
    }
  }

  return `So'rov bajarilmadi (${status})`
}

async function parseResponse(response: Response) {
  if (response.status === 204) return null
  const contentType = response.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    return response.json()
  }
  return response.text()
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const { method = "GET", token, body } = options
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let requestBody: BodyInit | undefined
  if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    requestBody = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: requestBody,
  })

  const payload = await parseResponse(response)
  if (!response.ok) {
    throw new ApiError(
      response.status,
      parseErrorMessage(payload, response.status),
      payload
    )
  }

  return payload as T
}

export function extractToken(payload: unknown) {
  if (!payload || typeof payload !== "object") return null
  const data = payload as LoginResponse
  return data.token || data.access_token || data.bearer_token || data.jwt || null
}

export function normalizeUnixTime(value: number) {
  return value > 9_999_999_999 ? value : value * 1000
}

export function formatTime(value: number) {
  const timestamp = normalizeUnixTime(value)
  return new Date(timestamp).toLocaleString("uz-UZ")
}

export function normalizeSources(payload: unknown): SourceItem[] {
  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .filter((item) => item && typeof item === "object")
    .map((item) => item as Record<string, unknown>)
    .map((item) => ({
      title:
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim()
          : "Manba",
      url: typeof item.url === "string" ? item.url : "",
      snippet: typeof item.snippet === "string" ? item.snippet : "",
      type: typeof item.type === "string" ? item.type : undefined,
    }))
    .filter((item) => item.url.trim().length > 0)
}

export const api = {
  register: (email: string, password: string) =>
    request<Record<string, unknown>>("/auth/register", {
      method: "POST",
      body: { email, password },
    }),

  login: (email: string, password: string) =>
    request<Record<string, unknown>>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  me: (token: string) => request<UserOut>("/users/me", { token }),

  newSession: (token: string) =>
    request<SessionOut>("/session/new", { method: "POST", token }),

  sessions: (token: string) => request<SessionOut[]>("/session/", { token }),

  sessionHistory: (token: string, sessionId: string) =>
    request<MessageOut[]>(`/session/${sessionId}?limit=100&offset=0`, { token }),

  deleteSession: (token: string, sessionId: string) =>
    request<Record<string, unknown>>(`/session/${sessionId}`, {
      method: "DELETE",
      token,
    }),
}
