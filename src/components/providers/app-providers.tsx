"use client"

import { AuthProvider } from "@/hooks/use-auth"
import { LoggerProvider } from "@/hooks/use-logger"
import { ImageCacheProvider } from "@/hooks/use-image-cache"
import type { ReactNode } from "react"

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <LoggerProvider>
      <ImageCacheProvider>
        <AuthProvider>{children}</AuthProvider>
      </ImageCacheProvider>
    </LoggerProvider>
  )
}
