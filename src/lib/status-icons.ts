import { Tv, Film, Clapperboard, Monitor, BookOpen } from "lucide-react"

export const typeIcons = {
  TV: Tv,
  TV_SHORT: Tv,
  MOVIE: Film,
  SPECIAL: Clapperboard,
  OVA: Monitor,
  ONA: Monitor,
  MUSIC: Film,
  MANGA: BookOpen,
  NOVEL: BookOpen,
  ONE_SHOT: BookOpen,
} as const

export type WatchingStatus = "watching" | "in-progress" | "watched"
export type ReadingStatus = "reading" | "in-progress" | "read"
