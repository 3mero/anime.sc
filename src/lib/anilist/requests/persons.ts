import type { LogEntry } from "@/hooks/use-logger"
import { PERSON_DETAILS_QUERY, PERSON_PICS_QUERY } from "../queries"

const ANILIST_API_URL = "https://graphql.anilist.co"

async function fetchAniList(
  query: string,
  variables: any,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
) {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetch(ANILIST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      throw new Error(`AniList API responded with status ${response.status}`)
    }

    const json = await response.json()
    if (json.errors) {
      throw new Error(`AniList GraphQL errors: ${JSON.stringify(json.errors)}`)
    }

    return json.data
  } catch (error: any) {
    effectiveLog(`AniList API error: ${error.message}`, "error")
    throw error
  }
}

export async function getPersonDetails(
  personId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<any | null> {
  const effectiveLog = addLog || (() => {})
  try {
    const data = await fetchAniList(PERSON_DETAILS_QUERY, { id: personId }, effectiveLog)
    if (!data || !data.Staff) {
      effectiveLog(`No data found for person ID ${personId}`, "warn")
      return null
    }
    return data.Staff
  } catch (error: any) {
    effectiveLog(`Failed to fetch AniList person details for ID ${personId}: ${error.message}`, "error")
    return null
  }
}

export async function getPersonPictures(
  personId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<string[]> {
  const effectiveLog = addLog || (() => {})
  try {
    const data = await fetchAniList(PERSON_PICS_QUERY, { id: personId }, effectiveLog)
    if (!data || !data.Staff || !data.Staff.image) {
      effectiveLog(`No pictures data found for person ID ${personId}`, "warn")
      return []
    }

    const images: string[] = []

    if (data.Staff.image?.large) {
      images.push(data.Staff.image.large)
    }

    return images
  } catch (e: any) {
    effectiveLog(`Failed to get person pictures from AniList for ID ${personId}: ${e.message}`, "warn")
    return []
  }
}
