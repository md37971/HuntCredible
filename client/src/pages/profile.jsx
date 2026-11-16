import { useEffect, useState } from 'react'
import {
  Alert, Avatar, Badge, Button, Card, Center, Group, Loader,
  Paper, SimpleGrid, Stack, Tabs, Text, Title,
} from '@mantine/core'
import { getMe } from '../API/api.js'

const statLabels = [
  { key: 'challengesWon', label: 'Challenges won' },
  { key: 'votesReceived', label: 'Votes received' },
]

const statusColor = { Won: 'green', 'In progress': 'yellow', Entered: 'gray' }

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : ''

const initials = (name = '') =>
  name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase()

function Empty({ children }) {
  return <Text size="sm" c="dimmed">{children}</Text>
}

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    getMe()
    .then((data) => { if (!ignore) setProfile(data.content.user) })
    .catch((err) => { if (!ignore) setError(err.response?.data?.content?.message || 'Could not load profile') })
    .finally(() => { if (!ignore) setLoading(false) })

    return () => {
      ignore = true
    }
  }, [])

  if (loading) {
    return (
      <Center mih="50vh">
        <Loader />
      </Center>
    )
  }

  if (error) {
    return (
      <Alert color="red" variant="light" maw={800} mx="auto">
        {error}
      </Alert>
    )
  }

  const {
    firstName = '', lastName = '', handle, location, bio, createdAt,
    stats = {}, parties = [], challenges = [], } = profile
    const name = `${firstName} ${lastName}`.trim()
    const joinedAt = createdAt

  return (
    <Stack maw={800} mx="auto">
      <Card withBorder padding="lg">
        <Group justify="space-between" align="flex-start">
          <Group>
            <Avatar size={80} radius="xl" color="indigo">
              {initials(name)}
            </Avatar>
            <div>
              <Title order={3}>{name}</Title>
              {handle && <Text c="dimmed">@{handle}</Text>}
              <Text size="sm" c="dimmed">
                {[location, joinedAt && `Joined ${formatDate(joinedAt)}`].filter(Boolean).join(' · ')}
              </Text>
            </div>
          </Group>
          <Button variant="default">Edit profile</Button>
        </Group>

        {bio && <Text mt="md">{bio}</Text>}
      </Card>

      <SimpleGrid cols={2}>
        {statLabels.map(({ key, label }) => (
          <Paper key={key} withBorder p="md" ta="center">
            <Text fw={700} size="xl">{stats[key] ?? 0}</Text>
            <Text size="sm" c="dimmed">{label}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      <Tabs defaultValue="parties">
        <Tabs.List>
          <Tabs.Tab value="parties">Parties</Tabs.Tab>
          <Tabs.Tab value="challenges">Challenges</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="parties" pt="md">
          <Stack gap="sm">
            {parties.length === 0 && <Empty>Not in any parties yet.</Empty>}
            {parties.map((party) => (
              <Paper key={party.id} withBorder p="md">
                <Group justify="space-between">
                  <div>
                    <Text fw={500}>{party.name}</Text>
                    <Text size="sm" c="dimmed">{party.memberCount} members</Text>
                  </div>
                  <Badge variant="outline">{party.role}</Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="challenges" pt="md">
          <Stack gap="sm">
            {challenges.length === 0 && <Empty>No challenges entered yet.</Empty>}
            {challenges.map((c) => (
              <Paper key={c.id} withBorder p="md">
                <Group justify="space-between">
                  <Text fw={500}>{c.name}</Text>
                  <Badge color={statusColor[c.status] || 'gray'} variant="light">{c.status}</Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}