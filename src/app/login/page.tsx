import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage() {
  const token = (await cookies()).get("session_token")?.value
  if (token) {
    redirect("/chat")
  }

  return <LoginForm />
}
