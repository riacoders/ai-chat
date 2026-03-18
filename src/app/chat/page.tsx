import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { NextChatApp } from "@/components/chat/next-chat-app"

export default async function ChatPage() {
  const token = (await cookies()).get("session_token")?.value
  if (!token) {
    redirect("/login")
  }

  return <NextChatApp />
}
