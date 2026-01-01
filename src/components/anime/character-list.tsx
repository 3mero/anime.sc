"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card } from "@/components/ui/card"
import type { JikanCharacter } from "@/lib/types"
import { Users, Loader2, PlusCircle, AlertCircle } from "lucide-react"
import { Button } from "../ui/button"
import { useTranslation } from "@/hooks/use-translation"
import { Alert, AlertDescription, AlertTitle } from "../ui/alert"

const INITIAL_VISIBLE_COUNT = 12
const LOAD_MORE_COUNT = 12

interface CharacterListProps {
  characters: JikanCharacter[] | null
  isLoading: boolean
  error: string | null
  lang: string
}

export function CharacterList({ characters, isLoading, error, lang }: CharacterListProps) {
  const { t } = useTranslation()
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Characters</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!characters || characters.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t("no_characters_found")}</div>
  }

  const mainCharacters = characters.filter((c) => c.role === "Main" || c.role === "MAIN")
  const supportingCharacters = characters.filter((c) => c.role === "Supporting" || c.role === "SUPPORTING")

  const allCharacters = [...mainCharacters, ...supportingCharacters]

  const visibleCharacters = allCharacters.slice(0, visibleCount)
  const hasMoreToLoad = visibleCount < allCharacters.length

  return (
    <div>
      <h3 className="text-xl font-headline font-semibold mb-4 flex items-center gap-2">
        <Users className="w-6 h-6 text-primary" />
        {t("characters")}
      </h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {visibleCharacters.map(({ character, voice_actors }, index) => {
          const japaneseVA = voice_actors?.[0]
          const characterId = character.mal_id || `char-${index}`
          const characterImage = character.images?.jpg?.image_url || "/placeholder.svg"
          const characterName = character.name || "Unknown"
          const voiceActorName = japaneseVA?.person?.name || ""

          return (
            <Link href={`/character/${characterId}`} key={characterId} className="group block text-center">
              <Card className="overflow-hidden transition-all duration-300 ease-in-out group-hover:scale-105 group-hover:shadow-md">
                <div className="relative aspect-[2/3] w-full">
                  <Image
                    src={characterImage || "/placeholder.svg"}
                    alt={characterName}
                    fill
                    unoptimized
                    referrerPolicy="no-referrer"
                    className="object-cover"
                    sizes="(max-width: 768px) 33vw, 16vw"
                    data-ai-hint="anime character"
                  />
                </div>
              </Card>
              <p className="mt-2 text-sm font-semibold truncate group-hover:text-primary">{characterName}</p>
              {voiceActorName && <p className="text-xs text-muted-foreground truncate">{voiceActorName}</p>}
            </Link>
          )
        })}
      </div>
      {hasMoreToLoad && (
        <div className="text-center mt-4">
          <Button variant="outline" onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_COUNT)}>
            <PlusCircle className="mr-2" /> {t("show_more")}
          </Button>
        </div>
      )}
    </div>
  )
}
