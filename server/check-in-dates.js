function singaporeDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
function validDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date
}
function weekDays(date = singaporeDate()) {
  const day = new Date(`${date}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7)
  return Array.from({ length: 7 }, (_, i) => {
    const item = new Date(day)
    item.setUTCDate(item.getUTCDate() + i)
    return item.toISOString().slice(0, 10)
  })
}
function submissionStatus(date, now = new Date()) {
  const today = singaporeDate(now)
  const yesterday = new Date(today + 'T00:00:00Z')
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  if (date === today) return 'provisional'
  if (date === yesterday.toISOString().slice(0, 10)) return 'completed'
  return null
}
// Provisional entries never become completed automatically as time passes.
function eligibleForFinal(entry) { return entry.status === 'completed' }
module.exports = { singaporeDate, validDate, weekDays, submissionStatus, eligibleForFinal }
