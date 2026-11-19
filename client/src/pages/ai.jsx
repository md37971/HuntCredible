import { useEffect, useRef, useState } from 'react'
import {
  Accordion, Alert, Badge, Button, Center, Group, Image, List, Loader, Modal,
  Paper, SimpleGrid, Stack, Text, Title,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { errorMessage, identifyAnimal } from '../API/api.js'
import { animalInfo, REGULATIONS_NOTE } from '../data/animalInfo.js'

//Confidence %
const formatConfidence = (c) => {
  const n = parseFloat(c)
  return Number.isFinite(n) ? `${Math.round(n)}% match` : null
}

const hasCoords = (c) => Array.isArray(c) && c.length === 2 && !(c[0] === 0 && c[1] === 0)

export default function AnimalDetector() {
  const cameraInput = useRef(null)
  const uploadInput = useRef(null)
  const isMobile = useMediaQuery('(max-width: 48em)')

  const [opened, setOpened] = useState(false)
  const [preview, setPreview] = useState(null) // object URL of the chosen photo
  const [previewFailed, setPreviewFailed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  //destroy photo
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  async function handleFile(e) {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = '' // lets the same photo be picked again
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setPreviewFailed(false)
    setResult(null)
    setError('')
    setLoading(true)
    setOpened(true)

    try {
      setResult(await identifyAnimal(file))
    } catch (err) {
      setError(errorMessage(err, 'Could not analyze the photo. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  function close() {
    if (loading) return
    setOpened(false)
  }

  function retake() {
    setOpened(false)
    cameraInput.current?.click()
  }

  const detection = result?.success ? result.detections?.[0] : null
  const info = detection ? animalInfo[detection.name?.toLowerCase()] : null
  const confidence = detection ? formatConfidence(detection.confidence) : null

  return (
    <Stack maw={640} mx="auto">
      <Title order={2}>Animal Detector</Title>

      <Paper withBorder p="lg">
        <Stack>
          <div>
            <Title order={3}>Photograph an Animal</Title>
            <Text c="dimmed" mt={4}>
              Take a photo for us, and we'll let you know what you spotted!
            </Text>
          </div>

          <List spacing="xs" size="sm">
            <List.Item>Get as close as you safely can, so the animal fills the frame.</List.Item>
            <List.Item>Please limit submissions to only one animal in frame.</List.Item>
          </List>

          {/* Mobile */}
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <Button size="md" onClick={() => cameraInput.current?.click()}>Take Photo</Button>
            <Button size="md" variant="default" onClick={() => uploadInput.current?.click()}>
              Upload a Photo
            </Button>
          </SimpleGrid>
        </Stack>

        {/* capture="environment" opens the phone's rear camera directly */}
        <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
        <input ref={uploadInput} type="file" accept="image/*" hidden onChange={handleFile} />
      </Paper>

      <Modal
        opened={opened}
        onClose={close}
        title={loading ? 'Identifying…' : 'Result'}
        size="lg"
        centered
        fullScreen={isMobile}
        closeOnClickOutside={!loading}
        withCloseButton={!loading}
      >
        <Stack>
          {preview && !previewFailed && (
            <Image src={preview} alt="Your photo" radius="md" mah={260} fit="contain" onError={() => setPreviewFailed(true)} />
          )}

          {loading && (
            <Center py="md">
              <Stack align="center" gap="xs">
                <Loader />
                <Text size="sm" c="dimmed">Looking for animals in your photo…</Text>
              </Stack>
            </Center>
          )}

          {!loading && error && <Alert color="red" variant="light">{error}</Alert>}

          {!loading && result && !result.success && (
            <Alert color="yellow" variant="light" title="Couldn't identify an animal">
              {result.message}
            </Alert>
          )}

          {!loading && detection && (
            <>
              <div>
                <Group gap="xs" align="center">
                  <Title order={3}>{info?.name ?? detection.name}</Title>
                  {confidence && <Badge variant="light">{confidence}</Badge>}
                </Group>
                {hasCoords(result.coordinates) && (
                  <Text size="xs" c="dimmed" mt={4}>
                    Photo location: {result.coordinates[0].toFixed(5)}, {result.coordinates[1].toFixed(5)}
                  </Text>
                )}
              </div>

              {info ? (
                <>
                  <Accordion multiple defaultValue={['times', 'tracking']} variant="separated">
                    <Accordion.Item value="times">
                      <Accordion.Control>Peak hunting times</Accordion.Control>
                      <Accordion.Panel>
                        <List spacing={4} size="sm">
                          {info.peakTimes.map((t) => <List.Item key={t}>{t}</List.Item>)}
                        </List>
                      </Accordion.Panel>
                    </Accordion.Item>
                    <Accordion.Item value="tracking">
                      <Accordion.Control>How to track</Accordion.Control>
                      <Accordion.Panel>
                        <List spacing={4} size="sm">
                          {info.tracking.map((t) => <List.Item key={t}>{t}</List.Item>)}
                        </List>
                      </Accordion.Panel>
                    </Accordion.Item>
                    <Accordion.Item value="habitat">
                      <Accordion.Control>Where to find it</Accordion.Control>
                      <Accordion.Panel><Text size="sm">{info.habitat}</Text></Accordion.Panel>
                    </Accordion.Item>
                    <Accordion.Item value="notes">
                      <Accordion.Control>Good to know</Accordion.Control>
                        <Accordion.Panel>
                          <List spacing={4} size="sm">
                            {[].concat(info.notes).map((t) => <List.Item key={t}>{t}</List.Item>)}
                          </List>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>
                  <Text size="xs" c="dimmed">{REGULATIONS_NOTE}</Text>
                </>
              ) : (
                <Text size="sm" c="dimmed">We don't have hunting details for this animal yet.</Text>
              )}
            </>
          )}

          {!loading && (
            <Group justify="flex-end">
              <Button variant="default" onClick={close}>Close</Button>
              <Button onClick={retake}>Take another photo</Button>
            </Group>
          )}
        </Stack>
      </Modal>
    </Stack>
  )
}
