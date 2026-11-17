import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Alert, Badge, Button, Center, Group, Loader, Modal,
  Paper, Stack, Text, TextInput, Textarea, Title,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  createParty, discoverParties, errorMessage, getMe, getParties, joinParty,
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

  const [others, setOthers] = useState([])
  const [othersError, setOthersError] = useState('')
  const [joiningId, setJoiningId] = useState(null)
  const [joinError, setJoinError] = useState('')

  const [opened, { open, close }] = useDisclosure()
  const [form, setForm] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    let ignore = false

    const browse = discoverParties().catch((err) => ({ failed: err }))

    Promise.all([getMe(), getParties(), browse])
      .then(([meRes, list, all]) => {
        if (ignore) return
        setMe(meRes.content.user)
        setParties(list)
        if (all.failed) setOthersError(errorMessage(all.failed, "Couldn't load other parties"))
        else setOthers(all)
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

  async function handleJoin(partyId) {
    setJoiningId(partyId)
    setJoinError('')
    try {
      await joinParty(partyId)
      navigate(`/parties/${partyId}`)
    } catch (err) {
      if (err.response?.status === 409) {
        navigate(`/parties/${partyId}`)
        return
      }
      setJoinError(errorMessage(err, 'Could not join that party'))
      setJoiningId(null)
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
      <Group justify="space-between">
        <Title order={2}>My Parties</Title>
        <Button onClick={open}>Create party</Button>
      </Group>

      {parties.length === 0 && (
        <Text c="dimmed">You're not in any parties yet. Create one or join one below.</Text>
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

      <Title order={3} mt="lg">All Parties</Title>

      {joinError && <Alert color="red" variant="light">{joinError}</Alert>}
      {othersError && <Text size="sm" c="dimmed">{othersError}</Text>}
      {!othersError && others.length === 0 && (
        <Text size="sm" c="dimmed">No other parties to join yet.</Text>
      )}

      {others.map((party) => (
        <Paper key={party._id} withBorder p="md">
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text fw={500}>{party.name}</Text>
              {party.description && <Text size="sm" c="dimmed" lineClamp={1}>{party.description}</Text>}
              <Text size="sm" c="dimmed">{memberLabel(party.memberCount ?? 0)}</Text>
            </div>
            <Button
              variant="default"
              loading={joiningId === party._id}
              disabled={joiningId !== null && joiningId !== party._id}
              onClick={() => handleJoin(party._id)}
            >
              Join
            </Button>
          </Group>
        </Paper>
      ))}

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
