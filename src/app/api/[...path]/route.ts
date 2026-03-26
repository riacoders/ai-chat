import { NextRequest } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const backendUrl =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_VITE_APP_BASE_URL ||
  "http://localhost:8000"

const normalizedBackendUrl = backendUrl.replace(/\/$/, "")
const hopByHopHeaders = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
])

type RouteContext = {
  params: Promise<{ path: string[] }> | { path: string[] }
}

function buildTargetUrl(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join("/")
  const target = new URL(path, `${normalizedBackendUrl}/`)
  target.search = request.nextUrl.search
  return target.toString()
}

function copyResponseHeaders(source: Headers) {
  const headers = new Headers()
  source.forEach((value, key) => {
    if (!hopByHopHeaders.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })
  return headers
}

function toProxyErrorDetail(error: unknown, targetUrl: string) {
  if (!(error instanceof Error)) {
    return "Backendga ulanib bo'lmadi."
  }

  const cause =
    "cause" in error && error.cause && typeof error.cause === "object"
      ? (error.cause as Record<string, unknown>)
      : null
  const causeCode =
    cause && typeof cause.code === "string" ? cause.code : undefined
  const causeMessage =
    cause && typeof cause.message === "string" ? cause.message : undefined

  if (causeCode === "UND_ERR_CONNECT_TIMEOUT") {
    return `Backendga ulanishda timeout: ${targetUrl}`
  }

  if (causeCode === "ECONNREFUSED") {
    return `Backend ulanishni rad etdi: ${targetUrl}`
  }

  if (causeCode && causeMessage) {
    return `Backend xatosi (${causeCode}): ${causeMessage}`
  }

  return causeMessage || error.message || "Backendga ulanib bo'lmadi."
}

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await Promise.resolve(context.params)
  const targetUrl = buildTargetUrl(request, path || [])

  const headers = new Headers(request.headers)
  headers.delete("host")
  headers.delete("connection")
  headers.delete("content-length")

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body
    init.duplex = "half"
  }

  try {
    const upstream = await fetch(targetUrl, init)
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: copyResponseHeaders(upstream.headers),
    })
  } catch (error) {
    console.error(`[api-proxy] ${request.method} ${targetUrl} failed`, error)
    return Response.json(
      {
        detail: toProxyErrorDetail(error, targetUrl),
      },
      { status: 502 }
    )
  }
}

export function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}

export function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}

export function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}

export function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}

export function HEAD(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context)
}
