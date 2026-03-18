import Cookies from "js-cookie"

const TOKEN_KEY = "session_token"

function hasWindow() {
  return typeof window !== "undefined"
}

export function getSessionToken() {
  if (!hasWindow()) return null
  const fromLocal = window.localStorage.getItem(TOKEN_KEY)
  if (fromLocal) return fromLocal
  return Cookies.get(TOKEN_KEY) || null
}

export function setSessionToken(token: string) {
  if (!hasWindow()) return
  window.localStorage.setItem(TOKEN_KEY, token)
  Cookies.set(TOKEN_KEY, token, { sameSite: "lax", expires: 7 })
}

export function clearSessionToken() {
  if (!hasWindow()) return
  window.localStorage.removeItem(TOKEN_KEY)
  Cookies.remove(TOKEN_KEY)
}
