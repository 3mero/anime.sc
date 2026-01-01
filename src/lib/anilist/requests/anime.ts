import type {
  Anime,
  AniListMedia,
  AniListStreamingEpisode,
  JikanStaff,
  JikanReview,
  JikanPicture,
  JikanVideo,
  ListData,
} from "../../types"
import type { LogEntry } from "@/hooks/use-logger"
import {
  AIRING_QUERY,
  EPISODES_QUERY,
  LATEST_MOVIES_QUERY,
  PAGINATED_LIST_QUERY,
  TOP_THIS_SEASON_QUERY,
  UPCOMING_QUERY,
  HOME_PAGE_QUERY,
  STAFF_QUERY,
  REVIEWS_QUERY,
  PICTURES_QUERY,
  VIDEOS_QUERY,
  RECOMMENDATIONS_QUERY,
  MULTIPLE_ANIME_QUERY,
  MEDIA_BY_ID_QUERY,
} from "../queries"
import { fetchAniList, mapAniListMediaToAnime } from "../utils"
import { get } from "../../idb-keyval"
import { genres_list } from "@/i18n"
import { SENSITIVE_GENRES } from "@/lib/config"

function getCurrentSeason() {
  const month = new Date().getMonth()
  if (month >= 0 && month <= 2) return "WINTER"
  if (month >= 3 && month <= 5) return "SPRING"
  if (month >= 6 && month <= 8) return "SUMMER"
  return "FALL"
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

export const getTrending = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) =>
  paginatedRequest(
    PAGINATED_LIST_QUERY,
    { page, perPage, sort: ["TRENDING_DESC", "POPULARITY_DESC"], type: "ANIME" },
    addLog,
  )

export const getTop = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) => paginatedRequest(PAGINATED_LIST_QUERY, { page, perPage, sort: ["SCORE_DESC"], type: "ANIME" }, addLog)

export const getPopular = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) => paginatedRequest(PAGINATED_LIST_QUERY, { page, perPage, sort: ["POPULARITY_DESC"], type: "ANIME" }, addLog)

export const getTopMovies = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) =>
  paginatedRequest(
    PAGINATED_LIST_QUERY,
    { page, perPage, sort: ["SCORE_DESC"], type: "ANIME", format: "MOVIE" },
    addLog,
  )

export const getLatestMovies = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) => paginatedRequest(LATEST_MOVIES_QUERY, { page, perPage }, addLog)

export const getLatestAdditions = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) => paginatedRequest(PAGINATED_LIST_QUERY, { page, perPage, sort: ["ID_DESC"] }, addLog)

export const getAiringNow = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) => paginatedRequest(AIRING_QUERY, { page, perPage }, addLog)

export const getUpcoming = (
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) => paginatedRequest(UPCOMING_QUERY, { page, perPage }, addLog)

export async function getTopThisSeason(
  page: number,
  perPage: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<{ data: Anime[]; hasNextPage: boolean }> {
  const variables = {
    page,
    perPage,
    season: getCurrentSeason(),
    seasonYear: new Date().getFullYear(),
  }
  return paginatedRequest(TOP_THIS_SEASON_QUERY, variables, addLog)
}

export async function getHomePageData(
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<Record<string, Anime[]>> {
  const effectiveLog = addLog || (() => {})
  try {
    const listData = await get<ListData>("animesync_local_list_data")
    const hidden = await getHiddenGenres(listData)

    const variables = {
      currentSeason: getCurrentSeason(),
      currentYear: new Date().getFullYear(),
      genre_not_in: hidden.genres,
      tag_not_in: hidden.tags,
    }

    const response = await fetchAniList<Record<string, { media: AniListMedia[] }>>(
      HOME_PAGE_QUERY,
      variables,
      effectiveLog,
      "getHomePageData",
    )

    if (!response) {
      return {}
    }

    const mappedData: Record<string, Anime[]> = {}
    for (const key in response) {
      if (Object.prototype.hasOwnProperty.call(response, key)) {
        mappedData[key] = response[key].media.map(mapAniListMediaToAnime)
      }
    }
    return mappedData
  } catch (error) {
    effectiveLog("Failed to fetch home page data", "error", error)
    return {}
  }
}

export async function getMultipleAnimeFromAniList(
  anilistIds: number[],
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<Anime[]> {
  const effectiveLog = addLog || (() => {})
  if (anilistIds.length === 0) return []

  try {
    const listData = await get<ListData>("animesync_local_list_data")
    const hidden = await getHiddenGenres(listData)
    const response = await fetchAniList<{ Page: { media: AniListMedia[] } }>(
      MULTIPLE_ANIME_QUERY,
      { ids: anilistIds, genre_not_in: hidden.genres, tag_not_in: hidden.tags },
      effectiveLog,
      "getMultipleAnimeFromAniList",
    )
    return response?.Page?.media.map(mapAniListMediaToAnime) || []
  } catch (error) {
    effectiveLog("Failed to fetch multiple anime", "error", error)
    return []
  }
}

export async function getMediaByAniListId(
  anilistId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<Anime | null> {
  const effectiveLog = addLog || (() => {})
  try {
    const listData = await get<ListData>("animesync_local_list_data")
    const hidden = await getHiddenGenres(listData)
    const response = await fetchAniList<{ Media: AniListMedia }>(
      MEDIA_BY_ID_QUERY,
      { id: anilistId, genre_not_in: hidden.genres, tag_not_in: hidden.tags },
      effectiveLog,
      `getMediaByAniListId-${anilistId}`,
    )
    return response ? mapAniListMediaToAnime(response.Media) : null
  } catch (error) {
    effectiveLog(`Failed to get media by AniList ID ${anilistId}`, "error", error)
    return null
  }
}

export async function getAnimeEpisodes(
  anilistId: number,
  addLog: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<AniListStreamingEpisode[]> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ Media: { streamingEpisodes: AniListStreamingEpisode[] } }>(
      EPISODES_QUERY,
      { id: anilistId },
      effectiveLog,
      "getAnimeEpisodes",
    )
    return response?.Media?.streamingEpisodes || []
  } catch (err) {
    effectiveLog(`Failed to fetch AniList episodes for ID ${anilistId}`, "warn")
    return []
  }
}

export async function getAnimeRecommendations(
  anilistId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<Anime[]> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{
      Media: { recommendations: { edges: { node: { mediaRecommendation: AniListMedia } }[] } }
    }>(RECOMMENDATIONS_QUERY, { id: anilistId }, effectiveLog, "getAnimeRecommendations")
    return (
      response?.Media?.recommendations.edges.map((edge) => mapAniListMediaToAnime(edge.node.mediaRecommendation)) || []
    )
  } catch (error) {
    effectiveLog(`Failed to fetch AniList recommendations for ID ${anilistId}`, "warn")
    return []
  }
}

export async function getAnimeStaff(
  anilistId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<JikanStaff[]> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ Media: { staff: { edges: any[] } } }>(
      STAFF_QUERY,
      { id: anilistId },
      effectiveLog,
    )
    return (
      response?.Media?.staff.edges.map((edge) => ({
        person: {
          mal_id: edge.node.id,
          name: edge.node.name.full,
          images: { jpg: { image_url: edge.node.image.large } },
        },
        positions: [edge.role],
      })) || []
    )
  } catch (e) {
    effectiveLog(`Failed to get staff for AniList ID ${anilistId}`, "warn")
    return []
  }
}

export async function getAnimeReviews(
  anilistId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<JikanReview[]> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ Media: { reviews: { nodes: any[] } } }>(
      REVIEWS_QUERY,
      { id: anilistId },
      effectiveLog,
    )
    return (
      response?.Media?.reviews.nodes.map((node) => ({
        mal_id: node.id,
        user: {
          username: node.user.name,
          url: `https://anilist.co/user/${node.user.name}`,
          images: { webp: { image_url: node.user.avatar.large }, jpg: { image_url: node.user.avatar.large } },
        },
        date: new Date(node.createdAt * 1000).toISOString(),
        review: node.body,
        score: node.score,
        reactions: {
          nice: node.rating,
          confusing: 0,
          creative: 0,
          funny: 0,
          informative: 0,
          love_it: 0,
          overall: node.ratingAmount,
          well_written: 0,
        },
        is_spoiler: node.body?.includes("~!") || false,
      })) || []
    )
  } catch (e) {
    effectiveLog(`Failed to get reviews for AniList ID ${anilistId}`, "warn")
    return []
  }
}

export async function getAnimePictures(
  anilistId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<JikanPicture[]> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ Media: { bannerImage: string; coverImage: { extraLarge: string } } }>(
      PICTURES_QUERY,
      { id: anilistId },
      effectiveLog,
    )
    const pictures: JikanPicture[] = []
    if (response?.Media?.bannerImage) pictures.push({ jpg: { image_url: response.Media.bannerImage } })
    if (response?.Media?.coverImage?.extraLarge)
      pictures.push({ jpg: { image_url: response.Media.coverImage.extraLarge } })
    return pictures
  } catch (e) {
    effectiveLog(`Failed to get pictures for AniList ID ${anilistId}`, "warn")
    return []
  }
}

export async function getAnimeVideos(
  anilistId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<JikanVideo[]> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ Media: { trailer: any; streamingEpisodes: any[] } }>(
      VIDEOS_QUERY,
      { id: anilistId },
      effectiveLog,
    )
    const videos: JikanVideo[] = []
    if (response?.Media?.trailer) {
      videos.push({
        title: "Official Trailer",
        trailer: {
          ...response.Media.trailer,
          images: {
            default_image_url: response.Media.trailer.thumbnail || "",
            medium_image_url: response.Media.trailer.thumbnail || "",
            large_image_url: response.Media.trailer.thumbnail || "",
            maximum_image_url: response.Media.trailer.thumbnail || "",
          },
        },
      })
    }
    response?.Media?.streamingEpisodes?.forEach((ep) => {
      videos.push({
        title: ep.title,
        trailer: {
          youtube_id: "",
          url: ep.url,
          embed_url: "",
          images: {
            default_image_url: ep.thumbnail || "",
            medium_image_url: ep.thumbnail || "",
            large_image_url: ep.thumbnail || "",
            maximum_image_url: ep.thumbnail || "",
          },
        },
      })
    })
    return videos
  } catch (e) {
    effectiveLog(`Failed to get videos for AniList ID ${anilistId}`, "warn")
    return []
  }
}

export async function getAnimeCharacters(
  malId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<any[]> {
  const effectiveLog = addLog || (() => {})
  try {
    effectiveLog(`Fetching characters from Jikan for MAL ID ${malId}`)
    const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}/characters`)

    if (!response.ok) {
      throw new Error(`Jikan API error: ${response.statusText}`)
    }

    const data = await response.json()
    effectiveLog(`Successfully fetched ${data.data?.length || 0} characters from Jikan`)
    return data.data || []
  } catch (e: any) {
    effectiveLog(`Failed to get characters from Jikan for MAL ID ${malId}: ${e.message}`, "warn")
    return []
  }
}
