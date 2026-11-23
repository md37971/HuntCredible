import { useEffect, useState } from 'react'
import { Alert, Avatar, Button, Center, Group, Loader, Paper, Stack, Text } from '@mantine/core'
import { errorMessage, getLeaderboard, getMe, getMyRank, notBuiltYet } from '../API/api.js'

const LIMIT = 10
const MEDALS = ['#d4a017', '#9e9e9e', '#b06d3b']

export default function Leaderboard() {
  const [rows, setRows] = useState([])
  const [mine, setMine] = useState(null)
  const [meId, setMeId] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [comingSoon, setComingSoon] = useState(false)

  useEffect(() => {
    let ignore = false
    Promise.all([getLeaderboard({ page: 1, limit: LIMIT }), getMyRank().catch(() => null), getMe()])
      .then(([board, myRank, meRes]) => {
        if (ignore) return
        setRows(board.leaderboard ?? [])
        setHasMore((board.leaderboard ?? []).length === LIMIT)
        setMine(myRank)
        setMeId(meRes.content.user._id)
      })
      .catch((err) => {
        if (ignore) return
        if (notBuiltYet(err)) setComingSoon(true)
        else setError(errorMessage(err, 'Could not load the leaderboard'))
      })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const next = page + 1
      const board = await getLeaderboard({ page: next, limit: LIMIT })
      setRows((list) => [...list, ...board.leaderboard])
      setHasMore(board.leaderboard.length === LIMIT)
      setPage(next)
    } catch (err) {
      setError(errorMessage(err, 'Could not load more'))
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return <Center mih="40vh"><Loader /></Center>
  }

  if (comingSoon) {
    return (
      <Paper withBorder p="xl">
        <Text c="dimmed" ta="center">The leaderboard is coming soon.</Text>
      </Paper>
    )
  }

  if (error && rows.length === 0) {
    return <Alert color="red" variant="light">{error}</Alert>
  }

  const isMe = (row) => String(row.userId) === String(meId)
  const meShown = rows.some(isMe)

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">Points from competitions and challenges.</Text>

      {mine && !meShown && (
        <Paper withBorder p="sm" bg="var(--mantine-primary-color-light)">
          <Group justify="space-between" wrap="nowrap">
            <Text fw={500}>Your rank: #{mine.rank}</Text>
            <Text fw={600}>{mine.points} pts</Text>
          </Group>
        </Paper>
      )}

      {rows.length === 0 && <Text c="dimmed">No points have been awarded yet.</Text>}

      {rows.map((row) => (
        <Row key={String(row.userId)} row={row} me={isMe(row)} />
      ))}

      {error && <Alert color="red" variant="light">{error}</Alert>}

      {hasMore && (
        <Button variant="default" onClick={loadMore} loading={loadingMore} w="fit-content" mx="auto">
          Show more
        </Button>
      )}
    </Stack>
  )
}

function Row({ row, me }) {
  const medal = MEDALS[row.rank - 1]
  return (
    <Paper withBorder p="sm" bg={me ? 'var(--mantine-primary-color-light)' : undefined}>
      <Group wrap="nowrap" gap="md">
        <Center
          w={32}
          h={32}
          style={{
            flexShrink: 0,
            borderRadius: '50%',
            background: medal ?? 'var(--mantine-color-default-hover)',
            color: medal ? 'white' : undefined,
            fontWeight: 700,
          }}
        >
          {row.rank}
        </Center>
        <Avatar radius="xl" color="initials" name={row.username} />
        <Text fw={500} truncate style={{ flex: 1, minWidth: 0 }}>
          {row.username}
          {me && <Text span c="dimmed"> (you)</Text>}
        </Text>
        <Text fw={600} style={{ flexShrink: 0 }}>{row.points} pts</Text>
      </Group>
    </Paper>
  )
}
