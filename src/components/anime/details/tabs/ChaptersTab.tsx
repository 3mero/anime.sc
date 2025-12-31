"use client"

import { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, ExternalLink, ArrowUp, ArrowDown, CheckCheck, Trash2, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Anime, ListData } from "@/lib/types"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { CustomLinksDialog } from "./CustomLinksDialog"

interface ChaptersTabProps {
  manga: Anime
  listData: ListData
}

function generateChaptersFromCustomLink(manga: Anime, linkInfo: { template: string }) {
  if (!linkInfo.template) return []

  try {
    const chapterMap: Record<string, string> = JSON.parse(linkInfo.template)
    const chapterNumbers = Object.keys(chapterMap)
      .map(Number)
      .sort((a, b) => a - b)

    if (chapterNumbers.length === 0) return []

    const chapters = []
    for (const chNumber of chapterNumbers) {
      const url = chapterMap[String(chNumber)]
      chapters.push({
        number: chNumber,
        title: `Chapter ${chNumber}`,
        url: url || "#",
        hasLink: !!url && url !== "#",
      })
    }
    return chapters
  } catch (e) {
    console.error("Failed to parse custom chapter links JSON:", e)
    return []
  }
}

export function ChaptersTab({ manga, listData }: ChaptersTabProps) {
  const { t } = useTranslation()
  const { toggleChapterRead, markAllChaptersRead, unmarkAllChaptersRead, authMode } = useAuth()
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  const allChapters = useMemo(() => {
    if (!listData || !listData.customEpisodeLinks) {
      return []
    }

    const currentLinkInfo = listData.customEpisodeLinks[manga.id]
    if (currentLinkInfo && currentLinkInfo.template) {
      return generateChaptersFromCustomLink(manga, currentLinkInfo)
    } else {
      return []
    }
  }, [manga, listData])

  const mangaKey = manga.id.toString()
  const readChaptersData = listData.readChapters?.[mangaKey]
  const readChapters = useMemo(() => {
    return new Set(readChaptersData?.read?.map((ch) => Number.parseInt(ch, 10)) || [])
  }, [readChaptersData])

  const sortedChapters = useMemo(() => {
    return [...allChapters].sort((a, b) => {
      if (sortOrder === "asc") {
        return a.number - b.number
      } else {
        return b.number - a.number
      }
    })
  }, [allChapters, sortOrder])

  const handleChapterClick = useCallback(
    (chapterNumber: number) => {
      if (authMode === "none") return
      toggleChapterRead(manga, String(chapterNumber))
    },
    [authMode, manga, toggleChapterRead],
  )

  const handleMarkAllRead = () => {
    if (authMode === "none" || allChapters.length === 0) return
    const allChapterIds = allChapters.map((ch) => String(ch.number))
    markAllChaptersRead(manga, allChapterIds)
  }

  const handleMarkAllUnread = () => {
    if (authMode === "none" || readChapters.size === 0) return
    unmarkAllChaptersRead(manga)
  }

  const totalChapters = allChapters.length
  const allChaptersRead = totalChapters > 0 && readChapters.size >= totalChapters

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            {t("chapters")}
            {totalChapters > 0 && (
              <Badge variant="secondary" className="text-sm">
                {readChapters.size} / {totalChapters}
              </Badge>
            )}
          </div>
          {sortedChapters.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              >
                {sortOrder === "asc" ? <ArrowUp className="mr-2 h-4 w-4" /> : <ArrowDown className="mr-2 h-4 w-4" />}
                {t("sort")}
              </Button>
              {!allChaptersRead && authMode !== "none" && (
                <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                  <CheckCheck className="mr-2 h-4 w-4" /> {t("mark_all_as_read")}
                </Button>
              )}
              {readChapters.size > 0 && authMode !== "none" && (
                <Button variant="destructive" size="sm" onClick={handleMarkAllUnread}>
                  <Trash2 className="mr-2 h-4 w-4" /> {t("unmark_all_as_read")}
                </Button>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedChapters.length > 0 ? (
          <ScrollArea className="h-96">
            <div className="space-y-2 pr-4">
              {sortedChapters.map((chapter) => {
                const isRead = authMode !== "none" && readChapters.has(chapter.number)
                const hasLink = chapter.hasLink

                const content = (
                  <div
                    className={cn(
                      "flex items-center justify-between p-3 rounded-md transition-colors cursor-pointer",
                      isRead
                        ? "bg-muted/50 text-muted-foreground"
                        : hasLink
                          ? "hover:bg-primary/10"
                          : "hover:bg-muted/30",
                    )}
                    onClick={(e) => {
                      if (!hasLink) {
                        e.preventDefault()
                        handleChapterClick(chapter.number)
                      }
                    }}
                  >
                    <div className="flex items-center gap-4 flex-grow overflow-hidden">
                      <div className="flex-grow overflow-hidden">
                        <p className={cn("font-semibold truncate", isRead && "line-through")}>
                          {t("chapter")} {chapter.number}
                        </p>
                        {hasLink && (
                          <p className="text-xs text-blue-400 flex items-center gap-1">
                            {t("custom_link")} <ExternalLink className="w-3 h-3" />
                          </p>
                        )}
                      </div>
                    </div>
                    {authMode !== "none" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleChapterClick(chapter.number)
                        }}
                      >
                        <Check className={cn("h-5 w-5", isRead ? "text-primary" : "text-muted-foreground")} />
                      </Button>
                    )}
                  </div>
                )

                if (hasLink) {
                  return (
                    <a key={chapter.number} href={chapter.url} target="_blank" rel="noopener noreferrer">
                      {content}
                    </a>
                  )
                }

                return <div key={chapter.number}>{content}</div>
              })}
            </div>
          </ScrollArea>
        ) : null}
        <div className="mt-4 text-center">
          <CustomLinksDialog anime={manga} isManga={true} />
        </div>
      </CardContent>
    </Card>
  )
}
