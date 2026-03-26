import { API_BASE_URL, ApiError } from "@/lib/api-client"

export type ChatMode = "ask" | "agent"

export type ChatStreamInput = {
  question: string
  session_id?: string | null
  top_k?: number
  mode?: ChatMode
  file?: File | null
}

export type ChatStreamSnapshot = {
  answer: string
  session_id?: string
  category?: string
  mode?: string
  sources: Array<Record<string, unknown>>
  done: boolean
}

export type ChatStreamEvent = Record<string, unknown> | { done: true }

type StreamOptions = {
  signal?: AbortSignal
  collectEvents?: boolean
  onUpdate?: (snapshot: ChatStreamSnapshot, event: ChatStreamEvent) => void
}

function toErrorMessage(payload: unknown, status: number) {
  if (typeof payload === "string" && payload.trim()) {
    return payload
  }

  if (payload && typeof payload === "object") {
    const row = payload as Record<string, unknown>
    if (typeof row.detail === "string" && row.detail.trim()) {
      return row.detail
    }
    if (typeof row.message === "string" && row.message.trim()) {
      return row.message
    }
  }

  return `Stream so'rovi bajarilmadi (${status})`
}

function parseSseData(block: string) {
  return block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n")
    .trim()
}

function applyPayload(
  snapshot: ChatStreamSnapshot,
  payload: Record<string, unknown>
) {
  if (typeof payload.delta === "string") {
    snapshot.answer += payload.delta
  }
  if (typeof payload.answer === "string") {
    snapshot.answer = payload.answer
  }
  if (typeof payload.session_id === "string" && payload.session_id.trim()) {
    snapshot.session_id = payload.session_id
  }
  if (typeof payload.category === "string" && payload.category.trim()) {
    snapshot.category = payload.category
  }
  if (typeof payload.mode === "string" && payload.mode.trim()) {
    snapshot.mode = payload.mode
  }
  if (Array.isArray(payload.sources)) {
    snapshot.sources = payload.sources
      .filter((item) => item && typeof item === "object")
      .map((item) => item as Record<string, unknown>)
  }
  if (payload.done === true) {
    snapshot.done = true
  }
}

export async function streamChatRequest(
  token: string,
  input: ChatStreamInput,
  options: StreamOptions = {}
) {
  const { signal, collectEvents = false, onUpdate } = options
  const formData = new FormData()
  formData.append("question", input.question)

  if (typeof input.session_id === "string" && input.session_id.trim()) {
    formData.append("session_id", input.session_id.trim())
  }

  if (typeof input.top_k === "number" && Number.isFinite(input.top_k)) {
    formData.append("top_k", String(input.top_k))
  }

  if (typeof input.mode === "string" && input.mode.trim()) {
    formData.append("mode", input.mode.trim())
  }

  if (typeof File !== "undefined" && input.file instanceof File) {
    formData.append("file", input.file)
  }

  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream, application/json",
    },
    body: formData,
    signal,
  })

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || ""
    let payload: unknown = null

    try {
      payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text()
    } catch {
      payload = null
    }

    throw new ApiError(
      response.status,
      toErrorMessage(payload, response.status),
      payload
    )
  }

  const snapshot: ChatStreamSnapshot = {
    answer: "",
    sources: [],
    done: false,
  }
  const events: ChatStreamEvent[] = []

  const pushEvent = (event: ChatStreamEvent) => {
    if (collectEvents) events.push(event)
    onUpdate?.({ ...snapshot, sources: [...snapshot.sources] }, event)
  }

  const contentType = response.headers.get("content-type") || ""
  const isSse = contentType.includes("text/event-stream")

  if (!isSse) {
    const payload = (await response.json()) as Record<string, unknown>
    applyPayload(snapshot, payload)
    pushEvent(payload)
    return { snapshot, events }
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new ApiError(502, "Stream oqimini o'qib bo'lmadi")
  }

  const decoder = new TextDecoder()
  let buffer = ""

  const processBlock = (block: string) => {
    const data = parseSseData(block)
    if (!data) return

    if (data === "[DONE]") {
      snapshot.done = true
      pushEvent({ done: true })
      return
    }

    try {
      const payload = JSON.parse(data) as Record<string, unknown>
      applyPayload(snapshot, payload)
      pushEvent(payload)
    } catch {
      // Skip invalid payload.
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    buffer = buffer.replace(/\r\n/g, "\n")
    let splitIndex = buffer.indexOf("\n\n")

    while (splitIndex >= 0) {
      processBlock(buffer.slice(0, splitIndex))
      buffer = buffer.slice(splitIndex + 2)
      splitIndex = buffer.indexOf("\n\n")
    }
  }

  buffer += decoder.decode()
  buffer = buffer.replace(/\r\n/g, "\n")
  if (buffer.trim()) {
    processBlock(buffer)
  }

  return { snapshot, events }
}
