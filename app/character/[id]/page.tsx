"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { getCharacterDetails, getCharacterVoiceActors } from "@/lib/anilist"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { User, Mic, Tv, Star, Loader2, Languages, Undo2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { translateTextServer } from "@/lib/translation"
import { useTranslation } from "@/hooks/use-translation"
import { useLogger } from "@/hooks/use-logger"
import { BackButton } from "@/components/ui/back-button"

function VoiceActorCard({ va }: { va: any }) {
  return (
    <Card className="p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-4">
        <div className="relative h-20 w-16 rounded-sm overflow-hidden shrink-0">
          <Image
            src={va.image.large || "/placeholder.svg"}
            alt={va.name.full}
            fill
            className="object-cover"
            sizes="64px"
            unoptimized
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg">{va.name.full}</p>
          {va.name.native && <p className="text-sm text-muted-foreground">{va.name.native}</p>}
          <p className="text-sm text-muted-foreground mt-1">{va.languageV2 || "Japanese"}</p>
          {va.anime && va.anime.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Voiced in:</p>
              <div className="space-y-1">
                {va.anime.slice(0, 3).map((item: any, idx: number) => (
                  <Link
                    href={`/anime/${item.anime.idMal || item.anime.id}`}
                    key={idx}
                    className="block text-sm hover:text-primary transition-colors"
                  >
                    • {item.anime.title.english || item.anime.title.romaji} ({item.role})
                  </Link>
                ))}
                {va.anime.length > 3 && <p className="text-xs text-muted-foreground">+{va.anime.length - 3} more</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

function OtherAppearancesTab({ mediaList }: { mediaList: any[] }) {
  if (mediaList.length === 0)
    return <div className="text-center py-8 text-muted-foreground">No other appearances found.</div>
  return (
    <ScrollArea className="h-96">
      <div className="space-y-3 pr-4">
        {mediaList.map((edge: any) => {
          const media = edge.node
          return (
            <Link href={`/anime/${media.idMal || media.id}`} key={media.id}>
              <Card className="flex items-center p-3 hover:bg-muted/50 transition-colors">
                <div className="relative h-20 w-14 rounded-sm overflow-hidden mr-4 shrink-0">
                  <Image
                    src={media.coverImage.large || "/placeholder.svg"}
                    alt={media.title.english || media.title.romaji}
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized
                  />
                </div>
                <div className="overflow-hidden">
                  <p className="font-semibold truncate">{media.title.english || media.title.romaji}</p>
                  <p className="text-sm text-muted-foreground">{edge.characterRole || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    {media.format} • {media.type}
                  </p>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </ScrollArea>
  )
}

function LoadingSkeleton() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
        <div className="md:col-span-1">
          <Card className="overflow-hidden sticky top-20">
            <CardHeader className="p-0">
              <Skeleton className="aspect-[2/3] w-full" />
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-1/3" />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2 space-y-8">
          <div>
            <Skeleton className="h-8 w-1/4 mb-3" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div>
            <Skeleton className="h-8 w-1/4 mb-3" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function CharacterPage() {
  const params = useParams()
  const idParam = params.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const [character, setCharacter] = useState<any | null>(null)
  const [voiceActors, setVoiceActors] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [translatedAbout, setTranslatedAbout] = useState<string | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const { toast } = useToast()
  const { t, lang } = useTranslation()
  const { addLog } = useLogger()

  useEffect(() => {
    if (!id || id === "0") {
      addLog(`Invalid character ID: ${id}`, "error")
      notFound()
      return
    }

    async function fetchData() {
      const malId = Number(id)
      setIsLoading(true)
      setCharacter(null)
      setVoiceActors(null)
      setTranslatedAbout(null)
      setShowTranslation(false)

      try {
        addLog(`Fetching character details from AniList for ID: ${id}`)
        const anilistData = await getCharacterDetails(malId, addLog)

        if (anilistData) {
          setCharacter(anilistData)
          addLog(`Successfully fetched character details for "${anilistData.name.full}"`)
        } else {
          addLog(`Character with ID ${id} not found in AniList, may be Jikan-only character`, "warn")
          notFound()
        }
      } catch (error) {
        addLog(`Failed to fetch character details for ID ${id}`, "error", { error })
        console.error(`Failed to fetch character details for ID ${id}:`, error)
        notFound()
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id, toast, t, addLog])

  const handleTabChange = useCallback(
    async (tab: string) => {
      if (tab === "voices" && !voiceActors && id) {
        addLog(`Fetching voice actors for character ID: ${id}`)
        try {
          const vas = await getCharacterVoiceActors(Number(id), addLog)
          setVoiceActors(vas)
          addLog(`Successfully fetched ${vas.length} voice actors for character ID: ${id}`)
        } catch (error) {
          addLog(`Failed to fetch voice actors for character ID ${id}`, "error", { error })
          console.warn(`Failed to fetch voice actors for character ${id}:`, error)
          setVoiceActors([])
          toast({
            variant: "destructive",
            title: t("toast_error_title"),
            description: t("toast_voice_actors_load_failed_desc"),
          })
        }
      }
    },
    [id, voiceActors, toast, t, addLog],
  )

  const handleTranslateToggle = async () => {
    if (showTranslation) {
      setShowTranslation(false)
      return
    }

    if (translatedAbout) {
      setShowTranslation(true)
      return
    }

    const textToTranslate = character?.description
    if (!textToTranslate || !textToTranslate.trim()) {
      addLog("Translation requested for empty biography.", "warn")
      toast({ variant: "destructive", title: t("toast_nothing_to_translate"), description: t("biography_empty") })
      return
    }

    addLog(`Translating biography for character: "${character?.name.full}"`)
    setIsTranslating(true)
    const result = await translateTextServer(textToTranslate)
    if (result) {
      setTranslatedAbout(result)
      setShowTranslation(true)
      addLog(`Successfully translated biography for "${character?.name.full}"`)
    } else {
      addLog(`Translation failed for character "${character?.name.full}"`, "error")
      toast({
        variant: "destructive",
        title: t("toast_translation_failed_title"),
        description: t("toast_biography_translation_failed_desc"),
      })
    }
    setIsTranslating(false)
  }

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!character) return null

  const aboutText =
    showTranslation && translatedAbout ? translatedAbout : character.description || t("no_biography_available")

  return (
    <main className="container mx-auto px-4 py-8">
      <BackButton />
      <div className="grid md:grid-cols-3 gap-8 lg:gap-12 mt-4">
        <div className="md:col-span-1">
          <Card className="overflow-hidden sticky top-20">
            <CardHeader className="p-0 relative">
              <div className="relative aspect-[2/3] w-full">
                <Image
                  src={character.image.large || "/placeholder.svg"}
                  alt={character.name.full}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  unoptimized
                />
              </div>
            </CardHeader>
            <CardContent className={cn("p-4 space-y-2", lang === "ar" && "rtl")}>
              <h1 className="text-2xl font-bold font-headline">{character.name.full}</h1>
              {character.name.native && <h2 className="text-lg text-muted-foreground">{character.name.native}</h2>}
              <div className="flex items-center gap-2 text-sm pt-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span>
                  {character.favourites.toLocaleString()} {t("favorites")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-8">
          <Tabs defaultValue="about" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="about">
                <User className="w-4 h-4 mr-2" />
                {t("about")}
              </TabsTrigger>
              <TabsTrigger value="roles">
                <Tv className="w-4 h-4 mr-2" />
                {t("anime_roles")}
              </TabsTrigger>
              <TabsTrigger value="voices">
                <Mic className="w-4 h-4 mr-2" />
                {t("voice_actors")}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="py-4">
              {character.description ? (
                <Card>
                  <CardHeader className={cn("flex flex-row items-center justify-between", lang === "ar" && "rtl")}>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" /> {t("about")}
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleTranslateToggle} disabled={isTranslating}>
                      {isTranslating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : showTranslation ? (
                        <>
                          <Undo2 className="mr-2 h-4 w-4" />
                          {t("original_text")}
                        </>
                      ) : (
                        <>
                          <Languages className="mr-2 h-4 w-4" />
                          {t("translate_to_arabic")}
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p
                      className={cn(
                        "text-foreground/80 leading-relaxed whitespace-pre-wrap",
                        lang === "ar" && showTranslation && "rtl",
                      )}
                    >
                      {aboutText}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-muted-foreground">{t("no_biography_available")}</div>
              )}
            </TabsContent>
            <TabsContent value="roles" className="py-4">
              <OtherAppearancesTab mediaList={character.media?.edges || []} />
            </TabsContent>
            <TabsContent value="voices" className="py-4">
              {voiceActors === null ? (
                <TabLoading />
              ) : voiceActors.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                  {voiceActors.map((va) => (
                    <VoiceActorCard key={va.id} va={va} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">{t("no_voice_roles_found")}</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  )
}
