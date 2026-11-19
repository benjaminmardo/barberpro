const timeZone = 'America/Santiago'
const currency = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' })
const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
})
const shortFormat = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'UTC', day: 'numeric', month: 'short',
})
const clock = new Intl.DateTimeFormat('es-CL', {
  timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export const clp = (amount: number) => currency.format(amount)

export function localDate(value: Date | string = new Date()): string {
  const parts = dayFormat.formatToParts(new Date(value))
  const part = (name: string) => parts.find(({ type }) => type === name)?.value
  return [part('year'), part('month'), part('day')].join('-')
}

export function shiftDate(day: string, offset: number): string {
  const date = new Date(day + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

export const shortDate = (day: string) => shortFormat.format(new Date(day + 'T00:00:00Z'))
export const timeLabel = (iso: string) => clock.format(new Date(iso))
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((word) => word.charAt(0)).join('').toUpperCase()
