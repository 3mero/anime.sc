import type { LogEntry } from "@/hooks/use-logger"
import {
  CHARACTER_DETAILS_QUERY,
  CHAR_PICS_QUERY,
  CHARACTERS_QUERY,
  SEARCH_CHARACTERS_QUERY,
  MANGA_CHARS_QUERY,
} from "../queries"
import { fetchAniList } from "../utils"

export async function getCharacterDetails(
  characterId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<any | null> {
  const effectiveLog = addLog || (() => {})
  effectiveLog(`Fetching character details from AniList for character ID: ${characterId}`)

  try {
    const response = await fetchAniList<{ Character: any }>(
      CHARACTER_DETAILS_QUERY,
      { id: characterId },
      effectiveLog,
      "CHARACTER_DETAILS_QUERY",
    )

    if (!response?.Character) {
      effectiveLog(`Character ${characterId} not found in AniList`, "warn")
      return null
    }

    effectiveLog(`Successfully fetched character details from AniList for character ID: ${characterId}`)
    return response.Character
  } catch (error: any) {
    effectiveLog(`Failed to fetch AniList character details for ID ${characterId}: ${error.message}`, "error")
    throw error
  }
}

export async function getCharacterPictures(
  characterId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<any[]> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ Character: { image: { large: string } } }>(
      CHAR_PICS_QUERY,
      { id: characterId },
      effectiveLog,
    )
    return response?.Character?.image?.large ? [{ jpg: { image_url: response.Character.image.large } }] : []
  } catch (error: any) {
    effectiveLog(`Failed to fetch character pictures for ID ${characterId}: ${error.message}`, "warn")
    return []
  }
}

export async function searchCharacters(
  query: string,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<any[]> {
  const effectiveLog = addLog || (() => {})
  try {
    effectiveLog(`Searching characters on AniList: ${query}`)

    const response = await fetchAniList<{
      Page: {
        characters: Array<{
          id: number
          name: {
            full: string
            native: string
          }
          image: {
            large: string
            medium: string
          }
          favourites: number
        }>
      }
    }>(SEARCH_CHARACTERS_QUERY, { search: query, page: 1, perPage: 20 }, effectiveLog, "SearchCharacters")

    if (!response?.Page?.characters) {
      effectiveLog("No characters found in AniList response", "warn")
      return []
    }

    return response.Page.characters.map((char) => ({
      id: char.id,
      name: {
        full: char.name.full,
        native: char.name.native,
      },
      image: {
        large: char.image.large,
        medium: char.image.medium,
      },
      favourites: char.favourites,
    }))
  } catch (e) {
    effectiveLog(`Failed to search characters on AniList: ${e}`, "warn")
    return []
  }
}

export async function getCharacter(
  id: number,
  source: "anilist" | "jikan" = "anilist",
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<any> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ Character: any }>(CHARACTER_DETAILS_QUERY, { id }, effectiveLog)
    return response?.Character
  } catch (e) {
    effectiveLog(`Failed to get character with media: ${id}`, "warn")
    return null
  }
}

export async function getAnimeCharactersFromAniList(
  anilistId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<any[]> {
  if (!anilistId) return []
  const effectiveLog = addLog || (() => {})

  try {
    effectiveLog(`Fetching characters for AniList ID: ${anilistId}`)
    const response = await fetchAniList<{ Media: any }>(
      CHARACTERS_QUERY,
      { id: anilistId },
      effectiveLog,
      "getAnimeCharacters",
    )

    if (response?.Media?.characters?.edges) {
      const characters = response.Media.characters.edges.map((edge: any) => ({
        character: {
          id: edge.node.id,
          name: edge.node.name.full,
          images: {
            large: edge.node.image.large,
          },
        },
        role: edge.role,
        voice_actors:
          edge.voiceActors?.map((va: any) => ({
            person: {
              id: va.id,
              name: va.name.full,
              images: {
                large: va.image.large,
              },
            },
            language: "Japanese",
          })) || [],
      }))

      effectiveLog(`Successfully fetched ${characters.length} characters from AniList`)
      return characters
    }

    return []
  } catch (error: any) {
    effectiveLog(`Failed to fetch AniList characters for ID ${anilistId}: ${error.message}`, "error")
    throw error
  }
}

export async function getMangaCharacters(
  mangaId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<any[]> {
  const effectiveLog = addLog || (() => {})
  try {
    const response = await fetchAniList<{ Media: { characters: { edges: any[] } } }>(
      MANGA_CHARS_QUERY,
      { id: mangaId },
      effectiveLog,
    )
    return (
      response?.Media?.characters?.edges.map((edge) => ({
        character: {
          ...edge.node,
          mal_id: edge.node.id,
          images: { webp: { image_url: edge.node.image.large }, jpg: { image_url: edge.node.image.large } },
        },
        role: edge.role,
      })) || []
    )
  } catch (error: any) {
    effectiveLog(`Failed to fetch manga characters for ID ${mangaId}: ${error.message}`, "error")
    throw error
  }
}

export async function getCharacterVoiceActors(
  characterId: number,
  addLog?: (message: string, type?: LogEntry["type"], details?: any) => void,
): Promise<any[]> {
  const effectiveLog = addLog || (() => {})
  effectiveLog(`Fetching voice actors from AniList for character ID: ${characterId}`)

  try {
    const query = `
      query CharacterVoiceActors($id: Int!) {
        Character(id: $id) {
          id
          media(sort: POPULARITY_DESC, perPage: 50) {
            edges {
              characterRole
              voiceActors(language: JAPANESE, sort: [RELEVANCE, ID]) {
                id
                name {
                  full
                  native
                }
                image {
                  large
                }
                languageV2
              }
              node {
                id
                idMal
                title {
                  romaji
                  english
                }
                coverImage {
                  large
                }
                type
                format
              }
            }
          }
        }
      }
    `

    const response = await fetchAniList<{ Character: any }>(
      query,
      { id: characterId },
      effectiveLog,
      "CharacterVoiceActors",
    )

    if (!response?.Character) {
      effectiveLog(`Character ${characterId} not found in AniList`, "warn")
      return []
    }

    const voiceActorsMap = new Map()
    response.Character.media.edges.forEach((edge: any) => {
      if (edge.voiceActors) {
        edge.voiceActors.forEach((va: any) => {
          if (!voiceActorsMap.has(va.id)) {
            voiceActorsMap.set(va.id, {
              ...va,
              anime: [],
            })
          }
          if (edge.node) {
            voiceActorsMap.get(va.id).anime.push({
              role: edge.characterRole,
              anime: edge.node,
            })
          }
        })
      }
    })

    const voiceActors = Array.from(voiceActorsMap.values())
    effectiveLog(
      `Successfully fetched ${voiceActors.length} voice actors from AniList for character ID: ${characterId}`,
    )
    return voiceActors
  } catch (error: any) {
    effectiveLog(`Failed to fetch AniList voice actors for character ID ${characterId}: ${error.message}`, "error")
    return []
  }
}
