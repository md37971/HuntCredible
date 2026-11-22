import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  ActionIcon, Alert, AspectRatio, Avatar, Badge, Button, Card, Center, Group, Image, List, Loader, Modal,
  Paper, Radio, SegmentedControl, SimpleGrid, Stack, Tabs, Text, Textarea, Title, Tooltip, UnstyledButton,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import {
  errorMessage, getCompetition, getCompetitionEntries, getMe, notBuiltYet,
  reportEntry, submitCompetitionEntry, unvoteEntry, voteEntry,
} from '../API/api.js'
import {
  categoryOf, formatDate, fullName, plural, timeLabel,
} from '../data/competition.js'

const CAPTION_MAX = 200
const sameId = (a, b) => String(a) === String(b)

const REPORT_REASONS = [
  'Photo is older than the competition',
  "Doesn't fit this competition",
  "Not their photo (stolen or copied)",
  'Inappropriate content',
  'Other',
]
const REPORT_DETAILS_MAX = 250

function FlagIcon({ filled }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 8 2a6 6 0 0 0 3.6-1.2 1 1 0 0 1 1.4.9v10.6a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a8 8 0 0 0-4 1" />
    </svg>
  )
}

function ThumbIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.9 14 10h5.8a2 2 0 0 1 1.9 2.6l-2.3 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L12 2a3.1 3.1 0 0 1 3 3.9Z" />
    </svg>
  )
}

export default function CompetitionDetail() {
  const { competitionId } = useParams()
  const [competition, setCompetition] = useState(null)
  const [entries, setEntries] = useState([])
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  const [tab, setTab] = useState('entries')
  const [sort, setSort] = useState('top')
  const [voteError, setVoteError] = useState('')
  const [votingId, setVotingId] = useState(null)
  const [viewing, setViewing] = useState(null) 
  const [submitOpen, setSubmitOpen] = useState(false)
  const [reporting, setReporting] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let ignore = false
    Promise.all([getMe(), getCompetition(competitionId), getCompetitionEntries(competitionId)])
      .then(([meRes, c, list]) => {
        if (ignore) return
        setMe(meRes.content.user)
        setCompetition(c)
        setEntries(list)
      })
      .catch((err) => { if (!ignore) setError(errorMessage(err, 'Could not load this competition')) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [competitionId])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return <Center mih="50vh"><Loader /></Center>
  }

  if (error) {
    return (
      <Stack maw={900} mx="auto">
        <BackLink />
        <Alert color="red" variant="light">{error}</Alert>
      </Stack>
    )
  }

  const category = categoryOf(competition)
  const isMine = (e) => sameId(e.userId, me._id)
  const nameOf = (e) => (isMine(e) ? 'You' : e.user ? fullName(e.user) : 'Hunter')
  const myEntry = entries.find(isMine)

  const sorted = [...entries].sort((a, b) =>
    sort === 'top'
      ? b.voteCount - a.voteCount
      : new Date(b.createdAt) - new Date(a.createdAt))

  async function reloadEntries() {
    try {
      setEntries(await getCompetitionEntries(competitionId))
    } catch {
      
    }
  }

  async function toggleVote(entry) {
    const voting = !entry.userVoted
    setVoteError('')
    setVotingId(entry._id)
    const patch = (userVoted, voteCount) =>
      setEntries((list) => list.map((e) => (e._id === entry._id ? { ...e, userVoted, voteCount } : e)))
    patch(voting, entry.voteCount + (voting ? 1 : -1))
    try {
      const res = voting ? await voteEntry(entry._id) : await unvoteEntry(entry._id)
      if (res) patch(res.userVoted, res.voteCount)
    } catch (err) {
      patch(entry.userVoted, entry.voteCount)
      setVoteError(notBuiltYet(err)
        ? "Voting isn't available yet."
        : errorMessage(err, 'Could not save your vote'))
    } finally {
      setVotingId(null)
    }
  }

  function handleReported(entryId) {
    setEntries((list) => list.map((e) => (e._id === entryId ? { ...e, userReported: true } : e)))
    setReporting(null)
    setNotice('Thanks. Your report was sent and will be reviewed.')
  }

  async function handleSubmitted() {
    setSubmitOpen(false)
    setSort('newest')
    setTab('entries')
    await reloadEntries()
  }

  return (
    <Stack maw={900} mx="auto">
      <BackLink />

      <Card withBorder padding="lg">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={3}>{competition.title}</Title>
              <Group gap="xs" mt={6}>
                <Badge color={category.color} variant="light">{category.label}</Badge>
                {competition.pointsReward != null && (
                  <Badge variant="default">{competition.pointsReward} pts</Badge>
                )}
              </Group>
            </div>

            {!myEntry && <Button onClick={() => setSubmitOpen(true)}>Submit entry</Button>}
            {myEntry && <Badge size="lg" variant="outline">Entered</Badge>}
          </Group>

          {competition.description && <Text>{competition.description}</Text>}

          <Text size="sm" c="dimmed">
            {timeLabel(competition, now)}
            {' · '}
            {formatDate(competition.startDate)} – {formatDate(competition.endDate)}
            {' · '}
            {plural(entries.length, 'entry', 'entries')}
          </Text>

          <List size="sm" spacing={2} c="dimmed">
            <List.Item>One entry per person.</List.Item>
            <List.Item>Vote for as many entries as you like.</List.Item>
          </List>
        </Stack>
      </Card>

      <Tabs value={tab} onChange={setTab} keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="entries">Entries ({entries.length})</Tabs.Tab>
          <Tabs.Tab value="standings">Standings</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="entries" pt="md">
          <Stack>
            {entries.length > 1 && (
              <SegmentedControl
                value={sort}
                onChange={setSort}
                data={[{ value: 'top', label: 'Top' }, { value: 'newest', label: 'Newest' }]}
                w="fit-content"
                size="xs"
              />
            )}

            {voteError && <Alert color="red" variant="light">{voteError}</Alert>}
            {notice && (
              <Alert color="green" variant="light" withCloseButton onClose={() => setNotice('')}>
                {notice}
              </Alert>
            )}

            {entries.length === 0 ? (
              <Text c="dimmed">No entries yet. Be the first!</Text>
            ) : (
              <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }}>
                {sorted.map((entry) => (
                  <EntryCard
                    key={entry._id}
                    entry={entry}
                    name={nameOf(entry)}
                    mine={isMine(entry)}
                    busy={votingId === entry._id}
                    onVote={() => toggleVote(entry)}
                    onOpen={() => setViewing(entry)}
                    onReport={() => { setNotice(''); setReporting(entry) }}
                  />
                ))}
              </SimpleGrid>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="standings" pt="md">
          <Standings
            entries={entries}
            nameOf={nameOf}
            isMine={isMine}
            onOpen={setViewing}
          />
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing ? nameOf(viewing) : ''}
        size="xl"
        centered
      >
        {viewing && (
          <Stack>
            <EntryImage entry={viewing} mah="70vh" fit="contain" />
            {viewing.caption && <Text>{viewing.caption}</Text>}
            <Text size="sm" c="dimmed">{plural(viewing.voteCount, 'vote')}</Text>
          </Stack>
        )}
      </Modal>

      <ReportModal
        entry={reporting}
        name={reporting ? nameOf(reporting) : ''}
        onClose={() => setReporting(null)}
        onReported={handleReported}
      />

      <SubmitModal
        opened={submitOpen}
        onClose={() => setSubmitOpen(false)}
        competition={competition}
        onSubmitted={handleSubmitted}
      />
    </Stack>
  )
}

function BackLink() {
  return (
    <Button component={Link} to="/competitions" variant="transparent" w="fit-content" px={0}>
      ← All competitions
    </Button>
  )
}

function EntryImage({ entry, ...props }) {
  if (!entry.imageUrl) {
    return (
      <Center h="100%" mih={120} bg="var(--mantine-color-default-hover)">
        <Text size="sm" c="dimmed">No photo</Text>
      </Center>
    )
  }
  return <Image src={entry.imageUrl} alt={entry.caption || 'Competition entry'} {...props} />
}

function EntryCard({ entry, name, mine, busy, onVote, onOpen, onReport }) {
  return (
    <Card withBorder padding="sm">
      <Card.Section>
        <UnstyledButton onClick={onOpen} w="100%" aria-label="View full size">
          <AspectRatio ratio={4 / 3}>
            <EntryImage entry={entry} fit="cover" />
          </AspectRatio>
        </UnstyledButton>
      </Card.Section>

      <Text size="sm" mt="sm" lineClamp={2} c={entry.caption ? undefined : 'dimmed'}>
        {entry.caption || 'No caption'}
      </Text>

      <Group justify="space-between" mt="sm" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <Avatar size="sm" radius="xl" color="initials" name={name} />
          <Text size="sm" truncate>{name}</Text>
        </Group>

        {mine ? (
          <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
            {plural(entry.voteCount, 'vote')} · your entry
          </Text>
        ) : (
          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
            <Tooltip label={entry.userReported ? 'You reported this entry' : 'Report this entry'}>
              <ActionIcon
                variant="subtle"
                color={entry.userReported ? 'red' : 'gray'}
                onClick={onReport}
                disabled={entry.userReported}
                aria-label={entry.userReported ? 'You reported this entry' : 'Report this entry'}
              >
                <FlagIcon filled={entry.userReported} />
              </ActionIcon>
            </Tooltip>
            <Button
              size="compact-sm"
              variant={entry.userVoted ? 'filled' : 'default'}
              leftSection={<ThumbIcon filled={entry.userVoted} />}
              onClick={onVote}
              disabled={busy}
              aria-pressed={entry.userVoted}
              aria-label={entry.userVoted ? 'Remove your vote' : 'Vote for this entry'}
            >
              {entry.voteCount}
            </Button>
          </Group>
        )}
      </Group>
    </Card>
  )
}


function Standings({ entries, nameOf, isMine, onOpen }) {
  if (entries.length === 0) return <Text c="dimmed">No entries yet.</Text>

  const rows = [...entries]
    .sort((a, b) => b.voteCount - a.voteCount)
    .map((e, i) => ({ ...e, rank: i + 1 }))

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">Current standings. The entry with the most votes when the competition ends wins.</Text>

      {rows.map((row) => {
        return (
          <Paper key={row._id} withBorder p="sm" bg={isMine(row) ? 'var(--mantine-primary-color-light)' : undefined}>
            <Group wrap="nowrap" gap="md">
              <Center
                w={32}
                h={32}
                style={{
                  flexShrink: 0,
                  borderRadius: '50%',
                  background: 'var(--mantine-color-default-hover)',
                  fontWeight: 700,
                }}
              >
                {row.rank}
              </Center>
              <UnstyledButton onClick={() => onOpen(row)} aria-label="View full size" style={{ flexShrink: 0 }} w={56} h={42}>
                <EntryImage entry={row} w={56} h={42} radius="sm" fit="cover" />
              </UnstyledButton>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text fw={500} truncate>{nameOf(row)}</Text>
                {row.caption && <Text size="xs" c="dimmed" truncate>{row.caption}</Text>}
              </div>
              <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                <ThumbIcon filled />
                <Text fw={600}>{row.voteCount}</Text>
              </Group>
            </Group>
          </Paper>
        )
      })}
    </Stack>
  )
}

function ReportModal({ entry, name, onClose, onReported }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const isOther = reason === 'Other'
  const canSend = reason && (!isOther || details.trim().length >= 3)

  function reset() {
    setReason('')
    setDetails('')
    setError('')
  }

  function close() {
    if (!sending) onClose()
  }

  async function send() {
    setSending(true)
    setError('')
    const message = isOther
      ? details.trim()
      : details.trim() ? `${reason}: ${details.trim()}` : reason
    try {
      await reportEntry(entry._id, message)
      onReported(entry._id)
    } catch (err) {
      if (err.response?.status === 409) onReported(entry._id)
      else if (notBuiltYet(err)) setError("Reporting isn't available yet.")
      else setError(errorMessage(err, 'Could not send your report'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      opened={!!entry}
      onClose={close}
      title={`Report ${name}'s entry`}
      centered
      closeOnClickOutside={!sending}
      onExitTransitionEnd={reset}
    >
      <Stack>
        <Radio.Group value={reason} onChange={setReason} label="What's wrong with this entry?">
          <Stack gap="xs" mt="xs">
            {REPORT_REASONS.map((r) => <Radio key={r} value={r} label={r} />)}
          </Stack>
        </Radio.Group>

        <Textarea
          label={isOther ? 'Tell us what happened' : 'Details (optional)'}
          placeholder={isOther ? 'Describe the problem' : 'Anything that helps a moderator review it'}
          autosize
          minRows={2}
          maxLength={REPORT_DETAILS_MAX}
          value={details}
          onChange={(e) => setDetails(e.currentTarget.value)}
          description={`${details.length}/${REPORT_DETAILS_MAX}`}
          inputWrapperOrder={['label', 'input', 'description']}
        />

        <Text size="xs" c="dimmed">
          Reports are private. The person who posted the entry won't see who reported it.
        </Text>

        {error && <Alert color="red" variant="light">{error}</Alert>}

        <Group justify="flex-end">
          <Button variant="default" onClick={close} disabled={sending}>Cancel</Button>
          <Button color="red" onClick={send} loading={sending} disabled={!canSend}>Send report</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Your browser can't share its location."))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      () => reject(new Error('Allow location access to submit. It is used to verify where the photo was taken.')),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  })
}

function SubmitModal({ opened, onClose, competition, onSubmitted }) {
  const isMobile = useMediaQuery('(max-width: 48em)')
  const cameraInput = useRef(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function reset() {
    setFile(null)
    setPreview(null)
    setCaption('')
    setError('')
  }

  function close() {
    if (saving) return
    onClose()
  }

  function pick(e) {
    const chosen = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!chosen) return
    setFile(chosen)
    setPreview(URL.createObjectURL(chosen))
    setError('')
  }

  async function submit() {
    setSaving(true)
    setError('')
    try {
      const { latitude, longitude } = await currentPosition()
      await submitCompetitionEntry(competition._id, {
        image: file,
        caption: caption.trim(),
        latitude,
        longitude,
        capturedAt: new Date(file.lastModified || Date.now()).toISOString(),
      })
      await onSubmitted()
    } catch (err) {
      if (notBuiltYet(err)) setError("Submitting entries isn't available yet.")
      else setError(err.response ? errorMessage(err, 'Could not submit your entry') : err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      opened={opened}
      onClose={close}
      title={`Enter: ${competition.title}`}
      size="lg"
      centered
      fullScreen={isMobile}
      closeOnClickOutside={!saving}
      onExitTransitionEnd={reset}
    >
      <Stack>
        {preview ? (
          <Image src={preview} alt="Your entry" radius="md" mah={320} fit="contain" />
        ) : (
          <Paper withBorder p="xl" style={{ borderStyle: 'dashed' }}>
            <Stack align="center" gap="xs">
              <Text fw={500}>Take a photo for your entry</Text>
              <Text size="sm" c="dimmed" ta="center">
                One entry per competition.
              </Text>
            </Stack>
          </Paper>
        )}

        <Button variant={preview ? 'default' : 'filled'} onClick={() => cameraInput.current?.click()}>
          {preview ? 'Retake photo' : 'Take photo'}
        </Button>
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={pick} />

        <Textarea
          label="Caption"
          placeholder="Optional. Include some details."
          autosize
          minRows={2}
          maxLength={CAPTION_MAX}
          value={caption}
          onChange={(e) => setCaption(e.currentTarget.value)}
          description={`${caption.length}/${CAPTION_MAX}`}
          inputWrapperOrder={['label', 'input', 'description']}
        />

        <Text size="xs" c="dimmed">We'll verify your entry by asking for your location for this entry.</Text>

        {error && <Alert color="red" variant="light">{error}</Alert>}

        <Group justify="flex-end">
          <Button variant="default" onClick={close} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving} disabled={!file}>Submit entry</Button>
        </Group>
      </Stack>
    </Modal>
  )
}
