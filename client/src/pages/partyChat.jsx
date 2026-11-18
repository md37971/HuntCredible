import { useEffect, useRef, useState } from 'react'
import { useOutletContext, useParams } from 'react-router'
import {
  Alert, Avatar, Box, Button, Center, Divider, Group, Loader, Paper, ScrollArea, Stack, Text, Textarea,
} from '@mantine/core'
import {
  deleteMessage, errorMessage, getMessages, getPartyMembers, sendMessage,
} from '../API/api.js'

const POLL = 3000
const MAX_LEN = 2000
const GROUP_MS = 5 * 60 * 1000

const sameId = (a, b) => String(a) === String(b)
const fullName = (m) => `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || 'Unknown'
const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const dayOf = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export default function PartyChat() {
  const { me } = useOutletContext()
  const { partyId } = useParams()

  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const viewport = useRef(null)
  const atBottom = useRef(true)
  const jumpNext = useRef(true)

  useEffect(() => {
    let ignore = false
    getPartyMembers(partyId)
      .then((data) => {
        if (!ignore) setMembers(data)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [partyId])

  useEffect(() => {
    let ignore = false

    const load = () =>
      getMessages(partyId)
        .then((data) => {
          if (ignore) return
          setMessages(data)
          setLoadError('')
        })
        .catch((err) => {
          if (!ignore) setLoadError(errorMessage(err, 'Could not load messages'))
        })
        .finally(() => {
          if (!ignore) setLoaded(true)
        })

    load()
    const id = setInterval(load, POLL)
    return () => {
      ignore = true
      clearInterval(id)
    }
  }, [partyId])

  // Stay pinned to the bottom unless the user scrolled up to read history
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    if (jumpNext.current || atBottom.current) {
      el.scrollTo({ top: el.scrollHeight })
      jumpNext.current = false
    }
  }, [messages, loaded])

  function onScroll() {
    const el = viewport.current
    if (!el) return
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
  }

  const canDelete = (msg) => sameId(msg.senderId, me._id)

  const nameOf = (senderId) => {
    const member = members.find((m) => sameId(m.userId, senderId))
    if (member) return fullName(member)
    if (sameId(senderId, me._id)) return fullName(me)
    return 'Former member'
  }

  async function send() {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    setActionError('')
    try {
      const created = await sendMessage(partyId, content)
      jumpNext.current = true
      setMessages((list) => [...list, { ...created, _id: created.messageId }])
      setDraft('')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not send message'))
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function remove(messageId) {
    setDeletingId(messageId)
    setActionError('')
    try {
      await deleteMessage(messageId)
      setMessages((list) => list.filter((m) => !sameId(m._id, messageId)))
      setConfirmDeleteId(null)
    } catch (err) {
      setActionError(errorMessage(err, 'Could not delete message'))
    } finally {
      setDeletingId(null)
    }
  }

  if (!loaded) {
    return <Center mih={300}><Loader /></Center>
  }

  return (
    <Stack gap="sm">
      {loadError && <Alert color="red" variant="light">{loadError}</Alert>}

      <Paper withBorder>
        <ScrollArea h="55vh" viewportRef={viewport} onScrollPositionChange={onScroll} px="md" py="sm">
          {messages.length === 0 ? (
            <Center h="50vh">
              <Text c="dimmed" size="sm">No messages yet. Say something to your party.</Text>
            </Center>
          ) : (
            messages.map((msg, i) => {
              const prev = messages[i - 1]
              const newDay = !prev || dayOf(prev.createdAt) !== dayOf(msg.createdAt)
              const showHeader =
                newDay ||
                !sameId(prev.senderId, msg.senderId) ||
                new Date(msg.createdAt) - new Date(prev.createdAt) > GROUP_MS
              const name = nameOf(msg.senderId)
              const confirming = sameId(confirmDeleteId, msg._id)
              const mine = sameId(msg.senderId, me._id)

              return (
                <Box key={String(msg._id)}>
                  {newDay && <Divider my="sm" label={dayOf(msg.createdAt)} labelPosition="center" />}
                  <Group
                    align="flex-end"
                    wrap="nowrap"
                    gap="sm"
                    mt={showHeader ? 'sm' : 2}
                    style={{ flexDirection: mine ? 'row-reverse' : 'row' }}
                  >
                    {!mine && (showHeader
                      ? <Avatar radius="xl" color="initials" name={name} />
                      : <Box w={38} style={{ flexShrink: 0 }} />)}

                    <Stack gap={2} align={mine ? 'flex-end' : 'flex-start'} style={{ minWidth: 0, maxWidth: '75%' }}>
                      {showHeader && (
                        <Group gap="xs">
                          {!mine && <Text fw={600} size="sm">{name}</Text>}
                          <Text size="xs" c="dimmed">{timeOf(msg.createdAt)}</Text>
                        </Group>
                      )}
                      <Box
                        px="sm"
                        py={6}
                        style={{
                          borderRadius: 12,
                          background: mine ? 'var(--mantine-color-green-filled)' : 'var(--mantine-color-default-hover)',
                          color: mine ? 'var(--mantine-color-white)' : undefined,
                        }}
                      >
                        <Text size="sm" c="inherit" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.content}
                        </Text>
                      </Box>
                    </Stack>

                    {canDelete(msg) && (
                      confirming ? (
                        <Group gap={4} wrap="nowrap">
                          <Button
                            size="compact-xs"
                            color="red"
                            loading={deletingId === msg._id}
                            onClick={() => remove(msg._id)}
                          >
                            Delete
                          </Button>
                          <Button
                            size="compact-xs"
                            variant="default"
                            disabled={deletingId === msg._id}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </Button>
                        </Group>
                      ) : (
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          color="gray"
                          onClick={() => setConfirmDeleteId(msg._id)}
                        >
                          Delete
                        </Button>
                      )
                    )}
                  </Group>
                </Box>
              )
            })
          )}
        </ScrollArea>
      </Paper>

      {actionError && <Alert color="red" variant="light">{actionError}</Alert>}

      <Group align="flex-end" wrap="nowrap">
        <Textarea
          style={{ flex: 1 }}
          placeholder="Message your party"
          autosize
          minRows={1}
          maxRows={5}
          maxLength={MAX_LEN}
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={onKeyDown}
          description={draft.length > MAX_LEN - 200 ? `${draft.length}/${MAX_LEN}` : undefined}
          inputWrapperOrder={['input', 'description']}
        />
        <Button onClick={send} loading={sending} disabled={!draft.trim()}>
          Send
        </Button>
      </Group>
    </Stack>
  )
}