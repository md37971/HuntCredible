import { useEffect, useRef, useState } from 'react'
import { useOutletContext, useParams } from 'react-router'
import {
  LayersControl, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Alert, Box, Button, Grid, Group, Modal, Paper, Stack, Switch, Text, Textarea, UnstyledButton,
} from '@mantine/core'
import {
  createPin, deletePin, errorMessage, getPartyMembers, getPins, getSessionLocations, updatePin,
} from '../API/api.js'

const POLL_MS = 5000
const STALE_MS = 2 * 60 * 1000
const DEFAULT_CENTER = [39.8283, -98.5795]
const COLORS = { me: '#fa5252', other: '#228be6', stale: '#868e96' }
const PIN_COLOR = '#fd7e14'
const PIN_MAX = 250

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

// Teardrop marker for map pins, so they look different from hunters
const mapPinIcon = L.divIcon({
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 30],
  popupAnchor: [0, -28],
  html: `<div style="width:26px;height:26px;background:${PIN_COLOR};border:2px solid #fff;
    border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>`,
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

function ClickToPlace({ enabled, onPick }) {
  useMapEvents({
    click(e) {
      if (enabled) onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng })
    },
  })
  return null
}

export default function SessionMap() {
  const {
    session, me, isActive, sharing, setSharing, myPosition, lastSentAt, shareError,
  } = useOutletContext()

  const { partyId } = useParams()
  const [partyMembers, setPartyMembers] = useState([])
  const [locations, setLocations] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const [focus, setFocus] = useState(null)

  const [pins, setPins] = useState([])
  const [pinsLoaded, setPinsLoaded] = useState(false)
  const [pinsError, setPinsError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [editor, setEditor] = useState(null)
  const [savingPin, setSavingPin] = useState(false)
  const [pinError, setPinError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    getPartyMembers(partyId)
      .then((members) => setPartyMembers(members))
      .catch((err) => console.error('Could not load party members:', err))
  }, [partyId])

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
        if (!ignore) {
          setNow(Date.now())
          setLoaded(true)
        }
      }
    }

    load()
    if (!isActive) return () => { ignore = true }
    const id = setInterval(load, POLL_MS)
    return () => {
      ignore = true
      clearInterval(id)
    }
  }, [session._id, isActive])

  // Pins: the backend returns every pin in the party, so keep only this session's
  useEffect(() => {
    let ignore = false

    async function loadPins() {
      try {
        const data = await getPins(partyId)
        if (ignore) return
        setPins(data.map((p) => ({ ...p, past: !sameId(p.sessionId, session._id) })))
        setPinsError('')
      } catch (err) {
        if (!ignore) setPinsError(errorMessage(err, 'Could not load pins'))
      } finally {
        if (!ignore) setPinsLoaded(true)
      }
    }

    loadPins()
    if (!isActive) return () => { ignore = true }
    const id = setInterval(loadPins, POLL_MS)
    return () => {
      ignore = true
      clearInterval(id)
    }
  }, [partyId, session._id, isActive])

  const people = locations
    .filter((l) => typeof l.latitude === 'number' && typeof l.longitude === 'number')
    .map((l) => {
      const isMe = sameId(l.userId, me._id)
      const updated = new Date(l.lastUpdated).getTime()

      return {
        id: String(l.userId),
        isMe,
        named: true,
        name: isMe
          ? fullName(me)
          : `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim() || shortId(l.userId),
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

  const myRole = partyMembers.find((m) => sameId(m.userId, me._id))?.role
  const canManage = (p) => sameId(p.createdBy, me._id) || myRole === 'owner' || me.role === 'admin'

  const creatorName = (p) => {
    if (sameId(p.createdBy, me._id)) return 'You'
    const member = partyMembers.find((m) => sameId(m.userId, p.createdBy))
    return member ? `${member.firstName} ${member.lastName}` : shortId(p.createdBy)
  }

  function openNewPin(position) {
    setPlacing(false)
    setPinError('')
    setEditor({ ...position, description: '' })
  }

  function openEditPin(p) {
    setPinError('')
    setConfirmDeleteId(null)
    setEditor({ pinId: p._id, latitude: p.latitude, longitude: p.longitude, description: p.description })
  }

  async function savePin(e) {
    e.preventDefault()
    setSavingPin(true)
    setPinError('')
    try {
      const description = editor.description.trim()
      if (editor.pinId) {
        await updatePin(partyId, editor.pinId, description)
        setPins((ps) => ps.map((p) => (sameId(p._id, editor.pinId) ? { ...p, description } : p)))
      } else {
        const created = await createPin(partyId, {
          sessionId: session._id,
          description,
          latitude: editor.latitude,
          longitude: editor.longitude,
        })
        setPins((ps) => [{ ...created, _id: created.pinId }, ...ps])
      }
      setEditor(null)
    } catch (err) {
      setPinError(errorMessage(err, 'Could not save pin'))
    } finally {
      setSavingPin(false)
    }
  }

  async function removePin(pinId) {
    setDeletingId(pinId)
    setPinError('')
    try {
      await deletePin(partyId, pinId)
      setPins((ps) => ps.filter((p) => !sameId(p._id, pinId)))
      setConfirmDeleteId(null)
      setEditor(null)
    } catch (err) {
      setPinError(errorMessage(err, 'Could not delete pin'))
    } finally {
      setDeletingId(null)
    }
  }

  const fitPoints = [
    ...people.map((p) => [p.latitude, p.longitude]),
    ...pins.map((p) => [p.latitude, p.longitude]),
  ]

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
      {pinsError && <Alert color="yellow" variant="light">{pinsError}</Alert>}

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="xs">
            {isActive && (
              <Group gap="xs">
                <Button
                  size="xs"
                  variant={placing ? 'filled' : 'light'}
                  color={placing ? 'orange' : undefined}
                  onClick={() => setPlacing((on) => !on)}
                >
                  {placing ? 'Cancel placing' : 'Drop pin on map'}
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  disabled={!myPosition}
                  onClick={() => openNewPin(myPosition)}
                >
                  Pin my location
                </Button>
                {placing && <Text size="xs" c="dimmed">Click the map where you want the pin.</Text>}
              </Group>
            )}

            <Paper withBorder style={{ overflow: 'hidden', isolation: 'isolate' }}>
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={4}
                scrollWheelZoom
                maxZoom={19}
                style={{ height: 'min(60vh, 560px)', minHeight: 320 }}
              >
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Topo">
                    <TileLayer
                      attribution='Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
                      url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                      maxNativeZoom={17}
                      maxZoom={19}
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="USGS Topo (US only)">
                    <TileLayer
                      attribution='Tiles courtesy of the <a href="https://www.usgs.gov/">U.S. Geological Survey</a>'
                      url="https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}"
                      maxNativeZoom={16}
                      maxZoom={19}
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Street">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                      maxZoom={19}
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>

                {people.map((p) => (
                  <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pin(pinLabel(p), colorOf(p))}>
                    <Tooltip direction="top" offset={[0, -16]}>
                      {p.name}{p.isMe ? ' (you)' : ''} · {ago(p.updated, now)}
                    </Tooltip>
                  </Marker>
                ))}

                {pins.map((p) => (
                  <Marker key={p._id} position={[p.latitude, p.longitude]} icon={mapPinIcon}>
                    <Popup eventHandlers={{ remove: () => setConfirmDeleteId(null) }}>
                      <Stack gap={4} miw={180}>
                        <Text size="sm" fw={500} style={{ whiteSpace: 'pre-wrap' }}>{p.description}</Text>
                        <Text size="xs" c="dimmed">
                          {creatorName(p)} · {ago(new Date(p.createdAt).getTime(), now)}
                        </Text>
                        {canManage(p) && (
                          <Group gap={4} mt={4} grow>
                            <Button size="compact-xs" variant="light" onClick={() => openEditPin(p)}>
                              Edit
                            </Button>
                            <Button
                              size="compact-xs"
                              color="red"
                              variant={confirmDeleteId === p._id ? 'filled' : 'light'}
                              loading={deletingId === p._id}
                              onClick={() => (confirmDeleteId === p._id ? removePin(p._id) : setConfirmDeleteId(p._id))}
                            >
                              {confirmDeleteId === p._id ? 'Confirm' : 'Delete'}
                            </Button>
                          </Group>
                        )}
                        {confirmDeleteId === p._id && pinError && (
                          <Text size="xs" c="red">{pinError}</Text>
                        )}
                      </Stack>
                    </Popup>
                  </Marker>
                ))}

                <ClickToPlace enabled={isActive && placing} onPick={openNewPin} />
                {loaded && pinsLoaded && <FitOnce points={fitPoints} />}
                <FlyTo target={focus} />
              </MapContainer>
            </Paper>
          </Stack>
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

            {notSharing.map((id) => {
              const member = partyMembers.find((m) => sameId(m.userId, id))
              const name = sameId(id, me._id)
                ? `${fullName(me)} (you)`
                : member
                  ? `${member.firstName} ${member.lastName}`
                  : shortId(id)

              return (
                <Paper key={id} withBorder p="xs">
                  <Text size="sm" c="dimmed">{name} · not sharing</Text>
                </Paper>
              )
            })}

            {loaded && people.length === 0 && notSharing.length === 0 && (
              <Text size="sm" c="dimmed">No one is sharing a location yet.</Text>
            )}

            <Text fw={500} mt="md">Pins</Text>

            {pinsLoaded && pins.length === 0 && (
              <Text size="sm" c="dimmed">
                {isActive ? 'No pins yet. Drop one on the map.' : 'No pins were dropped this hunt.'}
              </Text>
            )}

            {pins.map((p) => (
              <UnstyledButton
                key={p._id}
                onClick={() => setFocus({ latitude: p.latitude, longitude: p.longitude, at: Date.now() })}
              >
                <Paper withBorder p="xs">
                  <Group gap="sm" wrap="nowrap">
                    <Box w={10} h={10} style={{ borderRadius: 2, background: PIN_COLOR, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm" fw={500} truncate>{p.description}</Text>
                      <Text size="xs" c="dimmed">
                        {creatorName(p)} · {ago(new Date(p.createdAt).getTime(), now)}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              </UnstyledButton>
            ))}
          </Stack>
        </Grid.Col>
      </Grid>

      <Modal
        opened={!!editor}
        onClose={() => !savingPin && !deletingId && setEditor(null)}
        title={editor?.pinId ? 'Edit pin' : 'New pin'}
        centered
      >
        {editor && (
          <form onSubmit={savePin}>
            <Stack>
              <Textarea
                label="Description"
                placeholder="Tree stand, blood trail, water source…"
                required
                autosize
                minRows={2}
                maxLength={PIN_MAX}
                value={editor.description}
                onChange={(e) => setEditor({ ...editor, description: e.currentTarget.value })}
                description={`${editor.description.length}/${PIN_MAX}`}
                data-autofocus
              />
              <Text size="xs" c="dimmed">
                {editor.latitude.toFixed(5)}, {editor.longitude.toFixed(5)}
              </Text>
              {pinError && <Alert color="red" variant="light">{pinError}</Alert>}
              <Group justify="space-between">
                {editor.pinId
                  ? (
                    <Button
                      color="red"
                      variant="subtle"
                      onClick={() => removePin(editor.pinId)}
                      loading={deletingId === editor.pinId}
                      disabled={savingPin}
                    >
                      Delete pin
                    </Button>
                  )
                  : <span />}
                <Group gap="xs">
                  <Button
                    variant="default"
                    onClick={() => setEditor(null)}
                    disabled={savingPin || !!deletingId}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={savingPin}
                    disabled={!editor.description.trim() || !!deletingId}
                  >
                    {editor.pinId ? 'Save' : 'Drop pin'}
                  </Button>
                </Group>
              </Group>
            </Stack>
          </form>
        )}
      </Modal>
    </Stack>
  )
}