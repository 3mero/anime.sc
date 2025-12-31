"use client"

import { useCallback, useState, useEffect } from "react"
import Image from "next/image"
import { useAuth } from "@/hooks/use-auth"
import { useLogger } from "@/hooks/use-logger"
import { miscTranslations } from "@/i18n/misc"
import { getLatestNewsFromAniList } from "@/lib/anilist/requests"
import type { JikanNewsArticle } from "@/lib/types"
import { translateTextServer } from "@/lib/translation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Bell, Heart, Pin, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react"

export default function NewsPage() {
  const { listData, setListData } = useAuth()
  const { addLog } = useLogger()
  const [language, setLanguage] = useState<"ar" | "en">(() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("language") as "ar" | "en"
      return savedLang || "ar"
    }
    return "ar"
  })
  const t = (key: string) => {
    const translations = miscTranslations[language] as Record<string, string>
    return translations[key] || key
  }

  const [news, setNews] = useState<JikanNewsArticle[]>([])
  const [isLoadingNews, setIsLoadingNews] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [lastSeenTime, setLastSeenTime] = useState(0)
  const [activeTab, setActiveTab] = useState<"latest" | "pinned" | "favorite">("latest")
  const pinnedNews = listData.pinnedNews || []
  const favoriteNews = listData.favoriteNews || []
  const [hasNextPage, setHasNextPage] = useState(false)

  const loadNews = useCallback(async () => {
    setIsLoadingNews(true)
    try {
      const result = await getLatestNewsFromAniList(currentPage, 30, addLog)
      setNews(result.news)
      setHasNextPage(result.hasNextPage)
    } catch (error) {
      console.error("Failed to load news:", error)
      addLog("Failed to load news", "error", error)
      setNews([])
    } finally {
      setIsLoadingNews(false)
    }
  }, [currentPage, addLog])

  useEffect(() => {
    loadNews()
    const lastSeen = localStorage.getItem("newsLastSeen")
    if (lastSeen) {
      setLastSeenTime(Number.parseInt(lastSeen))
    }
  }, [loadNews])

  useEffect(() => {
    return () => {
      localStorage.setItem("newsLastSeen", Date.now().toString())
    }
  }, [])

  const togglePin = (article: JikanNewsArticle) => {
    setListData((current) => {
      const isPinned = current.pinnedNews?.some((n) => n.mal_id === article.mal_id)
      if (isPinned) {
        return {
          ...current,
          pinnedNews: current.pinnedNews?.filter((n) => n.mal_id !== article.mal_id) || [],
        }
      } else {
        return {
          ...current,
          pinnedNews: [...(current.pinnedNews || []), article],
        }
      }
    })
  }

  const toggleFavorite = (article: JikanNewsArticle) => {
    setListData((current) => {
      const isFavorite = current.favoriteNews?.some((n) => n.mal_id === article.mal_id)
      if (isFavorite) {
        return {
          ...current,
          favoriteNews: current.favoriteNews?.filter((n) => n.mal_id !== article.mal_id) || [],
        }
      } else {
        return {
          ...current,
          favoriteNews: [...(current.favoriteNews || []), article],
        }
      }
    })
  }

  const clearAllPinned = () => {
    setListData((current) => ({
      ...current,
      pinnedNews: [],
    }))
    addLog("Cleared all pinned news", "info")
  }

  const clearAllFavorite = () => {
    setListData((current) => ({
      ...current,
      favoriteNews: [],
    }))
    addLog("Cleared all favorite news", "info")
  }

  const handleTranslate = async (article: JikanNewsArticle) => {
    try {
      const [translatedTitle, translatedExcerpt] = await Promise.all([
        translateTextServer(article.title, language),
        translateTextServer(article.excerpt, language),
      ])

      if (translatedTitle && translatedExcerpt) {
        setNews((current) =>
          current.map((n) =>
            n.mal_id === article.mal_id ? { ...n, title: translatedTitle, excerpt: translatedExcerpt } : n,
          ),
        )
      }
    } catch (error) {
      console.error("Translation failed:", error)
      addLog("Translation failed", "error", error)
    }
  }

  const getFilteredNews = () => {
    if (activeTab === "latest") {
      return news
    } else if (activeTab === "pinned") {
      return pinnedNews
    } else if (activeTab === "favorite") {
      return favoriteNews
    }
    return []
  }

  const cleanHtmlTags = (text: string): string => {
    if (!text) return ""
    // Replace <br> tags with newlines
    let cleaned = text.replace(/<br\s*\/?>/gi, "\n")
    // Remove all other HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, "")
    // Decode HTML entities
    const textarea = document.createElement("textarea")
    textarea.innerHTML = cleaned
    return textarea.value
  }

  const renderNewsCard = (article: JikanNewsArticle) => {
    const newsId = article.mal_id.toString()
    const isPinned = pinnedNews.some((n) => n.mal_id.toString() === newsId)
    const isFavorite = favoriteNews.some((n) => n.mal_id.toString() === newsId) || false
    const displayTitle = cleanHtmlTags(article.title)
    const displayExcerpt = cleanHtmlTags(article.excerpt)
    const isNew = new Date(article.date).getTime() > lastSeenTime

    return (
      <Card className={`${isPinned ? "border-primary shadow-lg" : ""} ${isNew ? "border-yellow-500/50" : ""}`}>
        <div className="flex flex-col md:flex-row gap-4 p-6">
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

          <div className="flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {isNew && activeTab === "latest" && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-yellow-500" />
                  )}
                  {isPinned && <span className="ml-2 text-xs text-muted-foreground">({pinnedNews.length})</span>}
                </div>
                <h3 className="text-2xl font-bold leading-tight break-words mb-2">{displayTitle}</h3>
                {article.anime_title && (
                  <p className="text-base text-muted-foreground font-medium">{article.anime_title}</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {new Date(article.date).toLocaleDateString()}
                  {article.author_username && ` • ${t("by")} ${article.author_username}`}
                </p>
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => togglePin(article)}
                  className={isPinned ? "text-primary" : ""}
                  title={isPinned ? t("unpin") : t("pin")}
                >
                  {isPinned ? <Pin className="w-5 h-5 fill-current" /> : <Pin className="w-5 h-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleFavorite(article)}
                  className={isFavorite ? "text-red-500" : ""}
                  title={isFavorite ? t("remove_from_favorites") : t("add_to_favorites")}
                >
                  {isFavorite ? <Heart className="w-5 h-5 fill-current" /> : <Heart className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap break-words mb-4">
                {displayExcerpt}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap mt-auto pt-4">
              <Button variant="outline" size="sm" onClick={() => handleTranslate(article)}>
                <Pin className="w-4 h-4 mr-2" />
                {t("translate")}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-center gap-3">
            <Bell className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{t("latest_anime_news")}</h1>
          </div>

          {/* Sticky Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
            <div className="sticky top-16 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-2 -mx-4 px-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="latest" className="relative">
                  {t("latest")}
                  {activeTab === "latest" && news.some((n) => new Date(n.date).getTime() > lastSeenTime) && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-yellow-500" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="pinned" className="relative">
                  {t("pinned_news")}
                  {pinnedNews.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">({pinnedNews.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="favorite" className="relative">
                  {t("favorite_news")}
                  {favoriteNews.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">({favoriteNews.length})</span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Latest News Tab */}
            <TabsContent value="latest" className="space-y-4 mt-4">
              {isLoadingNews ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : getFilteredNews().length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">{t("no_news")}</CardContent>
                </Card>
              ) : (
                <div className="space-y-4">{getFilteredNews().map((article) => renderNewsCard(article))}</div>
              )}
            </TabsContent>

            {/* Pinned News Tab */}
            <TabsContent value="pinned" className="space-y-4 mt-4">
              {pinnedNews.length > 0 && (
                <div className="flex justify-end">
                  <Button variant="destructive" size="sm" onClick={clearAllPinned}>
                    <X className="h-4 w-4 mr-2" />
                    {t("clear_all")}
                  </Button>
                </div>
              )}
              {getFilteredNews().length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">{t("no_pinned_news")}</CardContent>
                </Card>
              ) : (
                <div className="space-y-4">{getFilteredNews().map((article) => renderNewsCard(article))}</div>
              )}
            </TabsContent>

            {/* Favorite News Tab */}
            <TabsContent value="favorite" className="space-y-4 mt-4">
              {favoriteNews.length > 0 && (
                <div className="flex justify-end">
                  <Button variant="destructive" size="sm" onClick={clearAllFavorite}>
                    <X className="h-4 w-4 mr-2" />
                    {t("clear_all")}
                  </Button>
                </div>
              )}
              {getFilteredNews().length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">{t("no_favorite_news")}</CardContent>
                </Card>
              ) : (
                <div className="space-y-4">{getFilteredNews().map((article) => renderNewsCard(article))}</div>
              )}
            </TabsContent>
          </Tabs>

          {/* Pagination - only show for latest news */}
          {activeTab === "latest" && !isLoadingNews && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("previous")}
              </Button>
              <span className="px-4 py-2 text-sm">{currentPage}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => p + 1)} disabled={!hasNextPage}>
                {t("next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
