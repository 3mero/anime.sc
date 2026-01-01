"use client"

import { useState, useCallback } from "react"
import type { Anime, JikanCharacter, JikanPicture, JikanReview, JikanStaff } from "@/lib/types"
import { getMangaStaff, getMangaReviews, getAnimePictures } from "@/lib/anilist"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Info, ListVideo, Users, Camera, UserCog, MessageSquare, Newspaper } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useLogger } from "@/hooks/use-logger"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { AnimeSynopsis } from "./anime-synopsis"
import { ChaptersTab } from "./tabs/ChaptersTab"
import { CharactersTab } from "./tabs/CharactersTab"
import { PicturesTab } from "./tabs/PicturesTab"
import { StaffTab } from "./tabs/StaffTab"
import { ReviewsTab } from "./tabs/ReviewsTab"
import { NewsTab } from "./tabs/NewsTab"
import { Loader2 } from "lucide-react"
import { getMangaCharacters } from "@/lib/anilist"

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export function MangaTabs({ manga }: { manga: Anime }) {
  const { toast } = useToast()
  const { t, lang } = useTranslation()
  const { addLog } = useLogger()
  const { listData } = useAuth()

  const [activeTab, setActiveTab] = useState("synopsis")

  const [characterData, setCharacterData] = useState<{
    data: JikanCharacter[] | null
    isLoading: boolean
    error: string | null
  }>({ data: null, isLoading: false, error: null })

  const [additionalData, setAdditionalData] = useState({
    pictures: null as JikanPicture[] | null,
    staff: null as JikanStaff[] | null,
    reviews: null as JikanReview[] | null,
  })

  const handleTabChange = useCallback(
    async (tab: string) => {
      setActiveTab(tab)
      const anilistId = manga.id
      const malId = manga.mal_id

      if (!anilistId) return

      addLog(`Changing to tab: ${tab} for manga ${anilistId}`)

      if (tab === "characters") {
        if (characterData.data !== null) return
        setCharacterData((prev) => ({ ...prev, isLoading: true, error: null }))
        try {
          const data = await getMangaCharacters(anilistId, addLog)
          setCharacterData({ data: data, isLoading: false, error: null })
        } catch (e: any) {
          setCharacterData({ data: [], isLoading: false, error: e.message || "Failed to load character data." })
        }
        return
      }

      const handledTabs = ["synopsis", "chapters", "characters", "news"]
      if (handledTabs.includes(tab)) return

      type AdditionalDataKey = keyof typeof additionalData
      const key = tab as AdditionalDataKey

      if (additionalData[key] !== null) {
        addLog(`Tab data for "${key}" already loaded.`)
        return
      }

      addLog(`Fetching data for tab: "${key}"`)
      try {
        let data
        switch (key) {
          case "pictures":
            data = await getAnimePictures(anilistId, addLog)
            break
          case "staff":
            data = await getMangaStaff(anilistId, addLog)
            break
          case "reviews":
            data = await getMangaReviews(anilistId, addLog)
            break
        }
        setAdditionalData((prev) => ({ ...prev, [key]: data || [] }))
        addLog(`Successfully fetched data for tab: "${key}"`)
      } catch (error: any) {
        addLog(`Failed to fetch data for tab: "${key}". Error: ${error}`, "error")
        console.warn(`Failed to fetch ${key} for manga ${anilistId}:`, error)
        setAdditionalData((prev) => ({ ...prev, [key]: [] as any }))
        toast({
          variant: "destructive",
          title: t("toast_fetch_failed_title", { context: key }),
          description: t("toast_fetch_failed_desc", { context: key }),
        })
      }
    },
    [manga.id, manga.mal_id, additionalData, characterData, toast, addLog, t],
  )

  const TABS = [
    { value: "synopsis", label: t("synopsis"), icon: Info, condition: true },
    { value: "chapters", label: t("chapters"), icon: ListVideo, condition: true },
    { value: "characters", label: t("characters"), icon: Users, condition: true },
    { value: "pictures", label: t("pictures"), icon: Camera, condition: true },
    { value: "staff", label: t("staff"), icon: UserCog, condition: true },
    { value: "reviews", label: t("reviews"), icon: MessageSquare, condition: true },
    { value: "news", label: t("news"), icon: Newspaper, condition: !!manga.mal_id },
  ]

  const availableTabs = TABS.filter((tab) => tab.condition)

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 overflow-x-auto">
        {availableTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            <tab.icon className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="synopsis" className="py-4">
        <AnimeSynopsis synopsis={manga.synopsis} />
      </TabsContent>
      <TabsContent value="chapters" className="py-4">
        <ChaptersTab manga={manga} listData={listData} />
      </TabsContent>
      <TabsContent value="characters" className="py-4">
        <CharactersTab
          characters={characterData.data}
          isLoading={characterData.isLoading}
          error={characterData.error}
          lang={lang}
        />
      </TabsContent>
      <TabsContent value="pictures" className="py-4">
        <PicturesTab pictures={additionalData.pictures} />
      </TabsContent>
      <TabsContent value="staff" className="py-4">
        <StaffTab staff={additionalData.staff} />
      </TabsContent>
      <TabsContent value="reviews" className="py-4">
        <ReviewsTab reviews={additionalData.reviews} />
      </TabsContent>
      <TabsContent value="news" className="py-4">
        <NewsTab animeId={manga.mal_id || manga.id} animeTitle={manga.title} />
      </TabsContent>
    </Tabs>
  )
}
