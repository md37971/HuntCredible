import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  Alert, Avatar, Badge, Button, Card, Center, Group, Loader,
  Modal, Paper, Stack, Text, Title,
} from '@mantine/core'
import {
  deleteParty, errorMessage, getMe, getParty, getPartyMembers ,leaveParty, removeMember,
} from '../API/api.js'

const sameId = (a, b) => String(a) === String(b)

const memberName = (m) => {
    console.log("Member object:", m);

    return `${m.firstName ?? 'Unknown'} ${m.lastName ?? 'User'}`.trim();
}

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''

export default function PartyDetail() {
  const { partyId } = useParams()
  const navigate = useNavigate()
  const [party, setParty] = useState(null)
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

    useEffect(() => {
        let ignore = false

        Promise.all([
            getMe(),
            getParty(partyId),
            getPartyMembers(partyId)
        ])
            .then(([meRes, data, members]) => {
                if (ignore) return

                setMe(meRes.content.user)

                setParty({
                    ...data,
                    members: members
                })
            })
            .catch((err) => {
                if (!ignore) {
                    setError(errorMessage(err, 'Could not load party'))
                }
            })
            .finally(() => {
                if (!ignore) {
                    setLoading(false)
                }
            })

        return () => {
            ignore = true
        }
    }, [partyId])

  function ask(dialog) {
    setActionError('')
    setConfirm(dialog)
  }

  async function runConfirm() {
    setBusy(true)
    setActionError('')
    try {
      await confirm.action()
      setConfirm(null)
    } catch (err) {
      setActionError(errorMessage(err, 'Something went wrong'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <Center mih="50vh"><Loader /></Center>
  }

  if (error) {
    return (
      <Stack maw={800} mx="auto">
        <Alert color="red" variant="light">{error}</Alert>
        <Button component={Link} to="/parties" variant="subtle" w="fit-content">← All parties</Button>
      </Stack>
    )
  }

  const members = party.members ?? []
  const isLeader = members.some((m) => sameId(m.userId, me._id) && m.role === 'owner')

  const leave = () => ask({
    title: 'Leave party',
    message: `Leave ${party.name}? You'll need to rejoin to get back in.`,
    label: 'Leave',
    action: async () => {
      await leaveParty(partyId)
      navigate('/parties', { replace: true })
    },
  })

  const destroy = () => ask({
    title: 'Delete party',
    message: `Delete ${party.name} for everyone? This can't be undone.`,
    label: 'Delete party',
    action: async () => {
      await deleteParty(partyId)
      navigate('/parties', { replace: true })
    },
  })

  const kick = (member) => ask({
    title: 'Remove member',
    message: `Remove ${memberName(member, me)} from ${party.name}?`,
    label: 'Remove',
    action: async () => {
      await removeMember(partyId, String(member.userId))
      setParty((p) => ({ ...p, members: p.members.filter((m) => !sameId(m.userId, member.userId)) }))
    },
  })

  return (
    <Stack maw={800} mx="auto">
      <Button component={Link} to="/parties" variant="subtle" w="fit-content" px={0}>
        ← All parties
      </Button>

      <Card withBorder padding="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs">
              <Title order={3}>{party.name}</Title>
              {isLeader && <Badge>Leader</Badge>}
            </Group>
            {party.description && <Text mt="xs">{party.description}</Text>}
            <Text size="sm" c="dimmed" mt="xs">
              {members.length} {members.length === 1 ? 'member' : 'members'} · Created {formatDate(party.createdAt)}
            </Text>
          </div>
          {isLeader
            ? <Button color="red" variant="light" onClick={destroy}>Delete party</Button>
            : <Button color="red" variant="light" onClick={leave}>Leave party</Button>}
        </Group>
      </Card>

      <Title order={4} mt="sm">Members</Title>
      <Stack gap="sm">
        {members.map((m) => {
          const isMe = sameId(m.userId, me._id)
          const name = memberName(m, me)
          return (
            <Paper key={String(m.userId)} withBorder p="sm">
              <Group justify="space-between" wrap="nowrap">
                <Group wrap="nowrap">
                  <Avatar radius="xl" color="initials" name={name} />
                  <div>
                    <Text fw={500}>
                      {name}
                      {isMe && <Text span c="dimmed"> (you)</Text>}
                    </Text>
                    <Text size="xs" c="dimmed">Joined {formatDate(m.joinedAt)}</Text>
                  </div>
                </Group>
                <Group gap="xs" wrap="nowrap">
                  <Badge variant={m.role === 'owner' ? 'filled' : 'outline'}>
                    {m.role === 'owner' ? 'Leader' : 'Member'}
                  </Badge>
                  {isLeader && !isMe && (
                    <Button size="xs" color="red" variant="subtle" onClick={() => kick(m)}>Remove</Button>
                  )}
                </Group>
              </Group>
            </Paper>
          )
        })}
      </Stack>

      <Modal opened={!!confirm} onClose={() => !busy && setConfirm(null)} title={confirm?.title} centered>
        <Stack>
          <Text size="sm">{confirm?.message}</Text>
          {actionError && <Alert color="red" variant="light">{actionError}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button>
            <Button color="red" loading={busy} onClick={runConfirm}>{confirm?.label}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
