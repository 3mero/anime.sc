import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const errorBody = await res.text()
      return NextResponse.json(
        { error: `Anilist API error: ${res.statusText}`, details: errorBody },
        { status: res.status },
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Request timeout", details: "AniList API did not respond in time" },
        { status: 504 },
      )
    }

    return NextResponse.json({ error: "Failed to fetch", details: error.message || String(error) }, { status: 500 })
  }
}
