"use client"

import { createContext, useContext, useState, type ReactNode, useEffect, useCallback, useMemo } from "react"
import { get, set, clear } from "@/lib/idb-keyval"
import { useToast } from "@/hooks/use-toast"
import { useLogger } from "@/hooks/use-logger"
import { defaultLayoutConfig, SENSITIVE_GENRES } from "@/lib/config"
import type {
  ListData,
  LayoutConfigItem,
  Anime,
  LocalProfile,
  AuthMode,
  NotificationsLayoutKey,
  SharedDataConfig,
} from "./auth/types"
import { getMultipleAnimeFromAniList } from "@/lib/anilist/requests"
import { v4 as uuidv4 } from "uuid"
import { isPast } from "date-fns"

export type {
  LayoutConfigItem,
  CustomEpisodeLinks,
  WatchedEpisodes,
  ExcludedItems,
  UserNotification,
  Comment,
  NotificationsLayoutKey,
  GlobalActivity,
  ListData, // added ListData to exports
} from "./auth/types"

// Constants
export const IDB_PROFILE_KEY = "animesync_local_profile"
export const IDB_LIST_DATA_KEY = "animesync_local_list_data"
export const IDB_LAYOUT_CONFIG_KEY = "animesync_layout_config"
export const IDB_TRACKED_MEDIA_KEY = "animesync_tracked_media"
export const IDB_SHARED_DATA_KEY = "animesync_shared_data_config"
const UPDATE_INTERVAL = 3 * 60 * 1000
const INITIAL_CHECK_DELAY = 10 * 1000
const DEFAULT_STORAGE_QUOTA = 1 * 1024 * 1024 * 1024 // 1 GB

// Initial State
const initialListData: ListData = {
  planToWatch: [],
  currentlyWatching: [],
  watchedEpisodes: {},
  planToRead: [],
  currentlyReading: [],
  readChapters: {},
  customEpisodeLinks: {},
  comments: {},
  notifications: [],
  notificationsLayout: ["updates", "reminders", "logs"],
  pinnedNotificationTab: "updates",
  excludedItems: {},
  readActivityIds: [],
  reminders: [],
  hiddenGenres: SENSITIVE_GENRES,
  sensitiveContentUnlocked: false,
  storageQuota: DEFAULT_STORAGE_QUOTA,
  pinnedNews: [],
  favoriteNews: [],
  followedAnimeForNews: [],
}

// Context
export type AuthContextType = ReturnType<typeof useAuthCore>
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Main Hook
function useAuthCore() {
  const { addLog } = useLogger()
  const { toast } = useToast()

  // STATE MANAGEMENT
  const [authMode, setAuthMode] = useState<AuthMode>("none")
  const [localProfile, setLocalProfile] = useState<LocalProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [trackedMedia, setTrackedMedia] = useState<Anime[]>([])
  const [listData, setListData] = useState<ListData>(initialListData)
  const [updates, setUpdates] = useState<any>(null)
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false)
  const [showDebugLogs, setDebugLogs] = useState(false)
  const [sharedDataConfig, setSharedDataConfig] = useState<SharedDataConfig>({
    url: null,
    lastSync: null,
    lastSize: null,
    lastEtag: null,
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [username, setUsername] = useState("")

  // --- AUTH STATE LOGIC ---
  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      try {
        const profile = await get<LocalProfile>(IDB_PROFILE_KEY)
        if (profile) {
          setAuthMode("local")
          setLocalProfile(profile)
          setIsSignedIn(true)
          setUsername(profile.username)
        } else {
          setAuthMode("none")
          setIsSignedIn(false)
          setUsername("")
        }
      } catch (error) {
        console.error("Error reading profile from IndexedDB:", error)
        addLog("Error reading profile from IndexedDB.", "error", error)
        setAuthMode("none")
        setIsSignedIn(false)
        setUsername("")
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [addLog])

  const signInLocally = useCallback(
    async (username: string) => {
      try {
        if (!window.indexedDB) {
          throw new Error("IndexedDB is not supported in this browser")
        }

        const profile: LocalProfile = {
          username,
          avatar_url: `https://avatar.vercel.sh/${username}.svg`,
        }

        await set(IDB_PROFILE_KEY, profile)

        const savedProfile = await get<LocalProfile>(IDB_PROFILE_KEY)
        if (!savedProfile || savedProfile.username !== username) {
          throw new Error("Failed to verify saved profile")
        }

        setAuthMode("local")
        setLocalProfile(profile)
        setIsSignedIn(true)
        setUsername(username)

        setTimeout(() => {
          window.location.reload()
        }, 100)
      } catch (error) {
        console.error("Sign-in error:", error)
        addLog(`Sign-in failed: ${error}`, "error", error)
        throw error
      }
    },
    [addLog],
  )

  const signOut = useCallback(async () => {
    setAuthMode("none")
    setLocalProfile(null)
    setIsSignedIn(false)
    setUsername("")
    setListData({
      planToWatch: [],
      currentlyWatching: [],
      watchedEpisodes: {},
      planToRead: [],
      currentlyReading: [],
      readChapters: {},
      customEpisodeLinks: {},
      comments: {},
      notifications: [],
      notificationsLayout: ["updates", "reminders", "logs"],
      pinnedNotificationTab: "updates",
      excludedItems: {},
      readActivityIds: [],
      reminders: [],
      hiddenGenres: SENSITIVE_GENRES,
      sensitiveContentUnlocked: false,
      storageQuota: DEFAULT_STORAGE_QUOTA,
      pinnedNews: [],
      favoriteNews: [],
      followedAnimeForNews: [],
    })
    await clear()
    window.location.href = "/"
  }, [])

  const updateLocalProfile = useCallback(
    async (newProfileData: Partial<LocalProfile>) => {
      if (!localProfile) return
      const updatedProfile = { ...localProfile, ...newProfileData }
      setLocalProfile(updatedProfile)
      await set(IDB_PROFILE_KEY, updatedProfile)
    },
    [localProfile],
  )

  // --- STORAGE QUOTA LOGIC ---
  const checkStorageAndNotify = useCallback(
    async (updatedData: ListData) => {
      if (!navigator.storage || !navigator.storage.estimate) {
        return true // Cannot check, so we allow the write.
      }

      const quota = updatedData.storageQuota || DEFAULT_STORAGE_QUOTA
      const estimate = await navigator.storage.estimate()
      const usage = estimate.usage || 0

      if (usage > quota) {
        toast({
          variant: "destructive",
          title: "Storage Limit Reached",
          description: "New data cannot be saved. Please increase storage quota in settings.",
        })
        const storageNotification: any = {
          id: `storage-warning-${Date.now()}`,
          type: "storage",
          title: "Storage Limit Reached",
          message: "Increase your storage quota in settings to save new data.",
          timestamp: new Date().toISOString(),
          seen: false,
        }
        // Try to save just the notification, but it might fail too if we are really out of space.
        const notifications = [...(updatedData.notifications || []), storageNotification]
        set(IDB_LIST_DATA_KEY, { ...updatedData, notifications })
        return false
      }
      return true
    },
    [toast],
  )

  // --- LIST DATA LOGIC ---
  const updateAndPersistListData = useCallback(
    (getNewData: (currentData: ListData) => Partial<ListData> | ListData) => {
      setListData((currentData) => {
        const newData = getNewData(currentData)
        const updatedData = { ...currentData, ...newData }

        checkStorageAndNotify(updatedData).then((canWrite) => {
          if (canWrite) {
            set(IDB_LIST_DATA_KEY, updatedData)
          } else {
            addLog("Write operation blocked due to storage quota.", "warn")
          }
        })

        return updatedData
      })
    },
    [addLog, checkStorageAndNotify],
  )

  useEffect(() => {
    async function loadListData() {
      if (authMode !== "local") {
        setListData(initialListData)
        return
      }
      try {
        let loaded = await get<ListData>(IDB_LIST_DATA_KEY)
        if (!loaded) {
          loaded = initialListData
        } else {
          loaded.hiddenGenres = loaded.hiddenGenres === undefined ? SENSITIVE_GENRES : loaded.hiddenGenres
          loaded.notificationsLayout = loaded.notificationsLayout || ["updates", "reminders", "logs"]
          loaded.storageQuota = loaded.storageQuota || DEFAULT_STORAGE_QUOTA
          loaded.pinnedNews = loaded.pinnedNews || []
          loaded.favoriteNews = loaded.favoriteNews || []
          loaded.followedAnimeForNews = loaded.followedAnimeForNews || []
        }
        setListData(loaded)
      } catch (error) {
        setListData(initialListData)
      }
    }
    loadListData()
  }, [authMode])

  const handleToggleListMembership = useCallback(
    (media: Anime, listName: "planToWatch" | "currentlyWatching" | "planToRead" | "currentlyReading") => {
      const { synopsis, ...mediaWithoutSynopsis } = media

      updateAndPersistListData((currentData) => {
        const list = ((currentData as any)[listName] as number[]) || []
        const newIsInList = list.includes(media.id)
        const newList = newIsInList ? list.filter((id) => id !== media.id) : [...list, media.id]
        return { [listName]: newList }
      })

      setTimeout(async () => {
        const currentTracked = (await get<Anime[]>(IDB_TRACKED_MEDIA_KEY)) || []
        const freshListData = (await get<ListData>(IDB_LIST_DATA_KEY)) || initialListData
        const isInAnyList = ["planToWatch", "currentlyWatching", "planToRead", "currentlyReading"].some((list) =>
          (freshListData[list as keyof ListData] as number[])?.includes(media.id),
        )

        if (isInAnyList) {
          if (!currentTracked.some((item) => item.id === media.id)) {
            const newTracked = [...currentTracked, { ...mediaWithoutSynopsis, synopsis: "" }]
            await set(IDB_TRACKED_MEDIA_KEY, newTracked)
            setTrackedMedia(newTracked)
          }
        } else {
          const newTracked = currentTracked.filter((item) => item.id !== media.id)
          await set(IDB_TRACKED_MEDIA_KEY, newTracked)
          setTrackedMedia(newTracked)
        }
      }, 100)
    },
    [updateAndPersistListData],
  )

  const isPlannedToWatch = (id: number) => listData.planToWatch?.includes(id) || false
  const isCurrentlyWatching = (id: number) => listData.currentlyWatching?.includes(id) || false
  const isPlannedToRead = (id: number) => listData.planToRead?.includes(id) || false
  const isCurrentlyReading = (id: number) => listData.currentlyReading?.includes(id) || false

  const togglePlanToWatch = (anime: Anime) => handleToggleListMembership(anime, "planToWatch")
  const togglePlanToRead = (manga: Anime) => handleToggleListMembership(manga, "planToRead")

  const toggleCurrentlyWatching = (anime: Anime) => {
    const { synopsis, ...animeWithoutSynopsis } = anime

    updateAndPersistListData((d) => ({
      planToWatch: d.planToWatch?.filter((id) => id !== anime.id) || [],
      currentlyWatching: d.currentlyWatching?.includes(anime.id)
        ? d.currentlyWatching.filter((id) => id !== anime.id)
        : [...(d.currentlyWatching || []), anime.id],
    }))
    setTimeout(async () => {
      const currentTracked = (await get<Anime[]>(IDB_TRACKED_MEDIA_KEY)) || []
      if (!currentTracked.some((item) => item.id === anime.id)) {
        const animeWithSynopsis = { ...animeWithoutSynopsis, synopsis: "" }
        const newTracked = [...currentTracked, animeWithSynopsis]
        await set(IDB_TRACKED_MEDIA_KEY, newTracked)
        setTrackedMedia(newTracked)
      }
    }, 100)
  }

  const toggleCurrentlyReading = (manga: Anime) => {
    const { synopsis, ...mangaWithoutSynopsis } = manga

    updateAndPersistListData((d) => ({
      planToRead: d.planToRead?.filter((id) => id !== manga.id) || [],
      currentlyReading: d.currentlyReading?.includes(manga.id)
        ? d.currentlyReading.filter((id) => id !== manga.id)
        : [...(d.currentlyReading || []), manga.id],
    }))
    setTimeout(async () => {
      const currentTracked = (await get<Anime[]>(IDB_TRACKED_MEDIA_KEY)) || []
      if (!currentTracked.some((item) => item.id === manga.id)) {
        const mangaWithSynopsis = { ...mangaWithoutSynopsis, synopsis: "" }
        const newTracked = [...currentTracked, mangaWithSynopsis]
        await set(IDB_TRACKED_MEDIA_KEY, newTracked)
        setTrackedMedia(newTracked)
      }
    }, 100)
  }

  const setCustomEpisodeLinks = (mediaId: number, linkInfo: { template: string; ongoing: boolean }) =>
    updateAndPersistListData((d) => ({ customEpisodeLinks: { ...d.customEpisodeLinks, [mediaId]: linkInfo } }))

  const toggleEpisodeWatched = (anime: Anime, episodeId: string) => {
    const animeIdStr = String(anime.id)
    updateAndPersistListData((d) => {
      const watched = new Set(d.watchedEpisodes?.[animeIdStr] || [])
      if (watched.has(episodeId)) watched.delete(episodeId)
      else watched.add(episodeId)

      const updates: Partial<ListData> = {
        watchedEpisodes: { ...d.watchedEpisodes, [animeIdStr]: Array.from(watched) },
      }

      return updates
    })
  }

  const toggleChapterRead = (manga: Anime, chapterId: string) => {
    const mangaIdStr = String(manga.id)
    updateAndPersistListData((d) => {
      const read = new Set(d.readChapters?.[mangaIdStr]?.read || [])
      if (read.has(chapterId)) read.delete(chapterId)
      else read.add(chapterId)

      const updates: Partial<ListData> = {
        readChapters: {
          ...d.readChapters,
          [mangaIdStr]: { read: Array.from(read), lastRead: new Date().toISOString() },
        },
      }

      // Logic removed to prevent auto-removal from lists
      // if (allRead) {
      //   updates.currentlyReading = d.currentlyReading?.filter((id) => id !== manga.id) || []
      //   updates.planToRead = d.planToRead?.filter((id) => id !== manga.id) || []
      // }

      return updates
    })
  }

  const unwatchAllEpisodes = (anime: Anime) =>
    updateAndPersistListData((d) => {
      const newWatched = { ...d.watchedEpisodes }
      delete newWatched[String(anime.id)]
      return { watchedEpisodes: newWatched }
    })

  const watchAllEpisodes = (anime: Anime) => {
    const count = anime.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 : anime.episodes
    if (!count || count <= 0) return
    const allIds = Array.from({ length: count }, (_, i) => String(i + 1))
    updateAndPersistListData((d) => ({
      watchedEpisodes: { ...d.watchedEpisodes, [String(anime.id)]: allIds },
      // currentlyWatching: d.currentlyWatching?.filter((id) => id !== anime.id) || [], // Keep in watching
      // planToWatch: d.planToWatch?.filter((id) => id !== anime.id) || [], // Keep in planned
    }))
  }

  const unmarkAllChaptersRead = (manga: Anime) =>
    updateAndPersistListData((d) => {
      const newRead = { ...d.readChapters }
      delete newRead[String(manga.id)]
      return { readChapters: newRead }
    })

  const markAllChaptersRead = (manga: Anime, allChapterIds: string[]) => {
    const mangaIdStr = String(manga.id)
    updateAndPersistListData((d) => ({
      readChapters: {
        ...d.readChapters,
        [mangaIdStr]: { read: allChapterIds, lastRead: new Date().toISOString() },
      },
      // currentlyReading: d.currentlyReading?.filter((id) => id !== manga.id) || [],
      // planToRead: d.planToRead?.filter((id) => id !== manga.id) || [],
    }))
  }

  const removeItemFromList = (itemId: number, listName: string) => {
    switch (listName) {
      case "watching":
        updateAndPersistListData((d) => ({
          currentlyWatching: d.currentlyWatching?.filter((id) => id !== itemId) || [],
        }))
        break
      case "plan-to-watch":
        updateAndPersistListData((d) => ({ planToWatch: d.planToWatch?.filter((id) => id !== itemId) || [] }))
        break
      case "completed":
        unwatchAllEpisodes({ id: itemId } as Anime)
        break
      case "reading":
        updateAndPersistListData((d) => ({ currentlyReading: d.currentlyReading?.filter((id) => id !== itemId) || [] }))
        break
      case "plan-to-read":
        updateAndPersistListData((d) => ({ planToRead: d.planToRead?.filter((id) => id !== itemId) || [] }))
        break
      case "read":
        unmarkAllChaptersRead({ id: itemId } as Anime)
        break
    }
  }

  const getMediaForList = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return []
      return getMultipleAnimeFromAniList(ids, addLog)
    },
    [addLog],
  )

  const getAllWatchedAnime = useCallback(async () => {
    const watchedIds = Object.keys(listData.watchedEpisodes)
      .map(Number)
      .filter((id) => listData.watchedEpisodes[id]?.length > 0)
    const animes = await getMediaForList(watchedIds)
    return animes.map((anime) => ({ ...anime, watchedEpisodeCount: listData.watchedEpisodes[anime.id]?.length || 0 }))
  }, [listData.watchedEpisodes, getMediaForList])

  const getCurrentlyWatchingAnime = useCallback(
    () => getMediaForList(listData.currentlyWatching || []),
    [listData.currentlyWatching, getMediaForList],
  )
  const getPlanToWatchAnime = useCallback(
    () => getMediaForList(listData.planToWatch || []),
    [listData.planToWatch, getMediaForList],
  )
  const getAllReadManga = useCallback(async () => {
    const readIds = Object.keys(listData.readChapters || {})
      .map(Number)
      .filter((id) => listData.readChapters?.[id]?.read.length > 0)
    const mangas = await getMediaForList(readIds)
    return mangas.map((manga) => ({ ...manga, readChapterCount: listData.readChapters?.[manga.id]?.read.length || 0 }))
  }, [listData.readChapters, getMediaForList])
  const getCurrentlyReadingManga = useCallback(
    () => getMediaForList(listData.currentlyReading || []),
    [listData.currentlyReading, getMediaForList],
  )
  const getPlanToReadManga = useCallback(
    () => getMediaForList(listData.planToRead || []),
    [listData.planToRead, getMediaForList],
  )
  const clearCompletedList = () => updateAndPersistListData(() => ({ watchedEpisodes: {} }))
  const clearReadList = () => updateAndPersistListData(() => ({ readChapters: {} }))
  const markActivityAsRead = (id: number) =>
    updateAndPersistListData((d) => ({ readActivityIds: [...(d.readActivityIds || []), id] }))
  const markAllActivitiesAsRead = (allActivityIds: number[]) =>
    updateAndPersistListData(() => ({ readActivityIds: allActivityIds }))
  const clearDataSection = (key: keyof ListData) =>
    updateAndPersistListData(() => ({ [key]: Array.isArray(initialListData[key]) ? [] : {} }))
  const setHiddenGenres = (genres: string[]) => updateAndPersistListData(() => ({ hiddenGenres: genres }))
  const setSensitiveContentUnlocked = (unlocked: boolean) =>
    updateAndPersistListData(() => ({ sensitiveContentUnlocked: unlocked }))
  const setStorageQuota = (bytes: number) => updateAndPersistListData(() => ({ storageQuota: bytes }))

  // --- MEDIA TRACKING LOGIC ---
  useEffect(() => {
    async function loadTrackedMedia() {
      if (authMode === "local") {
        const media = (await get<Anime[]>(IDB_TRACKED_MEDIA_KEY)) || []
        // Retroactively clean up synopsis from old data
        const cleanedMedia = media.map((item) => {
          if ((item as Partial<Anime>).synopsis) {
            const { synopsis, ...rest } = item as any
            return rest
          }
          return item
        })
        setTrackedMedia(cleanedMedia)
        // Optionally re-save the cleaned data
        if (media.length > 0 && media.some((item) => (item as Partial<Anime>).synopsis)) {
          await set(IDB_TRACKED_MEDIA_KEY, cleanedMedia)
        }
      } else {
        setTrackedMedia([])
      }
    }
    loadTrackedMedia()
  }, [authMode])

  const addInteraction = useCallback(
    (media: Anime, diff: number) => {
      const newNotification: any = {
        id: uuidv4(),
        type: "update" as const,
        title: media.title_english || media.title,
        message: `New ${media.type === "MANGA" ? "chapters" : "episodes"} available: ${diff} new`,
        timestamp: new Date().toISOString(),
        seen: false,
        mediaId: media.id,
        mediaType: media.type,
      }

      updateAndPersistListData((d) => ({
        notifications: [...(d.notifications || []), newNotification],
      }))
    },
    [updateAndPersistListData],
  )

  const checkForUpdates = useCallback(async () => {
    const mediaToWatchIds = new Set([...(listData.currentlyWatching || []), ...(listData.currentlyReading || [])])

    if (mediaToWatchIds.size === 0) {
      return
    }

    try {
      const latestMediaData = await getMultipleAnimeFromAniList(Array.from(mediaToWatchIds), addLog)

      let newEpisodesCount = 0
      const newUpdates: any[] = []

      setTrackedMedia((prevTracked) => {
        const updatedTracked = [...prevTracked]

        for (const latestMedia of latestMediaData) {
          const trackedIndex = updatedTracked.findIndex((item) => item.id === latestMedia.id)

          if (trackedIndex !== -1) {
            const trackedMedia = updatedTracked[trackedIndex]
            const oldCount = trackedMedia.episodes || trackedMedia.chapters || 0
            const newCount = latestMedia.episodes || latestMedia.chapters || 0
            const diff = newCount - oldCount

            if (diff > 0) {
              newEpisodesCount += diff
              newUpdates.push({ media: latestMedia, diff })
              addInteraction(latestMedia, diff)

              const { synopsis, ...rest } = latestMedia
              updatedTracked[trackedIndex] = { ...rest, synopsis: "" }
            }
          }
        }

        if (
          updatedTracked.length !== prevTracked.length ||
          updatedTracked.some((m, i) => m.id !== prevTracked[i]?.id)
        ) {
          set(IDB_TRACKED_MEDIA_KEY, updatedTracked)
        }

        return updatedTracked
      })

      setUpdates(newUpdates)
    } catch (error) {
      addLog("Error checking for updates", "error", error)
    }
  }, [listData.currentlyWatching, listData.currentlyReading, addLog, addInteraction])

  const runChecks = useCallback(async () => {
    if (isCheckingForUpdates) return
    setIsCheckingForUpdates(true)
    await checkForUpdates()
    setIsCheckingForUpdates(false)
  }, [isCheckingForUpdates, checkForUpdates])

  useEffect(() => {
    if (authMode !== "local") return
    const initialTimeout = setTimeout(runChecks, INITIAL_CHECK_DELAY)
    const intervalId = setInterval(runChecks, UPDATE_INTERVAL)
    return () => {
      clearTimeout(initialTimeout)
      clearInterval(intervalId)
    }
  }, [authMode, runChecks])

  const markInteractionAsRead = (id: string) =>
    updateAndPersistListData((d) => ({
      notifications:
        d.notifications?.map((n) => (n.id === id ? { ...n, seen: true, seenAt: new Date().toISOString() } : n)) || [],
    }))
  const markAllInteractionsAsRead = () =>
    updateAndPersistListData((d) => ({
      notifications: d.notifications?.map((n) => ({ ...n, seen: true, seenAt: new Date().toISOString() })) || [],
    }))

  // --- REMINDERS LOGIC ---
  const reminders = useMemo(() => listData.reminders || [], [listData.reminders])
  const notifications = useMemo(() => listData.notifications || [], [listData.notifications])

  const isMediaCompleted = useCallback(
    (reminder: any): boolean => {
      if (!reminder.autoStopOnCompletion) return false
      const media = trackedMedia.find((m) => m.id === reminder.mediaId)
      if (!media) return false
      const totalUnits = media.type === "MANGA" ? media.chapters || media.volumes : media.episodes
      if (!totalUnits || totalUnits === 0) return false
      if (media.type === "MANGA") return (listData.readChapters?.[media.id]?.read?.length || 0) >= totalUnits
      return (listData.watchedEpisodes?.[media.id]?.length || 0) >= totalUnits
    },
    [trackedMedia, listData.watchedEpisodes, listData.readChapters],
  )

  const checkRemindersAndCreateNotifications = useCallback(() => {
    const existingReminderNotifications = new Set(
      notifications.filter((n) => n.type === "reminder").map((n) => (n as any).reminderId),
    )
    const newNotifications: any[] = []

    reminders.forEach((reminder) => {
      // Skip if already has notification for this reminder
      if (existingReminderNotifications.has(reminder.id)) return

      // Skip if media is completed
      if (isMediaCompleted(reminder)) return

      const now = new Date()
      const startDate = new Date(reminder.startDateTime)

      // Check if this is a repeating reminder
      if (reminder.repeatOnDays && reminder.repeatOnDays.length > 0) {
        // For repeating reminders, check if today matches any repeat day and time has passed
        const currentDay = now.getDay() // 0 = Sunday, 6 = Saturday
        const currentTime = now.getHours() * 60 + now.getMinutes()
        const reminderTime = startDate.getHours() * 60 + startDate.getMinutes()

        // If today is a repeat day and current time is past the reminder time
        if (reminder.repeatOnDays.includes(currentDay) && currentTime >= reminderTime) {
          newNotifications.push({
            id: uuidv4(),
            type: "reminder",
            reminderId: reminder.id,
            mediaId: reminder.mediaId,
            title: reminder.title,
            message: reminder.notes,
            timestamp: new Date().toISOString(),
            seen: false,
          })
        }
      } else {
        // For one-time reminders, check if start time has passed
        if (isPast(startDate)) {
          newNotifications.push({
            id: uuidv4(),
            type: "reminder",
            reminderId: reminder.id,
            mediaId: reminder.mediaId,
            title: reminder.title,
            message: reminder.notes,
            timestamp: new Date().toISOString(),
            seen: false,
          })
        }
      }
    })

    if (newNotifications.length > 0) {
      updateAndPersistListData((currentData) => ({
        notifications: [...currentData.notifications, ...newNotifications],
      }))
    }
  }, [reminders, notifications, updateAndPersistListData, isMediaCompleted])

  useEffect(() => {
    if (authMode !== "local") return

    const initialTimeout = setTimeout(() => {
      checkRemindersAndCreateNotifications()
    }, 5000)

    const intervalId = setInterval(() => {
      checkRemindersAndCreateNotifications()
    }, 60000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(intervalId)
    }
  }, [authMode, checkRemindersAndCreateNotifications])

  const addReminder = (
    reminderData: Omit<any, "id" | "createdAt" | "mediaTitle" | "mediaImage" | "mediaType">,
    media: Anime,
  ) => {
    const newReminder: any = {
      ...reminderData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      mediaTitle: media.title,
      mediaImage: media.images.webp.large_image_url || "",
      mediaType: media.type as "ANIME" | "MANGA",
    }
    updateAndPersistListData((currentData) => ({ reminders: [...(currentData.reminders || []), newReminder] }))
  }
  const updateReminder = (id: string, data: Partial<any>) =>
    updateAndPersistListData((currentData) => ({
      reminders: currentData.reminders.map((r) => (r.id === id ? { ...r, ...data } : r)),
    }))
  const deleteReminder = (id: string) =>
    updateAndPersistListData((currentData) => ({
      reminders: currentData.reminders.filter((r) => r.id !== id),
      notifications: currentData.notifications.filter((n) => (n as any).reminderId !== id),
    }))
  const markReminderAsSeen = (id: string) =>
    updateAndPersistListData((currentData) => ({
      notifications:
        currentData.notifications.map((n) =>
          n.id === id ? { ...n, seen: true, seenAt: new Date().toISOString() } : n,
        ) || [],
    }))
  const markAllRemindersAsSeen = () =>
    updateAndPersistListData((currentData) => ({
      notifications: currentData.notifications.map((n) =>
        n.type === "reminder" && !n.seen ? { ...n, seen: true, seenAt: new Date().toISOString() } : n,
      ),
    }))

  // --- UI SETTINGS LOGIC ---
  const layoutConfig = useMemo(() => listData.layoutConfig || defaultLayoutConfig, [listData.layoutConfig])
  const notificationsLayout = useMemo(
    () => listData.notificationsLayout || ["updates", "reminders", "logs"],
    [listData.notificationsLayout],
  )
  const pinnedNotificationTab = useMemo(
    () => listData.pinnedNotificationTab || "updates",
    [listData.pinnedNotificationTab],
  )

  const updateLayoutConfig = (config: LayoutConfigItem[]) => updateAndPersistListData(() => ({ layoutConfig: config }))
  const updateNotificationsLayout = (layout: NotificationsLayoutKey[]) =>
    updateAndPersistListData(() => ({ notificationsLayout: layout }))
  const updatePinnedNotificationTab = (tab: NotificationsLayoutKey) =>
    updateAndPersistListData(() => ({ pinnedNotificationTab: tab }))

  // --- DATA MANAGEMENT LOGIC ---
  const disconnectFromSharedData = useCallback(
    (showToast = true) => {
      const newConfig = { url: null, lastSync: null, lastSize: null, lastEtag: null }
      setSharedDataConfig(newConfig)
      set(IDB_SHARED_DATA_KEY, newConfig)
      if (showToast) toast({ title: "Disconnected" })
    },
    [toast],
  )

  const convertToRawGistUrl = (url: string) => {
    const match = url.match(/gist\.github\.com\/([a-zA-Z0-9_-]+)\/([a-f0-9]+)/)
    return match ? `https://gist.githubusercontent.com/${match[1]}/${match[2]}/raw` : url
  }

  const syncSharedData = useCallback(
    async (isManualTrigger = false) => {
      const currentConfig = await get<SharedDataConfig>(IDB_SHARED_DATA_KEY)
      if (!currentConfig?.url) return
      if (isSyncing) return
      setIsSyncing(true)

      try {
        const rawUrl = convertToRawGistUrl(currentConfig.url)
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(rawUrl)}`
        const headers: HeadersInit = isManualTrigger
          ? {}
          : currentConfig.lastEtag
            ? { "If-None-Match": currentConfig.lastEtag }
            : {}

        const response = await fetch(proxyUrl, { headers })

        if (response.status === 304) {
          if (isManualTrigger) toast({ title: "Already Up-to-Date" })
        } else if (response.ok) {
          const data = await response.json()
          if (!data.profile || !data.lists) throw new Error("Invalid data structure.")

          await set(IDB_PROFILE_KEY, data.profile)
          await set(IDB_LIST_DATA_KEY, data.lists)
          if (data.layout) await set(IDB_LAYOUT_CONFIG_KEY, data.layout)
          if (data.tracked) await set(IDB_TRACKED_MEDIA_KEY, data.tracked)

          const newConfig = {
            ...currentConfig,
            lastSync: new Date().toISOString(),
            lastEtag: response.headers.get("etag"),
            lastSize: Number(response.headers.get("content-length") || 0),
          }
          setSharedDataConfig(newConfig)
          await set(IDB_SHARED_DATA_KEY, newConfig)

          toast({ title: "Sync Successful", description: "Reloading app." })
          setTimeout(() => window.location.reload(), 1500)
        } else {
          throw new Error(`Fetch failed: ${response.statusText}`)
        }
      } catch (error: any) {
        toast({ variant: "destructive", title: "Sync Failed", description: error.message })
        disconnectFromSharedData(false)
      } finally {
        setIsSyncing(false)
      }
    },
    [isSyncing, toast, disconnectFromSharedData],
  )

  useEffect(() => {
    async function loadSharedConfig() {
      if (authMode !== "local") return
      const config = await get<SharedDataConfig>(IDB_SHARED_DATA_KEY)
      if (config?.url) setSharedDataConfig(config)
    }
    loadSharedConfig()
  }, [authMode])

  const connectToSharedData = async (url: string) => {
    const newConfig = { url, lastSync: null, lastSize: null, lastEtag: null }
    setSharedDataConfig(newConfig)
    await set(IDB_SHARED_DATA_KEY, newConfig)
    await syncSharedData(true)
  }

  const exportData = async () => {
    try {
      const allData = {
        profile: await get(IDB_PROFILE_KEY),
        lists: await get(IDB_LIST_DATA_KEY),
        layout: await get(IDB_LAYOUT_CONFIG_KEY),
        tracked: await get(IDB_TRACKED_MEDIA_KEY),
      }
      const dataStr = JSON.stringify(allData, null, 2)
      const blob = new Blob([dataStr], { type: "application/json" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `animesync_data_${new Date().toISOString().split("T")[0]}.json`
      link.click()
      URL.revokeObjectURL(link.href)
      toast({ title: "Download Started" })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Export Failed", description: error.message })
    }
  }

  const importData = (file: File) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (!data.profile || !data.lists) throw new Error("Invalid file structure.")
        await set(IDB_PROFILE_KEY, data.profile)
        await set(IDB_LIST_DATA_KEY, data.lists)
        if (data.layout) await set(IDB_LAYOUT_CONFIG_KEY, data.layout)
        if (data.tracked) await set(IDB_TRACKED_MEDIA_KEY, data.tracked)
        toast({ title: "Import Successful", description: "Reloading app." })
        setTimeout(() => window.location.reload(), 1500)
      } catch (error: any) {
        toast({ variant: "destructive", title: "Import Failed", description: error.message })
      }
    }
    reader.readAsText(file)
  }

  const resetLocalData = useCallback(async () => {
    await signOut()
  }, [signOut])

  return {
    // Auth
    authMode,
    localProfile,
    loading,
    signInLocally,
    signOut,
    updateLocalProfile,
    isSignedIn,
    username,
    // Lists & Media
    listData,
    setListData: updateAndPersistListData,
    trackedMedia,
    notifications,
    isPlannedToWatch,
    isCurrentlyWatching,
    togglePlanToWatch,
    toggleCurrentlyWatching,
    isPlannedToRead,
    isCurrentlyReading,
    togglePlanToRead,
    toggleCurrentlyReading,
    toggleEpisodeWatched,
    watchAllEpisodes,
    unwatchAllEpisodes,
    toggleChapterRead,
    markAllChaptersRead,
    unmarkAllChaptersRead,
    getAllWatchedAnime,
    getCurrentlyWatchingAnime,
    getPlanToWatchAnime,
    getAllReadManga,
    getCurrentlyReadingManga,
    getPlanToReadManga,
    clearCompletedList,
    clearReadList,
    removeItemFromList,
    // Added isMediaCompleted to exports
    isMediaCompleted,
    // Updates & Notifications
    updates,
    runChecks,
    isCheckingForUpdates,
    addInteraction,
    markInteractionAsRead,
    markAllInteractionsAsRead,
    markActivityAsRead,
    markAllActivitiesAsRead,
    // Reminders
    reminders,
    addReminder,
    updateReminder,
    deleteReminder,
    markReminderAsSeen,
    markAllRemindersAsSeen,
    // UI
    layoutConfig,
    updateLayoutConfig,
    notificationsLayout,
    updateNotificationsLayout,
    pinnedNotificationTab,
    updatePinnedNotificationTab,
    setHiddenGenres,
    sensitiveContentUnlocked: listData.sensitiveContentUnlocked || false,
    setSensitiveContentUnlocked,
    // Data Management
    exportData,
    importData,
    resetLocalData,
    setStorageQuota,
    sharedDataConfig,
    connectToSharedData,
    disconnectFromSharedData,
    syncSharedData,
    isSyncing,
    // Other
    setCustomEpisodeLinks,
    clearDataSection,
    showDebugLogs,
    setDebugLogs,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const authCoreValue = useAuthCore()
  return <AuthContext.Provider value={authCoreValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
