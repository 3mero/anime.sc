export function isArabicText(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF]/
  return arabicPattern.test(text)
}
