import type { Anime, ListData } from "../../types"
import type { LogEntry } from "@/hooks/use-logger"
import { PAGINATED_LIST_QUERY, MANGA_STATUS_QUERY } from "../queries"
import { get } from "../../idb-keyval"
import { genres_list } from "@/i18n"
import { SENSITIVE_GENRES } from "@/lib/config"
import { getAnimeStaff, getAnimeReviews, getAnimeRecommendations } from "./anime"
import { getMangaCharacters } from "./characters"
import { fetchAniList, mapAniListMediaToAnime } from "../utils"
import type { AniListMedia } from "../../types"

/**
 * Helper function to ensure a value is a valid array of strings
 */
function ensureStringArray(value: any): string[] {
  if (!value) return []
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === "string")
}

async function getHiddenGenres(listData?: ListData | null): Promise<{ genres: string[]; tags: string[] }> {
  const SENSITIVE_GENRES_INTERNAL = SENSITIVE_GENRES
  let finalHidden: string[] = SENSITIVE_GENRES_INTERNAL
  let data = listData

  try {
    if (!data) {
      data = await get<ListData>("animesync_local_list_data")
    }

    if (data) {
      // Ensure userHidden is a valid string array
      const userHidden = ensureStringArray(data.hiddenGenres)
      if (data.sensitiveContentUnlocked) {
        finalHidden = userHidden
      } else {
        finalHidden = Array.from(new Set([...SENSITIVE_GENRES_INTERNAL, ...userHidden]))
      }
    }
  } catch (e) {
    console.error("Could not get hidden genres from IDB, defaulting to SENSITIVE_GENRES", e)
  }

  // Defensive check: ensure finalHidden is a valid array
  finalHidden = ensureStringArray(finalHidden)

  const allGenreNames = new Set(genres_list.map((g) => g.name))
  const validHidden = finalHidden.filter((g) => typeof g === "string" && allGenreNames.has(g as any))

  const hiddenGenres = validHidden.filter((name) => genres_list.find((g) => g.name === name)?.type === "genre")
  const hiddenTags = validHidden.filter((name) => genres_list.find((g) => g.name === name)?.type === "tag")

  return { genres: hiddenGenres, tags: hiddenTags }
}

async function fetchAniListPaginated(
  query: string,
  variables: Record<string, any>,
  hidden: { genres: string[]; tags: string[] },
  addLog: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<{ data: Anime[]; hasNextPage: boolean }> {
  const finalVariables = {
    ...variables,
    genre_not_in: hidden.genres,
    tag_not_in: hidden.tags,
  }
  const response = await fetchAniList<{ Page: { media: AniListMedia[]; pageInfo: { hasNextPage: boolean } } }>(
    query,
    finalVariables,
    addLog,
  )
  return {
    data: response?.Page?.media.map(mapAniListMediaToAnime) || [],
    hasNextPage: response?.Page?.pageInfo?.hasNextPage || false,
  }
}

async function paginatedRequest(
  query: string,
  variables: any,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) {
  const listData = await get<ListData>("animesync_local_list_data")
  const hidden = await getHiddenGenres(listData)
  return fetchAniListPaginated(query, variables, hidden, addLog || (() => {}))
}

export const getTrendingManga = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) => paginatedRequest(PAGINATED_LIST_QUERY, { page, perPage, sort: ["TRENDING_DESC"], type: "MANGA" }, addLog)

export const getPopularManga = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) => paginatedRequest(PAGINATED_LIST_QUERY, { page, perPage, sort: ["POPULARITY_DESC"], type: "MANGA" }, addLog)

export const getTopManga = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) => paginatedRequest(PAGINATED_LIST_QUERY, { page, perPage, sort: ["SCORE_DESC"], type: "MANGA" }, addLog)

export const getReleasingManga = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) => paginatedRequest(MANGA_STATUS_QUERY, { page, perPage, type: "MANGA", status: "RELEASING" }, addLog)

export const getUpcomingManga = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) => paginatedRequest(MANGA_STATUS_QUERY, { page, perPage, type: "MANGA", status: "NOT_YET_RELEASED" }, addLog)

export const getMangaStaff = getAnimeStaff
export const getMangaReviews = getAnimeReviews
export const getMangaRecommendations = getAnimeRecommendations
export { getMangaCharacters }
