import { useEffect, useState } from 'react'
import {
  Alert, Avatar, Badge, Button, Card, Center, Group, Image, Loader, Modal,
  Paper, Stack, Text, Title, UnstyledButton,
} from '@mantine/core'
import {
  deleteEntry, dismissReports, errorMessage, getMe, getReportedEntries,
} from '../API/api.js'

const fullName = (u) => `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || 'Unknown user'
const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''

const STATUS_COLORS = { pending: 'yellow', needs_review: 'yellow', approved: 'green', rejected: 'red' }

export default function Admin() {
  const [me, setMe] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [viewing, setViewing] = useState(null) 
  const [confirm, setConfirm] = useState(null) 
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let ignore = false

    async function load() {
      const meRes = await getMe()
      const user = meRes.content.user
      if (ignore) return
      setMe(user)
      if (user.role !== 'admin') return
      const list = await getReportedEntries()
      if (!ignore) setEntries(list)
    }

    load()
      .catch((err) => { if (!ignore) setError(errorMessage(err, 'Could not load reports')) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [])

  async function runConfirm() {
    const { entry, action } = confirm
    setBusy(true)
    setActionError('')
    try {
      if (action === 'delete') await deleteEntry(entry.competitionId, entry._id)
      else await dismissReports(entry._id)
      setEntries((list) => list.filter((e) => e._id !== entry._id))
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
    return <Alert color="red" variant="light" maw={900} mx="auto">{error}</Alert>
  }

  if (me?.role !== 'admin') {
    return (
      <Alert color="gray" variant="light" maw={900} mx="auto" title="Admins only">
        You don't have access to this page.
      </Alert>
    )
  }

  return (
    <Stack maw={900} mx="auto">
      <div>
        <Title order={2}>Reported Entries</Title>
      </div>

      {entries.length === 0 && (
        <Paper withBorder p="xl">
          <Text c="dimmed" ta="center">No reported entries right now.</Text>
        </Paper>
      )}

      {entries.map((entry) => (
        <Card key={entry._id} withBorder padding="md">
          <Group align="flex-start" wrap="nowrap" gap="md">
            <UnstyledButton onClick={() => setViewing(entry)} aria-label="View full size" style={{ flexShrink: 0 }}>
              {entry.imageUrl ? (
                <Image src={entry.imageUrl} alt="Reported entry" w={120} h={90} radius="sm" fit="cover" />
              ) : (
                <Center w={120} h={90} bg="var(--mantine-color-default-hover)" style={{ borderRadius: 4 }}>
                  <Text size="xs" c="dimmed">No photo</Text>
                </Center>
              )}
            </UnstyledButton>

            <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs">
                <Badge color="red" variant="filled">
                  {entry.reportCount} {entry.reportCount === 1 ? 'report' : 'reports'}
                </Badge>
                {entry.status && (
                  <Badge color={STATUS_COLORS[entry.status] ?? 'gray'} variant="light">{entry.status}</Badge>
                )}
              </Group>
              <Text fw={600} truncate>
                {fullName(entry.user)}
                {entry.user?.email && <Text span c="dimmed" fw={400} size="sm"> · {entry.user.email}</Text>}
              </Text>
              <Text size="sm" c="dimmed">
                {entry.competition?.title ?? 'Deleted competition'}
                {' · submitted '}{formatDate(entry.submittedAt)}
              </Text>
            </Stack>
          </Group>

          <Stack gap="xs" mt="md">
            {entry.reports.map((report, i) => (
              <Paper key={`${report.userId}-${i}`} withBorder p="sm" bg="var(--mantine-color-default-hover)">
                <Group gap="xs" wrap="nowrap" align="flex-start">
                  <Avatar size="sm" radius="xl" color="initials" name={fullName(report.user)} />
                  <div style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500}>
                      {fullName(report.user)}
                      <Text span size="xs" c="dimmed"> · {formatDate(report.createdAt)}</Text>
                    </Text>
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{report.reason}</Text>
                  </div>
                </Group>
              </Paper>
            ))}
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => { setActionError(''); setConfirm({ entry, action: 'dismiss' }) }}>
              Dismiss reports
            </Button>
            <Button color="red" variant="light" onClick={() => { setActionError(''); setConfirm({ entry, action: 'delete' }) }}>
              Delete entry
            </Button>
          </Group>
        </Card>
      ))}

      <Modal opened={!!viewing} onClose={() => setViewing(null)} title={viewing ? fullName(viewing.user) : ''} size="xl" centered>
        {viewing?.imageUrl && <Image src={viewing.imageUrl} alt="Reported entry" radius="md" mah="70vh" fit="contain" />}
      </Modal>

      <Modal
        opened={!!confirm}
        onClose={() => !busy && setConfirm(null)}
        title={confirm?.action === 'delete' ? 'Delete entry' : 'Dismiss reports'}
        centered
      >
        <Stack>
          <Text size="sm">
            {confirm?.action === 'delete'
              ? `Delete ${fullName(confirm?.entry.user)}'s entry? It's removed from the competition for good.`
              : `Clear the reports on ${fullName(confirm?.entry.user)}'s entry? The entry stays in the competition.`}
          </Text>
          {actionError && <Alert color="red" variant="light">{actionError}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirm(null)} disabled={busy}>Cancel</Button>
            <Button color={confirm?.action === 'delete' ? 'red' : undefined} loading={busy} onClick={runConfirm}>
              {confirm?.action === 'delete' ? 'Delete entry' : 'Dismiss reports'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  )
}
