export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function weekDates(key) {
  const start = new Date(`${key}T12:00:00`)
  start.setDate(start.getDate() - (start.getDay() + 6) % 7)
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return dateKey(d) })
}
export function duration(hours) {
  const total = Math.round(hours * 60)
  return `${Math.floor(total / 60)}h ${total % 60}m`
}
export function usageHours(hours, minutes) {
  if (hours === '' || minutes === '') return null
  const h = Number(hours), m = Number(minutes)
  return Number.isInteger(h) && Number.isInteger(m) && h >= 0 && m >= 0 && m < 60 && h * 60 + m <= 1440 ? h + m / 60 : null
}
