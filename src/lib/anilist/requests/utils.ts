import type { Reminder } from "../../types"
import { isPast, nextDay } from "date-fns"

export const isReminderDue = (reminder: Reminder): boolean => {
  const now = new Date()
  const startDate = new Date(reminder.startDateTime)

  if (reminder.repeatIntervalDays === 0 && (!reminder.repeatOnDays || reminder.repeatOnDays.length === 0)) {
    return isPast(startDate)
  }

  if (reminder.repeatOnDays && reminder.repeatOnDays.length > 0) {
    const sortedRepeatDays = [...reminder.repeatOnDays].sort((a, b) => a - b)

    for (const day of sortedRepeatDays) {
      const nextOccurrence = nextDay(now, day as any)
      nextOccurrence.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0)

      if (!isPast(nextOccurrence)) {
        return false
      }
    }
    return true
  }

  if (isPast(startDate)) {
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysSinceStart % reminder.repeatIntervalDays === 0 || daysSinceStart > 0
  }

  return false
}
