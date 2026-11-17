import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Alert, Badge, Button, Center, Group, Loader, Modal,
  Paper, Stack, Text, TextInput, Textarea, Title,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { createParty, errorMessage, getMe, getParties } from '../API/api.js'

const myRole = (party, me) =>
  party.members?.find((m) => String(m.userId) === String(me?._id))?.role

export default function Parties() {
  const navigate = useNavigate()
  const [parties, setParties] = useState([])
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <Center mih="50vh"><Loader /></Center>
  }

  if (error) {
    return <Alert color="red" variant="light" maw={800} mx="auto">{error}</Alert>
  }

  return (
    <Stack maw={800} mx="auto">
      <Group justify="space-between">
        <Title order={2}>My parties</Title>
        <Button onClick={open}>Create party</Button>
      </Group>

      {parties.length === 0 && (
        <Text c="dimmed">You're not in any parties yet. Create one to get started.</Text>
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
                <Text size="sm" c="dimmed">
                  {party.members?.length ?? 0} {party.members?.length === 1 ? 'member' : 'members'}
                </Text>
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
