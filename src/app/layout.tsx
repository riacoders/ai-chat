import type { Metadata } from "next"
import { Space_Grotesk } from "next/font/google"
import type { ReactNode } from "react"
import { Toaster } from "sonner"

import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "SecGPT Chat",
  description: "SecGPT Next.js chat interface",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} antialiased`}>
        {children}
        <Toaster richColors theme="dark" position="top-center" />
      </body>
    </html>
  )
}
