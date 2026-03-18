import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { RegisterForm } from "@/components/auth/register-form"

export default async function RegisterPage() {
  const token = (await cookies()).get("session_token")?.value
  if (token) {
    redirect("/chat")
  }

  return <RegisterForm />
}
