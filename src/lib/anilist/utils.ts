import type { Anime, AniListMedia, JikanRelation } from "@/lib/types"
import type { LogEntry } from "@/hooks/use-logger"
import { genres_list } from "@/i18n"

export const ANILIST_API_URL = "https://graphql.anilist.co"
export const JIKAN_API_URL = "https://api.jikan.moe/v4"

// Keep track of active requests to prevent duplicates
type PendingRequest<T> = {
  promise: Promise<T | null>
  timestamp: number
}

const pendingRequests = new Map<string, PendingRequest<any>>()
const CACHE_DURATION = 5000 // 5 seconds - requests with same params within this time are deduplicated

// Simple hash function for strings
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

// Helper to create a unique key for a request
function getRequestKey(query: string, variables: Record<string, any>): string {
  // Sort variables keys to ensure consistent ordering
  const sortedVariables = Object.keys(variables).sort().reduce((acc, key) => {
    acc[key] = variables[key]
    return acc
  }, {} as Record<string, any>)
  
  const queryHash = simpleHash(query)
  const variablesStr = JSON.stringify(sortedVariables)
  return `${queryHash}_${variablesStr}`
}

// Rate limiting queue
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private lastRequestTime = 0
  private readonly minDelay = 2000 // Increased to 2000ms for maximum safety

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      if (!this.processing) {
        this.processQueue()
      }
    })
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true
    const fn = this.queue.shift()

    if (fn) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise((resolve) => setTimeout(resolve, this.minDelay - timeSinceLastRequest))
      }

      this.lastRequestTime = Date.now()
      await fn()
    }

    // Process next item
    this.processQueue()
  }
}

const globalAniListQueue = new RequestQueue()

export async function fetchAniList<T>(
  query: string,
  variables: Record<string, any> = {},
  addLog: (message: string, type?: LogEntry["type"], details?: any) => void,
  operationName?: string,
): Promise<T | null> {
  const effectiveLog = addLog || (() => {})
  
  // Check if we have a pending request with the same parameters
  const requestKey = getRequestKey(query, variables)
  const now = Date.now()
  
  // Clean up old cached requests
  for (const [key, pending] of pendingRequests.entries()) {
    if (now - pending.timestamp > CACHE_DURATION) {
      pendingRequests.delete(key)
    }
  }
  
  // If we have a pending request with same params, return that promise
  const existing = pendingRequests.get(requestKey)
  if (existing) {
    effectiveLog(`[Dedup] Reusing existing request for ${operationName || 'query'}`, "info")
    return existing.promise as Promise<T | null>
  }
  
  // Create new request
  const requestPromise = globalAniListQueue.add(async () => {
    const MAX_RETRIES = 2 // Client-side retries (API route also has retries)
    let lastError: any = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch("/api/anilist/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            query,
            variables,
          }),
          cache: "no-store",
        })

        if (!response.ok) {
          const errorBody = await response.text()
          
          // If still rate limited after API retries, wait longer before client retry
          if (response.status === 429 && attempt < MAX_RETRIES) {
            const backoffDelay = Math.pow(2, attempt) * 2000 // 2s, 4s
            effectiveLog(
              `Rate limit encountered, retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`,
              "warn",
              { query, variables }
            )
            await new Promise((resolve) => setTimeout(resolve, backoffDelay))
            continue
          }

          // Enhanced error logging for 500 errors with query details
          const errorMessage = `AniList API request failed: ${response.status} ${errorBody}`
          const errorDetails: any = { 
            status: response.status,
            attempts: attempt + 1,
            errorBody
          }
          
          // For 500 errors, log the variables to help debug malformed requests
          if (response.status === 500) {
            errorDetails.variables = variables
            errorDetails.operationName = operationName
            effectiveLog(
              `[500 Error] Possible malformed request - check variables`,
              "error",
              errorDetails
            )
          } else {
            effectiveLog(errorMessage, "error", { query, variables, attempts: attempt + 1 })
          }
          
          // Remove from pending and return null
          pendingRequests.delete(requestKey)
          return null
        }

        const jsonResponse = await response.json()

        if (jsonResponse.errors) {
          const errorMsg = `GraphQL Error: ${jsonResponse.errors.map((e: any) => e.message).join(", ")}`
          effectiveLog(errorMsg, "error", jsonResponse.errors)
          lastError = errorMsg
          continue
        }

        if (attempt > 0) {
          effectiveLog(`Request succeeded after ${attempt} client-side retries`, "info")
        }

        // Success - remove from pending and return  
        pendingRequests.delete(requestKey)
        return jsonResponse.data as T
      } catch (error) {
        lastError = error

        // If error is not network-related or this is the last attempt, throw
        if (attempt < MAX_RETRIES) {
          const backoffDelay = Math.pow(2, attempt) * 1000
          effectiveLog(
            `Request error, retrying in ${backoffDelay}ms: ${(error as Error).message}`,
            "warn"
          )
          await new Promise((resolve) => setTimeout(resolve, backoffDelay))
        }
      }
    }

    // If we get here,all retries failed
    const finalError = lastError instanceof Error ? lastError.message : String(lastError)
    effectiveLog(`AniList request failed after ${MAX_RETRIES + 1} attempts: ${finalError}`, "error")
    
    // Remove from pending
    pendingRequests.delete(requestKey)
    return null
  })
  
  // Cache the promise
  pendingRequests.set(requestKey, {
    promise: requestPromise,
    timestamp: now
  })
  
  return requestPromise
}

export async function jikanApiRequest(
  endpoint: string,
  addLog: (message: string, type?: LogEntry["type"], details?: any) => void,
  params?: URLSearchParams,
): Promise<any> {
  const url = new URL(`${JIKAN_API_URL}${endpoint}`)
  if (params) {
    url.search = params.toString()
  }

  addLog(`Jikan Request: ${endpoint}`, "network", { url: url.toString() })

  await new Promise((resolve) => setTimeout(resolve, 500)) // Increased delay

  try {
    const response = await fetch(url.toString())

    if (!response.ok) {
      const errorBody = await response.text()
      let jsonError = {}
      try {
        jsonError = JSON.parse(errorBody)
      } catch (e) {
        // Ignore if not json
      }
      const error = new Error(
        JSON.stringify({
          status: response.status,
          message: `Jikan API responded with status ${response.status}`,
          details: jsonError,
        }),
      )
      addLog(`Jikan Failure: ${endpoint}: ${error.message}`, "error", { url: url.toString() })
      throw error
    }

    const json = await response.json()
    addLog(`Jikan Success: ${endpoint}`, "info", { url: url.toString(), status: response.status })
    return json
  } catch (error: any) {
    addLog(`Jikan Failure: ${endpoint}: ${error.message}`, "error", { url: url.toString() })
    throw error
  }
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return ""
  return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "")
}

export function mapJikanMediaToAnime(media: any, relationType?: string): Anime {
  const malId = media.mal_id
  const anilistId = media.mal_id

  const genres = media.genres?.map((g: any) => ({ ...g, type: "genre" as const })) || []
  const themes = media.themes?.map((t: any) => ({ ...t, type: "tag" as const })) || []
  const demographics = media.demographics?.map((d: any) => ({ ...d, type: "tag" as const })) || []

  const base: Omit<Anime, "synopsis"> & { synopsis?: string } = {
    id: anilistId,
    mal_id: malId,
    title: media.title || media.name || "Unknown Title",
    images: {
      jpg: {
        image_url: media.images?.jpg?.image_url || "",
        small_image_url: media.images?.jpg?.small_image_url || "",
        large_image_url: media.images?.jpg?.large_image_url || "",
      },
      webp: {
        image_url: media.images?.webp?.image_url || "",
        small_image_url: media.images?.webp?.small_image_url || "",
        large_image_url: media.images?.webp?.large_image_url || "",
      },
    },
    type: media.type || "UNKNOWN",
    url: media.url || "",
    trailer: media.trailer
      ? {
          youtube_id: media.trailer.youtube_id,
          url: media.trailer.url,
          embed_url: media.trailer.embed_url,
        }
      : { youtube_id: null, url: null, embed_url: null },
    title_english: media.title_english,
    title_japanese: media.title_japanese,
    format: media.type,
    source: media.source || "",
    episodes: media.episodes,
    chapters: media.chapters,
    volumes: media.volumes,
    status: media.status || "",
    airing: media.airing || false,
    score: media.score,
    scored_by: media.scored_by,
    rank: media.rank,
    popularity: media.popularity,
    year: media.year,
    broadcast: media.broadcast || { day: null, time: null, timezone: null, string: null },
    rating: media.rating,
    genres: [...genres, ...themes, ...demographics],
    studios: media.studios || [],
    relations: media.relations || [],
    authors: media.authors || [],
    relationType,
  }

  if (media.synopsis) {
    base.synopsis = media.synopsis
  }

  return base as Anime
}

export function mapAniListMediaToAnime(media: AniListMedia & { relationType?: string }): Anime {
  let year = media.seasonYear
  if (!year && media.startDate?.year) {
    year = media.startDate.year
  }

  const relations: JikanRelation[] =
    media.relations?.edges?.map((edge) => ({
      relation: edge.relationType,
      entry: [
        {
          mal_id: edge.node.idMal,
          type: edge.node.type,
          name: edge.node.title.romaji || edge.node.title.english || "",
          url: `https://anilist.co/${edge.node.type.toLowerCase()}/${edge.node.id}`,
        },
      ],
    })) || []

  const genres =
    media.genres
      ?.map((name) => {
        const genreData = genres_list.find((g) => g.name === name && g.type === "genre")
        return { mal_id: genreData?.mal_id || 0, name, type: "genre" as const, url: "" }
      })
      .filter((g) => g.mal_id !== 0) || []

  const tags =
    media.tags
      ?.map((tag) => {
        const genreData = genres_list.find((g) => g.name === tag.name && g.type === "tag")
        return { mal_id: genreData?.mal_id || tag.id, name: tag.name, type: "tag" as const, url: "" }
      })
      .filter((t) => t.mal_id !== 0) || []

  const combinedGenres = [...genres, ...tags]

  let rating: string | null = null
  if (media.isAdult) {
    rating = "Rx - Hentai"
  } else {
    // Map based on format - this provides a better estimate
    switch (media.format) {
      case "TV":
      case "TV_SHORT":
        rating = "PG-13 - Teens 13 or older"
        break
      case "MOVIE":
      case "SPECIAL":
        rating = "PG - Children"
        break
      case "OVA":
      case "ONA":
        rating = "R - 17+ (violence & profanity)"
        break
      default:
        rating = "PG-13 - Teens 13 or older"
    }
  }

  const anime: Omit<Anime, "synopsis"> & { synopsis?: string } = {
    mal_id: media.idMal,
    id: media.id, // AniList ID
    url: `https://anilist.co/${media.type.toLowerCase()}/${media.id}`,
    images: {
      jpg: {
        image_url: media.coverImage?.large || "",
        small_image_url: media.coverImage?.large || "",
        large_image_url: media.coverImage?.extraLarge || media.coverImage?.large || "",
      },
      webp: {
        image_url: media.coverImage?.large || "",
        small_image_url: media.coverImage?.large || "",
        large_image_url: media.coverImage?.extraLarge || media.coverImage?.large || "",
      },
    },
    trailer: {
      youtube_id: media.trailer?.site === "youtube" ? media.trailer.id : null,
      url: media.trailer?.site === "youtube" ? `https://youtube.com/watch?v=${media.trailer.id}` : null,
      embed_url: media.trailer?.site === "youtube" ? `https://youtube.com/embed/${media.trailer.id}` : null,
    },
    title: media.title.romaji || media.title.english || "",
    title_english: media.title.english,
    title_japanese: media.title.native,
    type: media.type, // ANIME or MANGA
    format: media.format,
    source: media.source || "Unknown", // provide default for undefined source
    episodes: media.episodes, // For Anime
    nextAiringEpisode: media.nextAiringEpisode,
    chapters: media.chapters, // For Manga
    volumes: media.volumes, // For Manga
    status: media.status,
    airing: media.status === "RELEASING",
    score: media.averageScore ? media.averageScore / 10 : null,
    scored_by: media.popularity, // Using popularity as a stand-in as scored_by is not in basic query
    rank: media.rankings?.find((r) => r.allTime)?.rank || null,
    popularity: media.popularity,
    year: year,
    startDate: media.startDate,
    broadcast: {
      day: media.broadcast?.day || null,
      time: media.broadcast?.time || null,
      timezone: null,
      string: null,
    },
    rating: rating, // Now provides more accurate ratings based on format
    genres: combinedGenres,
    studios:
      media.studios?.nodes?.map((studio) => ({ mal_id: studio.id, name: studio.name, type: "studio", url: "" })) || [],
    relations: relations,
    relationType: media.relationType,
    authors:
      media.staff?.edges
        .filter((edge) => edge.role === "Story & Art" || edge.role === "Story")
        .map((edge) => ({
          mal_id: edge.node.id,
          name: edge.node.name.full,
          url: `https://anilist.co/staff/${edge.node.id}`,
          images: { jpg: { image_url: edge.node.image.large } },
        })) || [],
  }

  if (media.description) {
    anime.synopsis = stripHtml(media.description)
  }

  return anime as Anime
}

export function deduplicateAnime(animes: Anime[]): Anime[] {
  if (!animes || animes.length === 0) {
    return []
  }
  const seen = new Map<number, boolean>()
  const result: Anime[] = []
  for (const anime of animes) {
    if (anime && anime.id && !seen.has(anime.id)) {
      seen.set(anime.id, true)
      result.push(anime)
    }
  }
  return result
}
