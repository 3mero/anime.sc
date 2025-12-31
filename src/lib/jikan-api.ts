import type { JikanCharacter, JikanNewsArticle } from "./types"

const JIKAN_BASE_URL = "https://api.jikan.moe/v4"

// Rate limiting helper
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 350 // 350ms between requests

async function rateLimit() {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }
  lastRequestTime = Date.now()
}

export async function getAnimeCharactersFromJikan(malId: number): Promise<JikanCharacter[]> {
  try {
    await rateLimit()

    const response = await fetch(`${JIKAN_BASE_URL}/anime/${malId}/characters`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Error fetching characters from Jikan:", error)
    return []
  }
}

export async function getAnimeNewsFromJikan(malId: number): Promise<JikanNewsArticle[]> {
  try {
    await rateLimit()

    const response = await fetch(`${JIKAN_BASE_URL}/anime/${malId}/news`, {
      next: { revalidate: 1800 }, // Cache for 30 minutes
    })

    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Error fetching news from Jikan:", error)
    return []
  }
}

export async function getMangaNewsFromJikan(malId: number): Promise<JikanNewsArticle[]> {
  try {
    await rateLimit()

    const response = await fetch(`${JIKAN_BASE_URL}/manga/${malId}/news`, {
      next: { revalidate: 1800 }, // Cache for 30 minutes
    })

    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Error fetching manga news from Jikan:", error)
    return []
  }
}

export async function getLatestAnimeNews(): Promise<JikanNewsArticle[]> {
  try {
    // First, get top airing anime
    await rateLimit()
    const airingResponse = await fetch(`${JIKAN_BASE_URL}/top/anime?filter=airing&limit=10`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!airingResponse.ok) {
      throw new Error(`Jikan API error: ${airingResponse.status}`)
    }

    const airingData = await airingResponse.json()
    const topAnime = airingData.data || []

    // Fetch news from multiple anime
    const newsPromises = topAnime.slice(0, 5).map(async (anime: any) => {
      try {
        await rateLimit()
        const newsResponse = await fetch(`${JIKAN_BASE_URL}/anime/${anime.mal_id}/news`, {
          next: { revalidate: 600 }, // Cache for 10 minutes
        })

        if (!newsResponse.ok) return []

        const newsData = await newsResponse.json()
        return (newsData.data || []).map((article: any) => ({
          ...article,
          anime_title: anime.title,
          anime_image: anime.images?.jpg?.image_url || anime.images?.jpg?.large_image_url,
        }))
      } catch (error) {
        console.error(`Error fetching news for anime ${anime.mal_id}:`, error)
        return []
      }
    })

    const allNews = await Promise.all(newsPromises)
    const flatNews = allNews.flat()

    // Sort by date (newest first)
    return flatNews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  } catch (error) {
    console.error("Error fetching latest news from Jikan:", error)
    return []
  }
}

export async function searchAnimeByTitle(query: string): Promise<any[]> {
  try {
    await rateLimit()

    const response = await fetch(`${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=10`, {
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Error searching anime:", error)
    return []
  }
}

export async function getPersonDetails(personId: number): Promise<any> {
  try {
    await rateLimit()

    const response = await fetch(`${JIKAN_BASE_URL}/people/${personId}/full`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data || null
  } catch (error) {
    console.error("Error fetching person details from Jikan:", error)
    return null
  }
}

export async function getPersonPictures(personId: number): Promise<any[]> {
  try {
    await rateLimit()

    const response = await fetch(`${JIKAN_BASE_URL}/people/${personId}/pictures`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Error fetching person pictures from Jikan:", error)
    return []
  }
}
