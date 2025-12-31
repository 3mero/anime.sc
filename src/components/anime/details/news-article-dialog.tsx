"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Languages, Loader2, ChevronDown, ChevronUp } from "lucide-react"
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
  const [isExpanded, setIsExpanded] = useState(false)

  const isLongText = article.excerpt.length > 300

  const handleTranslate = async () => {
    if (translatedContent) {
      setTranslatedContent(null)
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
      setIsExpanded(true)
    } catch (error) {
      console.error("Translation failed:", error)
    } finally {
      setIsTranslating(false)
    }
  }

  const displayTitle = translatedContent?.title || article.title
  const displayExcerpt = translatedContent?.excerpt || article.excerpt

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl leading-tight">{displayTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {format(new Date(article.date), "PPP", { locale: lang === "ar" ? ar : undefined })}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className={`transition-all duration-300 ${isExpanded ? "" : "max-h-64 overflow-hidden"}`}>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">{displayExcerpt}</p>
          </div>

          {article.author_username && (
            <p className="text-xs text-muted-foreground border-t pt-3">
              {t("by")} {article.author_username}
            </p>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleTranslate} disabled={isTranslating}>
              {isTranslating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Languages className="w-4 h-4 mr-2" />
              )}
              {translatedContent ? t("original_text") : t("translate")}
            </Button>

            {isLongText && (
              <Button variant="outline" onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-2" />
                    {t("show_less")}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-2" />
                    {t("show_more")}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
