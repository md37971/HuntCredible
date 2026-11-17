import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router'
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Alert, Box, Grid, Group, Paper, Stack, Switch, Text, UnstyledButton,
} from '@mantine/core'
import { errorMessage, getSessionLocations } from '../API/api.js'

const POLL_MS = 5000
const STALE_MS = 2 * 60 * 1000 
const DEFAULT_CENTER = [39.8283, -98.5795]
const COLORS = { me: '#fa5252', other: '#228be6', stale: '#868e96' }

const sameId = (a, b) => String(a) === String(b)

const ago = (ts, now) => {
  const s = Math.max(0, Math.round((now - ts) / 1000))
  if (s < 10) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`
}

const fullName = (u) => `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || 'You'
const shortId = (id) => `User …${String(id).slice(-4)}`
const pinLabel = (p) => (p.named
  ? p.name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2)
  : p.id.slice(-2)
).toUpperCase().replace(/[^A-Z0-9]/g, '')

const pin = (label, color) => L.divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:2px solid #fff;
    box-shadow:0 1px 4px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;
    color:#fff;font:600 12px/1 sans-serif">${label}</div>`,
})

function FitOnce({ points }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current || points.length === 0) return
    done.current = true
    if (points.length === 1) map.setView(points[0], 15)
    else map.fitBounds(points, { padding: [40, 40], maxZoom: 16 })
  }, [map, points])
  return null
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 15))
  }, [map, target])
  return null
}

export default function SessionMap() {
  const {
    session, me, isActive, sharing, setSharing, myPosition, lastSentAt, shareError,
  } = useOutletContext()

  const [locations, setLocations] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [focus, setFocus] = useState(null)

  useEffect(() => {
    let ignore = false

    async function load() {
      try {
        const data = await getSessionLocations(session._id)
        if (ignore) return
        setLocations(data)
        setLoadError('')
      } catch (err) {
        if (!ignore) setLoadError(errorMessage(err, 'Could not update locations'))
      } finally {
        if (!ignore) { setNow(Date.now()); setLoaded(true) }
      }
    }

    load()
    if (!isActive) return () => { ignore = true }
    const id = setInterval(load, POLL_MS)
    return () => { ignore = true; clearInterval(id) }
  }, [session._id, isActive])

  const people = locations
    .filter((l) => typeof l.latitude === 'number' && typeof l.longitude === 'number')
    .map((l) => {
      const isMe = sameId(l.userId, me._id)
      const updated = new Date(l.lastUpdated).getTime()
      return {
        id: String(l.userId),
        isMe,
        named: isMe,
        name: isMe ? fullName(me) : shortId(l.userId),
        latitude: l.latitude,
        longitude: l.longitude,
        updated,
        stale: now - updated > STALE_MS,
      }
    })

  if (isActive && sharing && myPosition) {
    const mine = {
      id: String(me._id), isMe: true, named: true, name: fullName(me), ...myPosition,
      updated: lastSentAt ?? now, stale: false,
    }
    const i = people.findIndex((p) => p.isMe)
    if (i >= 0) people[i] = mine
    else people.push(mine)
  }

  people.sort((a, b) => (b.isMe - a.isMe) || (b.updated - a.updated))

  const notSharing = (session.participants ?? [])
    .map(String)
    .filter((id) => !people.some((p) => p.id === id))

  const colorOf = (p) => (p.isMe ? COLORS.me : p.stale ? COLORS.stale : COLORS.other)

  return (
    <Stack>
      {isActive && (
        <Paper withBorder p="sm">
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text size="sm" fw={500}>Share my location</Text>
              <Text size="xs" c="dimmed">
                {!sharing
                  ? "Your party can't see where you are."
                  : lastSentAt
                    ? `Updated ${ago(lastSentAt, now)}`
                    : 'Waiting for your location…'}
              </Text>
            </div>
            <Switch
              checked={sharing}
              onChange={(e) => setSharing(e.currentTarget.checked)}
              aria-label="Share my location"
            />
          </Group>
          {shareError && <Alert color="yellow" variant="light" mt="sm">{shareError}</Alert>}
        </Paper>
      )}

      {loadError && <Alert color="yellow" variant="light">{loadError}</Alert>}

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder style={{ overflow: 'hidden', isolation: 'isolate' }}>
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={4}
              scrollWheelZoom
              style={{ height: 'min(60vh, 560px)', minHeight: 320 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {people.map((p) => (
                <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pin(pinLabel(p), colorOf(p))}>
                  <Tooltip direction="top" offset={[0, -16]}>
                    {p.name}{p.isMe ? ' (you)' : ''} · {ago(p.updated, now)}
                  </Tooltip>
                </Marker>
              ))}
              {loaded && <FitOnce points={people.map((p) => [p.latitude, p.longitude])} />}
              <FlyTo target={focus} />
            </MapContainer>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="xs">
            <Text fw={500}>Hunters</Text>

            {people.map((p) => (
              <UnstyledButton key={p.id} onClick={() => setFocus({ ...p, at: Date.now() })}>
                <Paper withBorder p="xs">
                  <Group gap="sm" wrap="nowrap">
                    <Box w={10} h={10} style={{ borderRadius: '50%', background: colorOf(p), flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>
                        {p.name}{p.isMe && <Text span c="dimmed"> (you)</Text>}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {p.stale ? 'Last seen' : 'Updated'} {ago(p.updated, now)}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              </UnstyledButton>
            ))}

            {notSharing.map((id) => (
              <Paper key={id} withBorder p="xs">
                <Text size="sm" c="dimmed">
                  {sameId(id, me._id) ? `${fullName(me)} (you)` : shortId(id)} · not sharing
                </Text>
              </Paper>
            ))}

            {loaded && people.length === 0 && notSharing.length === 0 && (
              <Text size="sm" c="dimmed">No one is sharing a location yet.</Text>
            )}
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  )
}
