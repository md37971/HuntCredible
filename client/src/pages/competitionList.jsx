import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Alert, Badge, Card, Center, Group, Image, Loader, SegmentedControl, SimpleGrid, Stack, Text,
} from '@mantine/core'
import { errorMessage, getCompetitions, getMyCompetitions } from '../API/api.js'
import { categoryOf, plural, statusOf, timeLabel } from '../data/competition.js'

const FILTERS = [
  { value: 'active', label: 'Open' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
]

const EMPTY = {
  active: 'No competitions are open right now.',
  upcoming: 'Nothing scheduled yet.',
  ended: 'No past competitions yet.',
}

export default function CompetitionList() {
  const [competitions, setCompetitions] = useState([])
  const [enteredIds, setEnteredIds] = useState(() => new Set())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')
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

  const counts = { active: 0, upcoming: 0, ended: 0 }
  competitions.forEach((c) => { counts[statusOf(c, now)] += 1 })

  const showFilter = counts.upcoming > 0 || counts.ended > 0
  const current = showFilter ? filter : 'active'

  const shown = competitions
    .filter((c) => statusOf(c, now) === current)
    .sort((a, b) => {
      if (current === 'active') return new Date(a.endDate) - new Date(b.endDate)
      if (current === 'upcoming') return new Date(a.startDate) - new Date(b.startDate)
      return new Date(b.endDate) - new Date(a.endDate)
    })

  return (
    <Stack>
      {showFilter && (
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          data={FILTERS.map((f) => ({ value: f.value, label: `${f.label} (${counts[f.value]})` }))}
          w={{ base: '100%', xs: 'fit-content' }}
        />
      )}

      {shown.length === 0 && <Text c="dimmed">{EMPTY[current]}</Text>}

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
  const status = statusOf(c, now)

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

      <Group justify="space-between" mt="md" wrap="nowrap" align="flex-start">
        <Text fw={600} lineClamp={1}>{c.title}</Text>
        {status !== 'active' && <Badge color="gray" variant="light" style={{ flexShrink: 0 }}>{status}</Badge>}
      </Group>

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
