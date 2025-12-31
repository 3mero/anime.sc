"use client"

import { createContext, useContext, useCallback, type ReactNode } from "react"

interface ImageCacheContextType {
  getImage: (url: string) => string
  preloadImages: (urls: string[]) => void
}

const ImageCacheContext = createContext<ImageCacheContextType | undefined>(undefined)

// Simple passthrough - rely on browser cache and Next.js image optimization
export function ImageCacheProvider({ children }: { children: ReactNode }) {
  const getImage = useCallback((url: string): string => {
    // Simply return the original URL
    // Next.js Image component will handle caching
    return url
  }, [])

  const preloadImages = useCallback((urls: string[]) => {
    // Preload images using link preload
    urls.forEach((url) => {
      if (url && typeof window !== "undefined") {
        const link = document.createElement("link")
        link.rel = "preload"
        link.as = "image"
        link.href = url
        document.head.appendChild(link)
      }
    })
  }, [])

  const value = { getImage, preloadImages }

  return <ImageCacheContext.Provider value={value}>{children}</ImageCacheContext.Provider>
}

export function useImageCache() {
  const context = useContext(ImageCacheContext)
  if (context === undefined) {
    throw new Error("useImageCache must be used within an ImageCacheProvider")
  }
  return context
}
