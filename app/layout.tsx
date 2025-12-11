import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { RoleProvider } from "@/lib/role-context"
import { ThemeProvider } from "@/components/theme-provider"
import { FloatingChatProvider } from "@/components/ai/floating-chat-context"
import { FloatingChatBubble } from "@/components/ai/floating-chat-bubble"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Bank of the Future | AI-Powered Digital Banking",
  description:
    "Experience the future of banking with AI-enhanced digital services, personalized insights, and intelligent financial management.",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          storageKey="bank-of-the-future-theme"
        >
          <RoleProvider>
            <FloatingChatProvider>
              {children}
              <FloatingChatBubble />
            </FloatingChatProvider>
          </RoleProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
