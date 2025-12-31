"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Loader2, Languages, Pin, Heart } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import type { JikanNewsArticle } from "@/lib/types"
import { useTranslation } from "@/hooks/use-translation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { translateTextServer } from "@/lib/translation"
import Image from "next/image"
import { getLatestNewsFromAniList } from "@/lib/anilist/requests"
import { useLogger } from "@/hooks/use-logger"

interface NewsTabProps {
  animeId: number
  animeTitle?: string
}

export function NewsTab({ animeId, animeTitle }: NewsTabProps) {
  const { t, lang } = useTranslation()
  const { addLog } = useLogger()
  const [news, setNews] = useState<JikanNewsArticle[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [displayCount, setDisplayCount] = useState(8)
  const [translatedNews, setTranslatedNews] = useState<Record<string, { title: string; excerpt: string }>>({})
  const [expandedNews, setExpandedNews] = useState<Record<string, number>>({})
  const [translatingId, setTranslatingId] = useState<string | null>(null)
  const [pinnedNews, setPinnedNews] = useState<Set<string>>(new Set())
  const [favoriteNews, setFavoriteNews] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true)
      try {
        const { news: latestNews } = await getLatestNewsFromAniList(1, 30, addLog)
        // Filter news related to this anime if animeTitle is provided
        const filtered = animeTitle
          ? latestNews.filter(
              (n) =>
                n.anime_title?.toLowerCase().includes(animeTitle.toLowerCase()) ||
                n.title.toLowerCase().includes(animeTitle.toLowerCase()),
            )
          : latestNews
        setNews(filtered.length > 0 ? filtered : latestNews.slice(0, 20))
      } catch (error) {
        console.error("Error loading news:", error)
        setNews([])
      } finally {
        setLoading(false)
      }
    }

    loadNews()

    // Load pinned and favorite news from localStorage
    const savedPinned = localStorage.getItem("pinnedAnimeNews")
    if (savedPinned) {
      setPinnedNews(new Set(JSON.parse(savedPinned)))
    }
    const savedFavorite = localStorage.getItem("favoriteAnimeNews")
    if (savedFavorite) {
      setFavoriteNews(new Set(JSON.parse(savedFavorite)))
    }
  }, [animeId, animeTitle, addLog])

  const togglePin = (newsId: string) => {
    const newPinned = new Set(pinnedNews)
    if (newPinned.has(newsId)) {
      newPinned.delete(newsId)
    } else {
      newPinned.add(newsId)
    }
    setPinnedNews(newPinned)
    localStorage.setItem("pinnedAnimeNews", JSON.stringify([...newPinned]))
  }

  const toggleFavorite = (newsId: string) => {
    const newFavorite = new Set(favoriteNews)
    if (newFavorite.has(newsId)) {
      newFavorite.delete(newsId)
    } else {
      newFavorite.add(newsId)
    }
    setFavoriteNews(newFavorite)
    localStorage.setItem("favoriteAnimeNews", JSON.stringify([...newFavorite]))
  }

  const handleTranslate = async (article: JikanNewsArticle) => {
    const newsId = article.mal_id.toString()

    if (translatedNews[newsId]) {
      const { [newsId]: _, ...rest } = translatedNews
      setTranslatedNews(rest)
      return
    }

    setTranslatingId(newsId)
    try {
      const [translatedTitle, translatedExcerpt] = await Promise.all([
        translateTextServer(article.title, "ar"),
        translateTextServer(article.excerpt, "ar"),
      ])

      setTranslatedNews({
        ...translatedNews,
        [newsId]: {
          title: translatedTitle || article.title,
          excerpt: translatedExcerpt || article.excerpt,
        },
      })

      setExpandedNews({
        ...expandedNews,
        [newsId]: Math.max((translatedExcerpt || article.excerpt).length, expandedNews[newsId] || 500),
      })
    } catch (error) {
      console.error("Translation failed:", error)
    } finally {
      setTranslatingId(null)
    }
  }

  const toggleExpand = (newsId: string) => {
    setExpandedNews({
      ...expandedNews,
      [newsId]: (expandedNews[newsId] || 500) + 1000,
    })
  }

  if (loading || news === null) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Skeleton className="w-full md:w-64 h-64 md:h-80 rounded-lg" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (news.length === 0) {
    return (
      <Alert>
        <AlertDescription>{t("no_news_available")}</AlertDescription>
      </Alert>
    )
  }

  const displayedNews = news.slice(0, displayCount)
  const hasMoreNews = news.length > displayCount

  const NewsCard = ({ article }: { article: JikanNewsArticle }) => {
    const newsId = article.mal_id.toString()
    const isPinned = pinnedNews.has(newsId)
    const isFavorite = favoriteNews.has(newsId)
    const isTranslated = !!translatedNews[newsId]
    const displayTitle = translatedNews[newsId]?.title || article.title
    const displayExcerpt = translatedNews[newsId]?.excerpt || article.excerpt
    const expandedChars = expandedNews[newsId] || 500
    const isTruncated = displayExcerpt.length > expandedChars
    const visibleText = isTruncated ? displayExcerpt.slice(0, expandedChars) : displayExcerpt

    return (
      <Card className={`${isPinned ? "border-primary shadow-lg" : ""}`}>
        <div className="flex flex-col md:flex-row gap-4 p-6">
          {/* Image Section */}
          {article.anime_image && (
            <div className="relative w-full md:w-64 h-64 md:h-80 flex-shrink-0">
              <Image
                src={article.anime_image || "/placeholder.svg"}
                alt={article.anime_title || article.title}
                fill
                className="rounded-lg object-cover shadow-md"
                sizes="(max-width: 768px) 100vw, 256px"
                unoptimized
              />
            </div>
          )}

          {/* Content Section */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {isPinned && (
                    <Badge variant="secondary" className="text-xs">
                      {t("pinned")}
                    </Badge>
                  )}
                </div>
                <h3 className="text-2xl font-bold leading-tight break-words mb-2">{displayTitle}</h3>
                {article.anime_title && (
                  <p className="text-base text-muted-foreground font-medium">{article.anime_title}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {format(new Date(article.date), "PPP", { locale: lang === "ar" ? ar : undefined })}
                  {article.author_username && ` • ${t("by")} ${article.author_username}`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => togglePin(newsId)}
                  className={isPinned ? "text-primary" : ""}
                >
                  {isPinned ? <Pin className="w-5 h-5 fill-current" /> : <Pin className="w-5 h-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFavorite(newsId)}
                  className={isFavorite ? "text-red-500" : ""}
                >
                  {isFavorite ? <Heart className="w-5 h-5 fill-current" /> : <Heart className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap break-words mb-4">
                {visibleText}
                {isTruncated && "..."}
              </p>
            </div>

            {/* Bottom Buttons */}
            <div className="flex gap-2 flex-wrap mt-auto pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTranslate(article)}
                disabled={translatingId === newsId}
              >
                {translatingId === newsId ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Languages className="w-4 h-4 mr-2" />
                )}
                {isTranslated ? t("original_text") : t("translate")}
              </Button>

              {isTruncated && (
                <Button variant="outline" size="sm" onClick={() => toggleExpand(newsId)}>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  {t("show_more")}
                </Button>
              )}

              {!isTruncated && displayExcerpt.length > 500 && (
                <Button variant="outline" size="sm" onClick={() => setExpandedNews({ ...expandedNews, [newsId]: 500 })}>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  {t("show_less")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-6">
        {displayedNews.map((article) => (
          <NewsCard key={article.mal_id} article={article} />
        ))}
      </div>

      {hasMoreNews && (
        <Button variant="outline" size="lg" onClick={() => setDisplayCount((prev) => prev + 8)} className="w-full mt-6">
          <ChevronDown className="w-4 h-4 mr-2" />
          {t("show_more")} ({news.length - displayCount} {t("remaining")})
        </Button>
      )}
    </>
  )
}
