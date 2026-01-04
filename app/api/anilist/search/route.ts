import { type NextRequest, NextResponse } from "next/server"

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 2000, 4000] // Exponential backoff: 1s, 2s, 4s

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Log the request for debugging
    console.log('[AniList API Route] Request variables:', JSON.stringify(body.variables))

    // Retry loop with exponential backoff for rate limit errors
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      })

      // Handle rate limit errors with retry
      if (res.status === 429 && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt]
        console.log(`Rate limit hit (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying after ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      if (!res.ok) {
        const errorBody = await res.text()
        
        // Enhanced logging for 500 errors
        if (res.status === 500) {
          console.error('[AniList API Route] 500 Error Details:', {
            variables: body.variables,
            queryLength: body.query?.length,
            errorBody: errorBody.substring(0, 500) // First 500 chars
          })
        }
        
        return NextResponse.json(
          {
            error: `Anilist API error: ${res.statusText}`,
            details: errorBody,
            ...(res.status === 429 && { retriesExhausted: true, attempts: attempt + 1 }),
          },
          { status: res.status },
        )
      }

      const data = await res.json()
      if (attempt > 0) {
        console.log(`Request succeeded after ${attempt} retries`)
      }
      return NextResponse.json(data)
    }

    // Should not reach here, but just in case
    return NextResponse.json(
      { error: "Max retries exceeded", details: "Rate limit retries exhausted" },
      { status: 429 },
    )
  } catch (error: any) {
    console.error('[AniList API Route] Caught exception:', error)
    
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Request timeout", details: "AniList API did not respond in time" },
        { status: 504 },
      )
    }

    return NextResponse.json({ error: "Failed to fetch", details: error.message || String(error) }, { status: 500 })
  }
}
