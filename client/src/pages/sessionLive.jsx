import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import {
  Alert, Button, Center, Group, Loader, Modal, Stack, Tabs, Text,
} from '@mantine/core'
import { endSession, errorMessage, getMe, getSession, updateMyLocation } from '../API/api.js'

const SEND_EVERY_MS = 10000

const geoProblem = () => {
  if (!window.isSecureContext) return 'Location sharing needs HTTPS (or localhost).'
  if (!navigator.geolocation) return "This browser can't share location."
  return ''
}

export default function SessionLive() {
  const { partyId, sessionId } = useParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [session, setSession] = useState(null)
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [ending, setEnding] = useState(false)
  const [endError, setEndError] = useState('')

  const [sharing, setSharing] = useState(true)
  const [myPosition, setMyPosition] = useState(null)
  const [lastSentAt, setLastSentAt] = useState(null)
  const [shareError, setShareError] = useState(geoProblem)
  const latest = useRef(null)

  const isActive = session?.status === 'active'
  const shouldShare = sharing && isActive && !geoProblem()
  const hasFix = myPosition !== null

  useEffect(() => {
    let ignore = false

    Promise.all([getMe(), getSession(partyId, sessionId)])
      .then(([meRes, s]) => {
        if (ignore) return
        setMe(meRes.content.user)
        setSession(s)
      })
      .catch((err) => { if (!ignore) setError(errorMessage(err, 'Could not load this session')) })
      .finally(() => { if (!ignore) setLoading(false) })

    return () => { ignore = true }
  }, [partyId, sessionId])

  useEffect(() => {
    if (!shouldShare) return

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
        latest.current = p
        setMyPosition(p)
        setShareError('')
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setShareError('Location permission was denied. Allow it in your browser settings to share your position.')
          setSharing(false)
        } else {
          setShareError('Could not get your location. Retrying…')
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
    )

    return () => navigator.geolocation.clearWatch(id)
  }, [shouldShare])

  useEffect(() => {
    if (!shouldShare || !hasFix) return
    let stopped = false

    async function send() {
      if (!latest.current) return
      try {
        await updateMyLocation(sessionId, latest.current)
        if (!stopped) setLastSentAt(Date.now())
      } catch (err) {
        if (!stopped && err.response?.status === 409) {
          getSession(partyId, sessionId).then((s) => { if (!stopped) setSession(s) }).catch(() => {})
        }
      }
    }

    send()
    const id = setInterval(send, SEND_EVERY_MS)
    return () => { stopped = true; clearInterval(id) }
  }, [shouldShare, hasFix, partyId, sessionId])

  function toggleSharing(on) {
    setShareError(on ? geoProblem() : '')
    setSharing(on)
  }

    async function handleEnd() {
        setEnding(true)
        setEndError('')

        try {
            await endSession(sessionId)

            setSession((prev) => ({
                ...prev,
                status: 'ended'
            }))

            setConfirmOpen(false)
        } catch (err) {
            setEndError(errorMessage(err, 'Could not end the session'))
        } finally {
            setEnding(false)
        }
    }

  const backLink = (
    <Button component={Link} to="/sessions" variant="subtle" w="fit-content" px={0}>
      ← All sessions
    </Button>
  )

  if (loading) {
    return <Center mih="50vh"><Loader /></Center>
  }

  if (error) {
    return (
      <Stack maw={1100} mx="auto">
        {backLink}
        <Alert color="red" variant="light">{error}</Alert>
      </Stack>
    )
  }

  const isStarter = String(session.startedBy) === String(me._id)
  const tab = pathname.endsWith('/chat') ? 'chat' : 'map'

  return (
    <Stack maw={1100} mx="auto">
      <Group justify="space-between">
        {backLink}
        {isActive && isStarter && (
          <Button color="red" variant="light" onClick={() => { setEndError(''); setConfirmOpen(true) }}>
            End session
          </Button>
        )}
      </Group>

      {!isActive && <Alert color="gray" variant="light">This hunt has ended.</Alert>}

      <Tabs value={tab} onChange={(value) => value && navigate(value)}>
        <Tabs.List>
          <Tabs.Tab value="map">Map</Tabs.Tab>
          <Tabs.Tab value="chat">Chat</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Outlet
        context={{
          session, me, isActive,
          sharing, setSharing: toggleSharing, myPosition, lastSentAt, shareError,
        }}
      />

      <Modal opened={confirmOpen} onClose={() => !ending && setConfirmOpen(false)} title="End session" centered>
        <Stack>
          <Text size="sm">End this hunt for everyone? Location sharing stops for all members.</Text>
          {endError && <Alert color="red" variant="light">{endError}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmOpen(false)} disabled={ending}>Cancel</Button>
            <Button color="red" loading={ending} onClick={handleEnd}>End session</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
