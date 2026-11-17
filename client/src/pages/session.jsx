import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Alert, Anchor, Badge, Button, Center, Group, Loader, Paper, Stack, Text, Title,
} from '@mantine/core'
import { errorMessage, getActiveSession, getMe, getParties, startSession } from '../API/api.js'

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

const elapsed = (iso, now) => {
  const mins = Math.max(0, Math.floor((now - new Date(iso)) / 60000))
  const h = Math.floor(mins / 60)
  return h ? `${h}h ${mins % 60}m` : `${mins}m`
}

export default function Sessions() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [startingId, setStartingId] = useState(null)
  const [startError, setStartError] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let ignore = false

    async function load() {
      const [meRes, parties] = await Promise.all([getMe(), getParties()])
      const results = await Promise.allSettled(parties.map((p) => getActiveSession(p._id)))
      if (ignore) return
      setMe(meRes.content.user)
      setRows(parties.map((party, i) => ({
        party,
        session: results[i].status === 'fulfilled' ? results[i].value : null,
        statusError: results[i].status === 'rejected',
      })))
    }

    load()
      .catch((err) => { if (!ignore) setError(errorMessage(err, 'Could not load your parties')) })
      .finally(() => { if (!ignore) setLoading(false) })

    return () => { ignore = true }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const openSession = (partyId, session) => navigate(`/sessions/${partyId}/${session._id}`)

  async function handleStart(partyId) {
    setStartingId(partyId)
    setStartError('')
    try {
      const session = await startSession(partyId)
      openSession(partyId, session)
    } catch (err) {
      setStartError(errorMessage(err, 'Could not start the session'))
      setStartingId(null)
    }
  }

  if (loading) {
    return <Center mih="50vh"><Loader /></Center>
  }

  if (error) {
    return <Alert color="red" variant="light" maw={800} mx="auto">{error}</Alert>
  }

  return (
    <Stack maw={800} mx="auto">
      <div>
        <Title order={2}>Hunting Sessions</Title>
        <Text c="dimmed">Pick a party to start or join a hunt.</Text>
      </div>

      {startError && <Alert color="red" variant="light">{startError}</Alert>}

      {rows.length === 0 && (
        <Text c="dimmed">
          You need a party to start a hunt.{' '}
          <Anchor component={Link} to="/parties">Create or find one on the Parties page.</Anchor>
        </Text>
      )}

      {rows.map(({ party, session, statusError }) => {
        const count = party.members?.length ?? 0
        const startedByMe = session && String(session.startedBy) === String(me?._id)
        return (
          <Paper key={party._id} withBorder p="md">
            <Group justify="space-between" wrap="nowrap" align="center">
              <div>
                <Group gap="xs">
                  <Text fw={500}>{party.name}</Text>
                  {session && <Badge color="red" variant="dot">Live · {elapsed(session.startedAt, now)}</Badge>}
                </Group>
                <Text size="sm" c="dimmed">
                  {count} {count === 1 ? 'member' : 'members'}
                  {' · '}
                  {statusError
                    ? 'Could not check for a hunt'
                    : session
                      ? `Started ${startedByMe ? 'by you ' : ''}at ${formatTime(session.startedAt)}`
                      : 'No active hunt'}
                </Text>
              </div>

              {session
                ? <Button onClick={() => openSession(party._id, session)}>Join session</Button>
                : (
                  <Button
                    variant="default"
                    loading={startingId === party._id}
                    disabled={startingId !== null && startingId !== party._id}
                    onClick={() => handleStart(party._id)}
                  >
                    Start session
                  </Button>
                )}
            </Group>
          </Paper>
        )
      })}
    </Stack>
  )
}
