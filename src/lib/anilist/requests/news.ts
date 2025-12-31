import type { JikanNewsArticle } from "../../types"
import type { LogEntry } from "@/hooks/use-logger"
import { GLOBAL_ACTIVITY_NEWS_QUERY, MEDIA_ACTIVITY_NEWS_QUERY } from "../queries"
import { fetchAniList, jikanApiRequest } from "../utils"

export async function getLatestNewsFromAniList(
  page = 1,
  perPage = 30,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<{ news: JikanNewsArticle[]; hasNextPage: boolean }> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ Page: { activities: any[]; pageInfo: { hasNextPage: boolean } } }>(
      GLOBAL_ACTIVITY_NEWS_QUERY,
      { page, perPage, typeIn: ["ANIME_LIST", "MANGA_LIST"] },
      effectiveLog,
      "getLatestNewsFromAniList",
    )

    const activities = response?.Page?.activities || []

    const news: JikanNewsArticle[] = activities
      .filter((activity: any) => activity.media)
      .map((activity: any) => {
        const media = activity.media
        const user = activity.user

        let description = ""
        if (activity.type === "ANIME_LIST" || activity.type === "MANGA_LIST") {
          const statusText = activity.status || "updated"
          const progressText = activity.progress || ""
          description = `${user.name} ${statusText} ${media.type === "ANIME" ? "episode" : "chapter"} ${progressText}`
        } else if (activity.type === "TEXT") {
          description = activity.text || ""
        }

        return {
          mal_id: activity.id,
          url: `https://anilist.co/activity/${activity.id}`,
          title: media.title?.english || media.title?.romaji || media.title?.native || "Untitled",
          date: new Date(activity.createdAt * 1000).toISOString(),
          author_username: user.name,
          author_url: `https://anilist.co/user/${user.name}`,
          forum_url: `https://anilist.co/activity/${activity.id}`,
          images: {
            jpg: {
              image_url: media.coverImage?.large || media.coverImage?.extraLarge || "/placeholder.svg",
            },
          },
          comments: 0,
          excerpt:
            media.description ||
            description ||
            `Latest update for ${media.title?.romaji || media.title?.native || "this title"}`,
          anime_title: media.title?.romaji || media.title?.english || media.title?.native,
          anime_image: media.coverImage?.extraLarge || media.coverImage?.large || "/placeholder.svg",
        }
      })

    return {
      news,
      hasNextPage: response?.Page?.pageInfo?.hasNextPage || false,
    }
  } catch (error) {
    effectiveLog("Failed to fetch latest news from AniList", "error", error)
    return { news: [], hasNextPage: false }
  }
}

export async function getNewsForSpecificAnime(
  mediaId: number,
  page = 1,
  perPage = 30,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<{ news: JikanNewsArticle[]; hasNextPage: boolean }> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ Page: { activities: any[]; pageInfo: { hasNextPage: boolean } } }>(
      MEDIA_ACTIVITY_NEWS_QUERY,
      { mediaId, page, perPage },
      effectiveLog,
      `getNewsForAnime-${mediaId}`,
    )

    const activities = response?.Page?.activities || []

    const news: JikanNewsArticle[] = activities
      .filter((activity: any) => activity.media)
      .map((activity: any) => {
        const media = activity.media
        const user = activity.user

        const statusText = activity.status || "updated"
        const progressText = activity.progress || ""
        const description = `${user.name} ${statusText} ${media.type === "ANIME" ? "episode" : "chapter"} ${progressText}`

        return {
          mal_id: activity.id,
          url: `https://anilist.co/activity/${activity.id}`,
          title: media.title?.english || media.title?.romaji || media.title?.native || "Untitled",
          date: new Date(activity.createdAt * 1000).toISOString(),
          author_username: user.name,
          author_url: `https://anilist.co/user/${user.name}`,
          forum_url: `https://anilist.co/activity/${activity.id}`,
          images: {
            jpg: {
              image_url: media.coverImage?.large || media.coverImage?.extraLarge || "/placeholder.svg",
            },
          },
          comments: 0,
          excerpt:
            media.description ||
            description ||
            `Latest update for ${media.title?.romaji || media.title?.native || "this title"}`,
          anime_title: media.title?.romaji || media.title?.english || media.title?.native,
          anime_image: media.coverImage?.extraLarge || media.coverImage?.large || "/placeholder.svg",
        }
      })

    return {
      news,
      hasNextPage: response?.Page?.pageInfo?.hasNextPage || false,
    }
  } catch (error) {
    effectiveLog(`Failed to fetch news for anime ${mediaId}`, "error", error)
    return { news: [], hasNextPage: false }
  }
}

export async function getLatestRecommendations(
  page: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<any> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await jikanApiRequest(
      "/recommendations/anime",
      effectiveLog,
      new URLSearchParams({ page: String(page) }),
    )
    return { data: response.data, hasNextPage: response.pagination.has_next_page }
  } catch (e) {
    effectiveLog(`Failed to get latest recommendations`, "warn")
    return { data: [], hasNextPage: false }
  }
}
