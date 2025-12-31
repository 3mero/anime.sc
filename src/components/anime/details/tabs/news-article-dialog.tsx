"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Languages, Loader2, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import type { JikanNewsArticle } from "@/lib/types"
import { useTranslation } from "@/hooks/use-translation"
import { translateTextServer } from "@/lib/translation"

interface NewsArticleDialogProps {
  article: JikanNewsArticle
  onClose: () => void
}

export function NewsArticleDialog({ article, onClose }: NewsArticleDialogProps) {
  const { t, lang } = useTranslation()
  const [translatedContent, setTranslatedContent] = useState<{
    title: string
    excerpt: string
  } | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [displayedChars, setDisplayedChars] = useState(500)
  const [isTranslated, setIsTranslated] = useState(false)

  const displayExcerpt = translatedContent?.excerpt || article.excerpt
  const isTruncated = displayExcerpt.length > displayedChars
  const visibleText = displayExcerpt.slice(0, displayedChars)

  const handleTranslate = async () => {
    if (isTranslated) {
      setTranslatedContent(null)
      setIsTranslated(false)
      setDisplayedChars(500)
      return
    }

    setIsTranslating(true)
    try {
      const [translatedTitle, translatedExcerpt] = await Promise.all([
        translateTextServer(article.title, "ar"),
        translateTextServer(article.excerpt, "ar"),
      ])

      setTranslatedContent({
        title: translatedTitle || article.title,
        excerpt: translatedExcerpt || article.excerpt,
      })
      setDisplayedChars(500)
      setIsTranslated(true)
    } catch (error) {
      console.error("Translation failed:", error)
    } finally {
      setIsTranslating(false)
    }
  }

  const handleShowMore = () => {
    setDisplayedChars((prev) => prev + 1000)
  }

  const displayTitle = translatedContent?.title || article.title

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full" aria-describedby="news-article-description">
        <DialogHeader>
          <DialogTitle className="text-2xl leading-tight break-words">{displayTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {format(new Date(article.date), "PPP", { locale: lang === "ar" ? ar : undefined })}
          </p>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto" id="news-article-description">
          <div className="transition-all duration-300">
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap break-words text-base">
              {visibleText}
              {isTruncated && "..."}
            </p>
          </div>

          {article.author_username && (
            <p className="text-xs text-muted-foreground border-t pt-3">
              {t("by")} {article.author_username}
            </p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap pt-4 border-t">
          <Button variant="outline" onClick={handleTranslate} disabled={isTranslating} size="sm">
            {isTranslating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Languages className="w-4 h-4 mr-2" />}
            {isTranslated ? t("original_text") : t("translate")}
          </Button>

          {isTruncated && (
            <Button variant="outline" onClick={handleShowMore} size="sm">
              <ChevronDown className="w-4 h-4 mr-2" />
              {t("show_more")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
