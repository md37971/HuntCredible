
export const CATEGORIES = {
  wildlife: { label: 'Wildlife', color: 'green' },
  scenery: { label: 'Scenery', color: 'blue' },
  tracks: { label: 'Tracks', color: 'orange' },
  antlers: { label: 'Antlers', color: 'grape' },
}

const ANIMAL_COLORS = { deer: 'green', bear: 'indigo', boar: 'orange', rabbit: 'grape', squirrel: 'yellow' }
const capitalize = (t) => t.charAt(0).toUpperCase() + t.slice(1)

export function categoryOf(c) {
  if (c?.category && CATEGORIES[c.category]) return CATEGORIES[c.category]
  const key = c?.category ?? c?.targetAnimal ?? c?.type
  if (!key) return { label: 'Photo', color: 'gray' }
  return { label: capitalize(String(key)), color: ANIMAL_COLORS[key] ?? 'teal' }
}

export const STATUS = {
  active: { label: 'Open', color: 'green' },
  upcoming: { label: 'Upcoming', color: 'blue' },
  ended: { label: 'Ended', color: 'gray' },
}

export const statusOf = (c, now = Date.now()) =>
  now < new Date(c.startDate) ? 'upcoming' : now > new Date(c.endDate) ? 'ended' : 'active'

export function duration(ms) {
  const mins = Math.max(0, Math.floor(ms / 60000))
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function timeLabel(c, now = Date.now()) {
  const status = statusOf(c, now)
  if (status === 'upcoming') return `Starts in ${duration(new Date(c.startDate) - now)}`
  if (status === 'active') return `Ends in ${duration(new Date(c.endDate) - now)}`
  return `Ended ${formatDate(c.endDate)}`
}

export const fullName = (u) => `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || 'Unknown'

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
