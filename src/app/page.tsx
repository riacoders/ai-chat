import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const token = (await cookies()).get("session_token")?.value
  redirect(token ? "/chat" : "/login")
}
