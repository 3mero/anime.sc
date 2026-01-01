"use client"

import { useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"

const NotificationBell = () => {
  const { listData } = useAuth()

  const unseenNewsCount = useMemo(() => {
    const newsNotifs = (listData.notifications || []).filter((n) => (n.type === "news" || n.type === "update") && !n.seen)
    return newsNotifs.length
  }, [listData.notifications])

  const unseenRemindersCount = useMemo(() => {
    const reminderNotifs = (listData.notifications || []).filter((n) => n.type === "reminder" && !n.seen)
    return reminderNotifs.length
  }, [listData.notifications])

  const totalUnread = unseenNewsCount + unseenRemindersCount

  const bellColor = useMemo(() => {
    if (unseenRemindersCount > 0) return "bg-purple-500"
    if (unseenNewsCount > 0) return "bg-yellow-500"
    return "bg-primary"
  }, [unseenNewsCount, unseenRemindersCount])

  return <div className={`notification-bell ${bellColor}`}>{totalUnread > 0 && <span>{totalUnread}</span>}</div>
}

export default NotificationBell
