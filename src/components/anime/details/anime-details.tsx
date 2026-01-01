"use client"

import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import type { Anime } from "@/lib/types"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, Tv, Calendar, Tag, Bookmark, Video, Bell } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { SceneSearchDialog } from "./scene-search-dialog"
import { cn } from "@/lib/utils"
import { ReminderDialog } from "@/components/notifications/reminder-dialog"

export const AnimeDetails = ({ anime }: { anime: Anime }) => {
  const isManga =
    anime.type === "MANGA" || anime.format === "MANGA" || anime.format === "NOVEL" || anime.format === "ONE_SHOT"

  const {
    authMode,
    isPlannedToWatch,
    togglePlanToWatch,
    isCurrentlyWatching,
    toggleCurrentlyWatching,
    isPlannedToRead,
    togglePlanToRead,
    isCurrentlyReading,
    toggleCurrentlyReading,
  } = useAuth()
  const { t } = useTranslation()

  const planned = isManga ? isPlannedToRead(anime.id) : isPlannedToWatch(anime.id)
  const currentlyActive = isManga ? isCurrentlyReading(anime.id) : isCurrentlyWatching(anime.id)

  const translatedStatus = t(anime.status.toLowerCase().replace(/ /g, "_").replace(/-/g, "_") || "unknown")

  const ratingKey = anime.rating
    ? `rating_${anime.rating.toLowerCase().replace(/[^a-z0-9]/g, "")}`
    : "rating_pg13teensor older" // Default to PG-13
  const translatedRating = t(ratingKey)

  const n_a = t("n_a")
  const translatedType = t(anime.type?.toLowerCase().replace(/ /g, "_") || "tv")

  const posterImage = anime.images.webp.large_image_url || anime.images.jpg.large_image_url

  return (
    <Card className="overflow-hidden sticky top-20">
      <CardHeader className="p-0 relative">
        <div className="relative aspect-[2/3] w-full">
          <Image
            src={posterImage || `https://picsum.photos/seed/${anime.id}/400/600`}
            alt={`Poster for ${anime.title}`}
            fill
            unoptimized
            className={cn("object-cover")}
            data-ai-hint="anime poster"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {anime.score && (
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-lg">{anime.score.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">
              ({anime.scored_by?.toLocaleString()} {t("votes")})
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {authMode !== "none" && (
            <Button
              className="w-full flex-wrap"
              variant={currentlyActive ? "secondary" : "outline"}
              onClick={() => (isManga ? toggleCurrentlyReading(anime) : toggleCurrentlyWatching(anime))}
            >
              <Video className={cn(currentlyActive ? "text-green-400" : "text-muted-foreground")} />
              {currentlyActive
                ? isManga
                  ? t("reading")
                  : t("watching")
                : isManga
                  ? t("currently_reading")
                  : t("currently_watching")}
            </Button>
          )}
          {authMode !== "none" && (
            <Button
              className="w-full flex-wrap"
              variant={planned ? "secondary" : "outline"}
              onClick={() => (isManga ? togglePlanToRead(anime) : togglePlanToWatch(anime))}
            >
              <Bookmark className={cn(planned ? "text-yellow-400" : "text-muted-foreground")} />
              {planned ? t("planned") : isManga ? t("plan_to_read_btn") : t("plan_to_watch_btn")}
            </Button>
          )}
          {anime.id && <SceneSearchDialog animeId={anime.id} animeTitle={anime.title} posterImage={posterImage} />}
          {authMode !== "none" && (
            <ReminderDialog anime={anime}>
              <Button variant="outline" className="w-full flex-wrap bg-transparent">
                <Bell className="text-purple-400" />
                {t("add_reminder")}
              </Button>
            </ReminderDialog>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Tv className="w-4 h-4 text-muted-foreground" />
          <span>
            {translatedType} &bull; {isManga ? anime.chapters || n_a : anime.episodes || n_a}{" "}
            {isManga ? t("chapters_count") : t("episodes_count")}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span>
            {anime.year || n_a} &bull; {translatedStatus}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <span>
            {t("rating")}: {translatedRating || n_a}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
