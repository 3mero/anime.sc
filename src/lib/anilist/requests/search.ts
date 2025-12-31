import type { Anime, AniListMedia, ListData, JikanGenre } from "../../types"
import type { LogEntry } from "@/hooks/use-logger"
import { SEARCH_QUERY, MEDIA_RELATIONS_QUERY, SEASON_MEDIA_QUERY, SEASONS_QUERY, MEDIA_COUNTS_QUERY } from "../queries"
import { fetchAniList, mapAniListMediaToAnime, jikanApiRequest } from "../utils"
import { get } from "../../idb-keyval"
import { genres_list } from "@/i18n"
import { SENSITIVE_GENRES } from "@/lib/config"

async function getHiddenGenres(listData?: ListData | null): Promise<{ genres: string[]; tags: string[] }> {
  const SENSITIVE_GENRES_INTERNAL = SENSITIVE_GENRES
  let finalHidden: string[] = SENSITIVE_GENRES_INTERNAL
  let data = listData

  try {
    if (!data) {
      data = await get<ListData>("animesync_local_list_data")
    }

    if (data) {
      const userHidden = data.hiddenGenres || []
      if (data.sensitiveContentUnlocked) {
        finalHidden = userHidden
      } else {
        finalHidden = Array.from(new Set([...SENSITIVE_GENRES_INTERNAL, ...userHidden]))
      }
    }
  } catch (e) {
    console.error("Could not get hidden genres from IDB, defaulting to SENSITIVE_GENRES", e)
  }

  const allGenreNames = new Set(genres_list.map((g) => g.name))
  const validHidden = (finalHidden as any[]).filter((g) => allGenreNames.has(g))

  const hiddenGenres = validHidden.filter((name) => genres_list.find((g) => g.name === name)?.type === "genre")
  const hiddenTags = validHidden.filter((name) => genres_list.find((g) => g.name === name)?.type === "tag")

  return { genres: hiddenGenres, tags: hiddenTags }
}

export async function searchMediaGraphQL(
  variables: any,
  addLog: (message: string, type?: LogEntry["type"], details?: any) => void,
) {
  const effectiveLog = addLog || (() => {})
  const listData = await get<ListData>("animesync_local_list_data")
  const hidden = await getHiddenGenres(listData)
  const finalVariables = {
    ...variables,
    isAdult: false,
    genre_not_in: hidden.genres,
    tag_not_in: hidden.tags,
  }

  try {
    const response = await fetchAniList<{
      Page: { media: AniListMedia[]; pageInfo: { hasNextPage: boolean; currentPage: number } }
    }>(SEARCH_QUERY, finalVariables, effectiveLog, "Search")

    return {
      media: response?.Page?.media || [],
      pageInfo: {
        ...response?.Page?.pageInfo,
        hasNextPage: response?.Page?.pageInfo.hasNextPage || false,
      },
    }
  } catch (error) {
    effectiveLog(`AniList search failed: ${(error as Error).message}`, "error", { variables })
    throw error
  }
}

export async function getMediaBySeason(
  year: number,
  season: string,
  page: number,
  perPage: number,
  filter: string,
  addLog: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<{ data: Anime[]; hasNextPage: boolean }> {
  const listData = await get<ListData>("animesync_local_list_data")
  const hidden = await getHiddenGenres(listData)
  const variables: any = {
    page,
    perPage,
    season: season.toUpperCase(),
    seasonYear: year,
    type: "ANIME",
    genre_not_in: hidden.genres,
    tag_not_in: hidden.tags,
  }
  if (filter && filter !== "all") {
    variables.format_in = [filter.toUpperCase()]
  }
  const response = await fetchAniList<{ Page: { media: AniListMedia[]; pageInfo: { hasNextPage: boolean } } }>(
    SEASON_MEDIA_QUERY,
    variables,
    addLog,
  )
  return {
    data: response?.Page?.media.map(mapAniListMediaToAnime) || [],
    hasNextPage: response?.Page?.pageInfo.hasNextPage || false,
  }
}

export async function getSeasonsList(
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<any[]> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ SeasonList: { media: { season: string; seasonYear: number }[] } }>(
      SEASONS_QUERY,
      {},
      effectiveLog,
    )
    const seasonsMap = new Map<number, Set<string>>()
    response?.SeasonList?.media.forEach((item) => {
      if (item.seasonYear && item.season) {
        if (!seasonsMap.has(item.seasonYear)) {
          seasonsMap.set(item.seasonYear, new Set())
        }
        seasonsMap.get(item.seasonYear)?.add(item.season.toLowerCase())
      }
    })

    return Array.from(seasonsMap.entries())
      .map(([year, seasons]) => ({ year, seasons: Array.from(seasons) }))
      .sort((a, b) => b.year - a.year)
  } catch (e) {
    if (addLog) addLog(`Failed to fetch seasons list: ${(e as Error).message}`, "warn")
    return []
  }
}

export async function getMediaRelations(
  anilistId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<Anime[]> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ Media: { relations: { edges: any[] } } }>(
      MEDIA_RELATIONS_QUERY,
      { id: anilistId },
      effectiveLog,
    )
    return (
      response?.Media?.relations.edges.map((edge) =>
        mapAniListMediaToAnime({ ...edge.node, relationType: edge.relationType }),
      ) || []
    )
  } catch (error) {
    effectiveLog(`Failed to get media relations for AniList ID ${anilistId}`, "warn")
    return []
  }
}

export async function getLatestMediaCounts(
  mediaIds: number[],
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<Map<number, { episodes: number | null; chapters: number | null; volumes: number | null }>> {
  const effectiveLog = addLog || (() => {})
  const countsMap = new Map<number, { episodes: number | null; chapters: number | null; volumes: number | null }>()
  if (mediaIds.length === 0) return countsMap

  try {
    const response = await fetchAniList<{ Page: { media: any[] } }>(MEDIA_COUNTS_QUERY, { ids: mediaIds }, effectiveLog)
    response?.Page?.media.forEach((m) => {
      countsMap.set(m.id, { episodes: m.episodes, chapters: m.chapters, volumes: m.volumes })
    })
  } catch (e) {
    effectiveLog(`Failed to get media counts for ${mediaIds.length} items`, "warn", e)
  }

  return countsMap
}

export async function getJikanGenresAndThemes(
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<{ genres: JikanGenre[]; themes: JikanGenre[] }> {
  const effectiveLog = addLog || (() => {})

  try {
    const [genresResponse, themesResponse] = await Promise.all([
      jikanApiRequest("/genres/anime", effectiveLog, new URLSearchParams({ filter: "genres" })),
      jikanApiRequest("/genres/anime", effectiveLog, new URLSearchParams({ filter: "themes" })),
    ])

    const genres: JikanGenre[] = (genresResponse.data as any[]).map((item) => ({
      mal_id: item.mal_id,
      name: item.name,
      url: item.url,
      count: item.count,
      type: "genre",
    }))

    const themes: JikanGenre[] = (themesResponse.data as any[]).map((item) => ({
      mal_id: item.mal_id,
      name: item.name,
      url: item.url,
      count: item.count,
      type: "tag",
    }))

    effectiveLog("Successfully fetched and processed genres and themes from Jikan", "info")
    return { genres, themes }
  } catch (error: any) {
    effectiveLog(`Failed to fetch Jikan genres/themes: ${error.message}`, "error")
    throw error
  }
}
