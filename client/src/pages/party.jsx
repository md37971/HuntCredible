import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Alert, Badge, Button, Center, Group, Loader, Modal,
  Paper, Stack, Text, TextInput, Textarea, Title,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  createParty, errorMessage, getMe, getParties, joinParty,
} from '../API/api.js'

const myRole = (party, me) =>
  party.members?.find((m) => String(m.userId) === String(me?._id))?.role

const memberLabel = (n) => `${n} ${n === 1 ? 'member' : 'members'}`

export default function Parties() {
  const navigate = useNavigate()
  const [parties, setParties] = useState([])
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')

  const [opened, { open, close }] = useDisclosure()
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    let ignore = false

    Promise.all([getMe(), getParties()])
      .then(([meRes, list]) => {
        if (ignore) return
        setMe(meRes.content.user)
        setParties(list)
      })
      .catch((err) => { if (!ignore) setError(errorMessage(err, 'Could not load parties')) })
      .finally(() => { if (!ignore) setLoading(false) })

    return () => { ignore = true }
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setCreateError('')
    try {
      const { partyId } = await createParty(form)
      navigate(`/parties/${partyId}`)
    } catch (err) {
      setCreateError(errorMessage(err, 'Could not create party'))
      setSaving(false)
    }
  }

  async function handleJoin(e) {
    e.preventDefault()
    setJoining(true)
    setJoinError('')
    try {
      const { partyId } = await joinParty(code.trim())
      navigate(`/parties/${partyId}`)
    } catch (err) {
      const existingId = err.response?.data?.data?.partyId
      if (err.response?.status === 409 && existingId) {
        navigate(`/parties/${existingId}`)
        return
      }
      setJoinError(errorMessage(err, 'Could not join that party'))
      setJoining(false)
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
      <Paper withBorder p="md">
        <form onSubmit={handleJoin}>
          <Stack gap="xs">
            <Title order={4}>Join a party</Title>
            <Text size="sm" c="dimmed">Code provided from the party leader.</Text>
            <Group align="flex-start" wrap="nowrap">
              <TextInput
                placeholder="e.g. 3FA9C1B2"
                value={code}
                onChange={(e) => {
                  setCode(e.currentTarget.value.toUpperCase())
                  setJoinError('')
                }}
                maxLength={8}
                ff="monospace"
                error={joinError}
                style={{ flex: 1 }}
              />
              <Button type="submit" loading={joining} disabled={!code.trim()}>
                Join
              </Button>
            </Group>
          </Stack>
        </form>
      </Paper>

      <Group justify="space-between" mt="md">
        <Title order={2}>My Parties</Title>
        <Button onClick={open}>Create party</Button>
      </Group>

      {parties.length === 0 && (
        <Text c="dimmed">You're not in any parties yet. Create one or join with a code above.</Text>
      )}

      {parties.map((party) => {
        const role = myRole(party, me)
        return (
          <Paper
            key={party._id}
            component={Link}
            to={`/parties/${party._id}`}
            withBorder
            p="md"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Group justify="space-between" wrap="nowrap">
              <div>
                <Text fw={500}>{party.name}</Text>
                {party.description && <Text size="sm" c="dimmed" lineClamp={1}>{party.description}</Text>}
                <Text size="sm" c="dimmed">{memberLabel(party.members?.length ?? 0)}</Text>
              </div>
              <Badge variant={role === 'owner' ? 'filled' : 'outline'}>
                {role === 'owner' ? 'Leader' : 'Member'}
              </Badge>
            </Group>
          </Paper>
        )
      })}

      <Modal opened={opened} onClose={close} title="Create party" centered>
        <form onSubmit={handleCreate}>
          <Stack>
            <TextInput
              label="Name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
            />
            <Textarea
              label="Description"
              autosize
              minRows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.currentTarget.value })}
            />
            {createError && <Alert color="red" variant="light">{createError}</Alert>}
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>Cancel</Button>
              <Button type="submit" loading={saving}>Create</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  )
}