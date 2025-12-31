// Simple persistent image cache using IndexedDB
const DB_NAME = "anime-image-cache"
const STORE_NAME = "images"
const DB_VERSION = 1

// Open or create the database
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

// Get cached image
export async function getCachedImage(url: string): Promise<string | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(url)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error("[v0] Error getting cached image:", error)
    return null
  }
}

// Cache image
export async function cacheImage(url: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(dataUrl, url)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error("[v0] Error caching image:", error)
  }
}

// Convert image URL to data URL
export async function imageUrlToDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Failed to get canvas context"))
        return
      }

      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL("image/jpeg", 0.8))
    }

    img.onerror = () => reject(new Error("Failed to load image"))
    img.src = url
  })
}

// Clear old cache entries (optional cleanup)
export async function clearOldCache(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
  try {
    const db = await openDB()
    // Implementation for clearing old entries can be added here if needed
  } catch (error) {
    console.error("[v0] Error clearing cache:", error)
  }
}
