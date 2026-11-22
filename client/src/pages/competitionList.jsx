import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Alert, Badge, Card, Center, Group, Image, Loader, SimpleGrid, Stack, Text,
} from '@mantine/core'
import { errorMessage, getCompetitions, getMyCompetitions } from '../API/api.js'
import { categoryOf, plural, timeLabel } from '../data/competition.js'

export default function CompetitionList() {
  const [competitions, setCompetitions] = useState([])
  const [enteredIds, setEnteredIds] = useState(() => new Set())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let ignore = false

    async function load() {
      const [list, mine] = await Promise.all([
        getCompetitions(),
        getMyCompetitions().catch(() => []),
      ])
      if (ignore) return
      setCompetitions(list)
      setEnteredIds(new Set(mine.filter((m) => m.submission).map((m) => String(m.challengeId))))
    }

    load()
      .catch((err) => { if (!ignore) setError(errorMessage(err, 'Could not load competitions')) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return <Center mih="40vh"><Loader /></Center>
  }

  if (error) {
    return <Alert color="red" variant="light">{error}</Alert>
  }

  // Ending soonest first
  const shown = [...competitions].sort((a, b) => new Date(a.endDate) - new Date(b.endDate))

  return (
    <Stack>
      {shown.length === 0 && <Text c="dimmed">No competitions are open right now.</Text>}

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {shown.map((c) => (
          <CompetitionCard
            key={c._id}
            competition={c}
            entered={enteredIds.has(String(c._id))}
            now={now}
          />
        ))}
      </SimpleGrid>
    </Stack>
  )
}

function CompetitionCard({ competition: c, entered, now }) {
  const category = categoryOf(c)

  return (
    <Card
      component={Link}
      to={`/competitions/${c._id}`}
      withBorder
      padding="md"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <Card.Section>
        {c.coverImageUrl ? (
          <Image src={c.coverImageUrl} alt="" h={150} fit="cover" />
        ) : (
          <Center h={110} bg={`var(--mantine-color-${category.color}-light)`}>
            <Text c={category.color} fw={700} size="xl">{category.label}</Text>
          </Center>
        )}
      </Card.Section>

      <Text fw={600} lineClamp={1} mt="md">{c.title}</Text>

      {c.description && <Text size="sm" c="dimmed" lineClamp={2} mt={4}>{c.description}</Text>}

      <Group justify="space-between" mt="md" gap="xs">
        <Text size="sm" fw={500}>{timeLabel(c, now)}</Text>
        <Group gap="xs">
          {entered && <Badge variant="outline">Entered</Badge>}
          {c.pointsReward != null && <Badge variant="default">{c.pointsReward} pts</Badge>}
        </Group>
      </Group>
      {c.entryCount != null && (
        <Text size="xs" c="dimmed" mt={4}>{plural(c.entryCount, 'entry', 'entries')}</Text>
      )}
    </Card>
  )
}
