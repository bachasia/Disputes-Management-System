import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { Toaster } from "sonner"

// Optimize font loading
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: "PayPal Disputes Dashboard",
  description: "Manage PayPal disputes across multiple accounts",
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}


