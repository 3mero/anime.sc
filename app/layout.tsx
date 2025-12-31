import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { AppProviders } from "@/components/providers/app-providers"
import { Toaster } from "@/components/ui/toaster"
import { ClientLayout } from "@/components/layout/client-layout"
import { LanguageProvider } from "@/hooks/use-translation"
import { Inter, Space_Grotesk } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "AnimeSync",
  description: "Your World of Anime, Synced.",
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-dark-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        <LanguageProvider>
          <AppProviders>
            <ClientLayout>{children}</ClientLayout>
            <Toaster />
          </AppProviders>
        </LanguageProvider>
      </body>
    </html>
  )
}
