"use server"

export async function translateTextServer(text: string, targetLang: "ar" | "en" = "ar"): Promise<string | null> {
  if (!text) return null

  try {
    const sourceLang = targetLang === "ar" ? "en" : "ar"

    const chunkSize = 400
    const chunks: string[] = []

    if (text.length <= chunkSize) {
      chunks.push(text)
    } else {
      // Split by sentences to maintain context
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
      let currentChunk = ""

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= chunkSize) {
          currentChunk += sentence
        } else {
          if (currentChunk) chunks.push(currentChunk)
          currentChunk = sentence
        }
      }
      if (currentChunk) chunks.push(currentChunk)
    }

    const translationPromises = chunks.map(async (chunk) => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(chunk)}`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      })

      if (!response.ok) {
        console.error("Translation API error:", response.status)
        return chunk
      }

      const data = await response.json()

      if (data && data[0]) {
        return data[0].map((item: any) => item[0]).join("")
      }

      return chunk
    })

    const translatedChunks = await Promise.all(translationPromises)
    const translatedText = translatedChunks.join(" ")

    console.log(`Translation successful: ${text.substring(0, 50)}... -> ${translatedText.substring(0, 50)}...`)
    return translatedText
  } catch (error: any) {
    console.error("Translation error:", error)
    return null
  }
}

function isArabicText(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF]/
  return arabicPattern.test(text)
}

export async function transliterateArabicToEnglish(text: string): Promise<string> {
  if (!isArabicText(text)) {
    return text
  }

  try {
    const translated = await translateTextServer(text, "en")
    return translated || text
  } catch (error) {
    console.error("Transliteration error:", error)
    return text
  }
}
