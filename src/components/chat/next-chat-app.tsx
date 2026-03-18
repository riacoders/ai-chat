"use client"

import * as React from "react"
import DOMPurify from "dompurify"
import {
  Bot,
  Copy,
  GripVertical,
  Loader2,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Send,
  TerminalSquare,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import {
  api,
  ApiError,
  type MessageOut,
  normalizeSources,
  type SessionOut,
  type SourceItem,
} from "@/lib/api-client"
import { clearSessionToken, getSessionToken } from "@/lib/auth"
import { streamChatRequest, type ChatMode } from "@/lib/chat-stream"
import { cn } from "@/lib/utils"

type UiMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: number
  category?: string
  sources: SourceItem[]
}

const EMPTY_ANSWER = "Javob qaytmadi."

function toMs(value: number) {
  return value > 9_999_999_999 ? value : value * 1000
}

function toUiMessages(payload: MessageOut[]): UiMessage[] {
  return payload.map((row, index) => ({
    id: `${row.role}-${row.created_at}-${index}`,
    role: row.role,
    content: row.content,
    createdAt: toMs(row.created_at),
    category: row.category || undefined,
    sources: [],
  }))
}

function formatDate(value: number) {
  return new Date(value).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const COMMAND_KEY_PATTERN =
  /(command|cmd|shell|bash|zsh|sh|powershell|pwsh|terminal|exec|tool_input|tool_args|arguments)/i
const COMMAND_LINE_PATTERN =
  /^(?:\$?\s*(?:sudo\s+)?(?:nmap|subfinder|nuclei|ffuf|whois|curl|wget|ping|traceroute|dig|nslookup|python(?:3)?|pip|npm|pnpm|yarn|node|git|docker|kubectl|ssh|scp|bash|sh|pwsh|powershell)\b|(?:\.{0,2}\/|~\/)[^\s]+|\w+:\S+)/

function normalizeCommandLine(line: string) {
  return line
    .trim()
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/^[$>#]\s*/, "")
    .trim()
}

function extractCommandsFromText(text: string) {
  return text
    .replace(/```(?:bash|shell|sh|zsh|console|powershell|pwsh)?/gi, "")
    .replace(/```/g, "")
    .split(/\r?\n/)
    .map(normalizeCommandLine)
    .filter((line) => line.length > 2 && line.length <= 280)
    .filter(
      (line) =>
        COMMAND_LINE_PATTERN.test(line) ||
        line.startsWith("$ ") ||
        /(?:\s--\w|\s&&\s|\s\|\s|>\s|\s<\s)/.test(line)
    )
}

function extractCommandsFromAnswer(answer: string) {
  const commands: string[] = []
  const fencePattern =
    /```(?:bash|shell|sh|zsh|console|powershell|pwsh)?\n([\s\S]*?)```/gi
  let match: RegExpExecArray | null = fencePattern.exec(answer)

  while (match) {
    commands.push(...extractCommandsFromText(match[1] || ""))
    match = fencePattern.exec(answer)
  }

  return commands
}

function extractCommandsFromEventPayload(event: unknown) {
  const commands: string[] = []

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return

    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }

    Object.entries(node as Record<string, unknown>).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase()
      if (["status", "state", "progress", "done"].includes(lowerKey)) {
        return
      }

      if (typeof value === "string") {
        if (COMMAND_KEY_PATTERN.test(key)) {
          commands.push(...extractCommandsFromText(value))
        }
        return
      }

      visit(value)
    })
  }

  visit(event)
  return commands
}

export function NextChatApp() {
  const router = useRouter()

  const [sessions, setSessions] = React.useState<SessionOut[]>([])
  const [sessionQuery, setSessionQuery] = React.useState("")
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<UiMessage[]>([])
  const [prompt, setPrompt] = React.useState("")
  const [mode, setMode] = React.useState<ChatMode>("ask")
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [loadingSessions, setLoadingSessions] = React.useState(false)
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const [terminalLogs, setTerminalLogs] = React.useState<string[]>([])
  const [agentSplit, setAgentSplit] = React.useState(62)
  const [resizing, setResizing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [hydrated, setHydrated] = React.useState(false)
  const [token, setToken] = React.useState<string | null>(null)
  const seenCommandsRef = React.useRef<Set<string>>(new Set())
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null)
  const splitRootRef = React.useRef<HTMLDivElement | null>(null)
  const terminalEndRef = React.useRef<HTMLDivElement | null>(null)

  const copyText = React.useCallback((value: string, label = "Nusxa olindi.") => {
    void navigator.clipboard.writeText(value)
    toast.success(label, { richColors: true, position: "top-center" })
  }, [])

  const filteredSessions = React.useMemo(() => {
    const q = sessionQuery.trim().toLowerCase()
    if (!q) return sessions
    return sessions.filter((item) =>
      String(item.chat_name || "yangi suhbat")
        .toLowerCase()
        .includes(q)
    )
  }, [sessionQuery, sessions])

  const activeSession = React.useMemo(
    () => sessions.find((item) => item.session_id === sessionId) || null,
    [sessions, sessionId]
  )

  const askResources = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const row = messages[i]
      if (row.role === "assistant" && row.sources.length > 0) {
        return row.sources
      }
    }
    return []
  }, [messages])

  const pushTerminalCommands = React.useCallback((items: string[]) => {
    if (items.length === 0) return

    setTerminalLogs((prev) => {
      const next = [...prev]

      items.forEach((raw) => {
        const normalized = normalizeCommandLine(raw)
        if (!normalized) return
        if (seenCommandsRef.current.has(normalized)) return

        seenCommandsRef.current.add(normalized)
        next.push(normalized)
      })

      return next.slice(-300)
    })
  }, [])

  const goLogin = React.useCallback(() => {
    clearSessionToken()
    setToken(null)
    router.replace("/login")
  }, [router])

  const checkUnauthorized = React.useCallback(
    (maybeError: unknown) => {
      if (maybeError instanceof ApiError && maybeError.status === 401) {
        goLogin()
        return true
      }
      return false
    },
    [goLogin]
  )

  React.useEffect(() => {
    setHydrated(true)
    setToken(getSessionToken())
  }, [])

  const loadSessions = React.useCallback(async () => {
    const nextToken = getSessionToken()
    if (!nextToken) {
      goLogin()
      return
    }

    setLoadingSessions(true)
    setError(null)

    try {
      const data = await api.sessions(nextToken)
      const sorted = [...data].sort((a, b) => b.created_at - a.created_at)
      setSessions(sorted)
    } catch (loadError) {
      if (checkUnauthorized(loadError)) return
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Sessiyalarni yuklab bo'lmadi."
      setError(message)
      toast.error(message, { richColors: true, position: "top-center" })
    } finally {
      setLoadingSessions(false)
    }
  }, [checkUnauthorized, goLogin])

  const loadMessages = React.useCallback(
    async (id: string) => {
      const nextToken = getSessionToken()
      if (!nextToken) {
        goLogin()
        return
      }

      setLoadingMessages(true)
      setError(null)

      try {
        const data = await api.sessionHistory(nextToken, id)
        setMessages(toUiMessages(data))
      } catch (loadError) {
        if (checkUnauthorized(loadError)) return
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Xabarlarni yuklab bo'lmadi."
        setError(message)
        toast.error(message, { richColors: true, position: "top-center" })
      } finally {
        setLoadingMessages(false)
      }
    },
    [checkUnauthorized, goLogin]
  )

  const createSession = React.useCallback(async () => {
    const nextToken = getSessionToken()
    if (!nextToken) {
      goLogin()
      return
    }

    try {
      const created = await api.newSession(nextToken)
      setSessionId(created.session_id)
      setMessages([])
      setSidebarOpen(false)
      await loadSessions()
    } catch (createError) {
      if (checkUnauthorized(createError)) return
      const message =
        createError instanceof Error ? createError.message : "Session yaratilmadi."
      toast.error(message, { richColors: true, position: "top-center" })
    }
  }, [checkUnauthorized, goLogin, loadSessions])

  const removeSession = React.useCallback(
    async (id: string) => {
      const nextToken = getSessionToken()
      if (!nextToken) {
        goLogin()
        return
      }

      try {
        await api.deleteSession(nextToken, id)

        if (id === sessionId) {
          setSessionId(null)
          setMessages([])
        }
        await loadSessions()
      } catch (removeError) {
        if (checkUnauthorized(removeError)) return
        const message =
          removeError instanceof Error
            ? removeError.message
            : "Session o'chirilmadi."
        toast.error(message, { richColors: true, position: "top-center" })
      }
    },
    [checkUnauthorized, goLogin, loadSessions, sessionId]
  )

  const sendPrompt = React.useCallback(async () => {
    const nextToken = getSessionToken()
    if (!nextToken) {
      goLogin()
      return
    }

    if (sending || prompt.trim().length === 0) {
      return
    }

    setError(null)
    setSending(true)

    const cleanPrompt = DOMPurify.sanitize(prompt.trim(), { ALLOWED_TAGS: [] })
    setPrompt("")

    const userMessage: UiMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: cleanPrompt,
      createdAt: Date.now(),
      sources: [],
    }

    const assistantId = `assistant-${Date.now()}`

    setMessages((prev) => [
      ...prev,
      userMessage,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        sources: [],
      },
    ])

    try {
      let currentSessionId = sessionId
      if (!currentSessionId) {
        const created = await api.newSession(nextToken)
        currentSessionId = created.session_id
        setSessionId(created.session_id)
      }

      const streamed = await streamChatRequest(
        nextToken,
        {
          question: cleanPrompt,
          session_id: currentSessionId,
          mode,
          top_k: 5,
        },
        {
          onUpdate: (snapshot, event) => {
            setMessages((prev) =>
              prev.map((item) =>
                item.id === assistantId
                  ? {
                      ...item,
                      content: snapshot.answer,
                      category: snapshot.category,
                      sources: normalizeSources(snapshot.sources),
                    }
                  : item
              )
            )

            if (mode === "agent") {
              const commandsFromEvent = extractCommandsFromEventPayload(event)
              if (commandsFromEvent.length > 0) {
                pushTerminalCommands(commandsFromEvent)
              }

              const commandsFromAnswer = extractCommandsFromAnswer(snapshot.answer)
              if (commandsFromAnswer.length > 0) {
                pushTerminalCommands(commandsFromAnswer)
              }
            }
          },
        }
      )

      const finalAnswer = streamed.snapshot.answer.trim() || EMPTY_ANSWER
      const finalSources = normalizeSources(streamed.snapshot.sources)

      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content: finalAnswer,
                category: streamed.snapshot.category,
                sources: finalSources,
              }
            : item
        )
      )

      if (streamed.snapshot.session_id) {
        setSessionId(streamed.snapshot.session_id)
      }

      if (mode === "agent") {
        pushTerminalCommands(extractCommandsFromAnswer(finalAnswer))
      }
      await loadSessions()
    } catch (sendError) {
      if (checkUnauthorized(sendError)) return
      const message =
        sendError instanceof Error ? sendError.message : "So'rov yuborilmadi."

      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantId ? { ...item, content: `Xatolik: ${message}` } : item
        )
      )
      setError(message)
      toast.error(message, { richColors: true, position: "top-center" })
    } finally {
      setSending(false)
    }
  }, [checkUnauthorized, goLogin, loadSessions, mode, prompt, pushTerminalCommands, sending, sessionId])

  React.useEffect(() => {
    if (!hydrated) {
      return
    }
    if (!token) {
      router.replace("/login")
      return
    }
    void loadSessions()
  }, [hydrated, loadSessions, router, token])

  React.useEffect(() => {
    if (!sessionId && sessions.length > 0) {
      setSessionId(sessions[0].session_id)
    }
  }, [sessionId, sessions])

  React.useEffect(() => {
    if (!sessionId) {
      setMessages([])
      return
    }
    void loadMessages(sessionId)
  }, [loadMessages, sessionId])

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, sending])

  React.useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [terminalLogs])

  React.useEffect(() => {
    if (!resizing) return

    const onMove = (event: MouseEvent) => {
      const root = splitRootRef.current
      if (!root) return
      const rect = root.getBoundingClientRect()
      const ratio = ((event.clientX - rect.left) / rect.width) * 100
      const clamped = Math.min(76, Math.max(35, ratio))
      setAgentSplit(clamped)
    }

    const onUp = () => setResizing(false)

    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [resizing])

  if (!hydrated) {
    return <div className="chat-shell h-dvh w-full" />
  }

  if (!token) {
    return null
  }

  const renderMessages = (
    <ScrollArea className="h-full">
      <div className="space-y-3 px-4 py-4">
        {loadingMessages ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]"
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-sm text-slate-400">
            Savol yuboring.
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "group relative max-w-[92%] rounded-2xl border p-3",
                  message.role === "user"
                    ? "border-cyan-400/30 bg-cyan-500/15"
                    : "border-white/10 bg-white/[0.04]"
                )}
              >
                <div className="mb-1 text-[11px] text-slate-400">
                  {message.role === "user" ? "Siz" : "SecGPT"} • {formatDate(message.createdAt)}
                </div>

                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => copyText(message.content, "Xabar nusxalandi.")}
                  className="absolute right-2 top-2 rounded-md text-slate-300/70 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-white"
                >
                  <Copy className="size-4" />
                </Button>

                <div className="markdown-shell pr-7 text-sm leading-7 text-slate-100">
                  <ReactMarkdown
                    components={{
                      code({ className, children }) {
                        const match = /language-(\w+)/.exec(className || "")
                        const content = String(children).replace(/\n$/, "")

                        if (match) {
                          const language = match[1].toLowerCase()

                          return (
                            <div className="mt-3 overflow-hidden rounded-xl border border-white/15 bg-[#040b20]/90">
                              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                                <span className="text-[11px] uppercase tracking-wide text-slate-300">
                                  {language}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyText(content, "Kod nusxalandi.")}
                                  className="rounded-md p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
                                  title="Copy code"
                                  aria-label="Copy code"
                                >
                                  <Copy className="size-3.5" />
                                </button>
                              </div>
                              <SyntaxHighlighter
                                language={language}
                                style={vscDarkPlus}
                                customStyle={{
                                  margin: 0,
                                  borderRadius: 0,
                                  border: "none",
                                  background: "transparent",
                                  padding: "0.85rem",
                                  fontSize: "13px",
                                }}
                                wrapLongLines
                              >
                                {content}
                              </SyntaxHighlighter>
                            </div>
                          )
                        }

                        return (
                          <code className="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">
                            {children}
                          </code>
                        )
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )

  const composer = (
    <form
      className="border-t border-white/10 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        void sendPrompt()
      }}
    >
      <Textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            void sendPrompt()
          }
        }}
        placeholder="Savol yozing..."
        className="min-h-20 resize-none rounded-xl border-white/15 bg-white/[0.04] text-slate-100"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.04] p-1">
          <Button
            type="button"
            size="sm"
            onClick={() => setMode("ask")}
            className={cn(
              "h-7 gap-1 rounded-md px-2 text-xs",
              mode === "ask"
                ? "bg-cyan-500/25 text-white hover:bg-cyan-500/30"
                : "bg-transparent text-slate-400 hover:bg-white/[0.06]"
            )}
          >
            <MessageSquare className="size-3.5" />
            Ask
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setMode("agent")}
            className={cn(
              "h-7 gap-1 rounded-md px-2 text-xs",
              mode === "agent"
                ? "bg-cyan-500/25 text-white hover:bg-cyan-500/30"
                : "bg-transparent text-slate-400 hover:bg-white/[0.06]"
            )}
          >
            <Bot className="size-3.5" />
            Agent
          </Button>
        </div>

        <Button
          type="submit"
          disabled={sending || prompt.trim().length === 0}
          className="h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-3 text-white"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </div>
    </form>
  )

  const chatPanel = (
    <div className="panel-card flex h-full min-h-0 flex-col rounded-2xl">
      <div className="border-b border-white/10 px-4 py-3 text-sm text-slate-200">
        {activeSession?.chat_name || "Yangi suhbat"}
      </div>
      <div className="min-h-0 flex-1">{renderMessages}</div>
      {composer}
    </div>
  )

  return (
    <div className="chat-shell h-dvh w-full overflow-hidden text-slate-100">
      <div className="flex h-full">
        <aside className="hidden h-full w-[290px] shrink-0 border-r border-white/10 bg-[#151d3f]/80 lg:flex lg:flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
            <span className="text-sm font-semibold">SecGPT</span>
            <Button
              type="button"
              size="icon-sm"
              onClick={() => void createSession()}
              className="rounded-lg bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="px-3 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={sessionQuery}
                onChange={(event) => setSessionQuery(event.target.value)}
                placeholder="Sessiya qidirish"
                className="h-9 rounded-xl border-white/15 bg-white/[0.04] pl-9 text-slate-100"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
            <div className="space-y-2 pr-1">
              {loadingSessions ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded-xl border border-white/10 bg-white/[0.04]"
                  />
                ))
              ) : filteredSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-400">
                  {"Sessiya yo'q"}
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div
                    key={session.session_id}
                    className={cn(
                      "rounded-xl border p-2.5",
                      session.session_id === sessionId
                        ? "border-cyan-400/40 bg-cyan-500/12"
                        : "border-white/10 bg-white/[0.03]"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSessionId(session.session_id)
                          setSidebarOpen(false)
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm text-slate-100">
                          {session.chat_name || "Yangi suhbat"}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">{session.chat_count} xabar</p>
                      </button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => void removeSession(session.session_id)}
                        className="shrink-0 rounded-lg text-rose-300 hover:bg-rose-500/15 hover:text-rose-200"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-3 lg:px-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-white/10 bg-white/[0.04] lg:hidden"
              >
                <Menu className="size-4" />
              </Button>
              <span className="text-sm font-medium">{mode === "agent" ? "Agent" : "Ask"}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={goLogin}
              className="h-8 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs"
            >
              Chiqish
            </Button>
          </div>

          {error ? (
            <div className="border-b border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
              {error}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 p-3">
            {mode === "ask" ? (
              askResources.length > 0 ? (
                <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
                  {chatPanel}
                  <div className="panel-card sources-panel min-h-0 rounded-2xl">
                    <div className="border-b border-white/10 px-4 py-3 text-sm text-slate-200">Resources</div>
                    <ScrollArea className="h-[calc(100%-45px)]">
                      <div className="space-y-2 p-3">
                        {askResources.map((source, index) => (
                          <a
                            key={`${source.url}-${index}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]"
                          >
                            <p className="text-sm text-cyan-300">{source.title}</p>
                            <p className="mt-1 truncate text-[11px] text-slate-400">{source.url}</p>
                            {source.snippet ? (
                              <p className="mt-2 line-clamp-3 text-xs text-slate-300">{source.snippet}</p>
                            ) : null}
                          </a>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-0">{chatPanel}</div>
              )
            ) : (
              <>
                <div ref={splitRootRef} className="hidden h-full min-h-0 w-full lg:flex">
                  <div className="min-h-0" style={{ width: `${agentSplit}%` }}>
                    {chatPanel}
                  </div>

                  <button
                    type="button"
                    aria-label="Resize panels"
                    onMouseDown={() => setResizing(true)}
                    className={cn(
                      "splitter-handle mx-1 my-2 w-3 cursor-col-resize rounded-full transition",
                      resizing
                        ? "bg-cyan-400/25 ring-1 ring-cyan-300/50"
                        : "bg-white/8 hover:bg-cyan-400/18"
                    )}
                  >
                    <GripVertical className="size-3.5 text-slate-300/75" />
                  </button>

                  <div className="min-h-0 flex-1">
                    <div className="panel-card flex h-full min-h-0 flex-col rounded-2xl">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div className="inline-flex items-center gap-2 text-sm text-slate-200">
                          <TerminalSquare className="size-4 text-cyan-300" />
                          Terminal
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            seenCommandsRef.current.clear()
                            setTerminalLogs([])
                          }}
                          className="h-7 rounded-md border border-white/10 bg-white/[0.03] px-2 text-xs"
                        >
                          Tozalash
                        </Button>
                      </div>

                      <ScrollArea className="min-h-0 flex-1 p-3">
                        <div className="space-y-1 font-mono text-xs text-slate-300">
                          {terminalLogs.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-3 text-[11px] text-slate-500">
                              Agent commandlari shu yerda chiqadi.
                            </div>
                          ) : (
                            terminalLogs.map((line, index) => (
                              <div key={`${line}-${index}`} className="terminal-line">
                                {line}
                              </div>
                            ))
                          )}
                          <div ref={terminalEndRef} />
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </div>
                <div className="flex h-full min-h-0 flex-col gap-3 lg:hidden">
                  {chatPanel}
                  <div className="panel-card min-h-[220px] rounded-2xl">
                    <div className="border-b border-white/10 px-4 py-3 text-sm text-slate-200">Terminal</div>
                    <ScrollArea className="h-[calc(100%-45px)] p-3">
                      <div className="space-y-1 font-mono text-xs text-slate-300">
                        {terminalLogs.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] p-3 text-[11px] text-slate-500">
                            Agent commandlari shu yerda chiqadi.
                          </div>
                        ) : (
                          terminalLogs.map((line, index) => (
                            <div key={`${line}-${index}`} className="terminal-line">
                              {line}
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="close"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute left-0 top-0 z-50 h-full w-[290px] border-r border-white/10 bg-[#141c3c]">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
              <span className="text-sm font-semibold">Sessiyalar</span>
              <Button
                type="button"
                size="icon-sm"
                onClick={() => void createSession()}
                className="rounded-lg bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30"
              >
                <Plus className="size-4" />
              </Button>
            </div>

            <div className="px-3 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={sessionQuery}
                  onChange={(event) => setSessionQuery(event.target.value)}
                  placeholder="Sessiya qidirish"
                  className="h-9 rounded-xl border-white/15 bg-white/[0.04] pl-9 text-slate-100"
                />
              </div>
            </div>

            <ScrollArea className="h-[calc(100%-106px)] px-3 pb-3">
              <div className="space-y-2 pr-1">
                {filteredSessions.map((session) => (
                  <button
                    key={session.session_id}
                    type="button"
                    onClick={() => {
                      setSessionId(session.session_id)
                      setSidebarOpen(false)
                    }}
                    className={cn(
                      "w-full rounded-xl border p-2.5 text-left",
                      session.session_id === sessionId
                        ? "border-cyan-400/40 bg-cyan-500/12"
                        : "border-white/10 bg-white/[0.03]"
                    )}
                  >
                    <p className="truncate text-sm text-slate-100">
                      {session.chat_name || "Yangi suhbat"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{session.chat_count} xabar</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      ) : null}
    </div>
  )
}

