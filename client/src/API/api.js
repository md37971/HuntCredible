import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
})

export const errorMessage = (err, fallback) =>
  err.response?.data?.content?.message || fallback

//////////////// Login Functions //////////////////


export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function register({ firstName, lastName, email, password }) {
  const { data } = await api.post('/auth/register', { firstName, lastName, email, password })
  return data
}

export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function logout() {
  const { data } = await api.post('/auth/logout')
  return data
}

//////////////// Party Functions //////////////////

export async function getParties() {
  const { data } = await api.get('/parties')
  return data.data
}

export async function createParty({ name, description }) {
  const { data } = await api.post('/parties', { name, description })
  return data.data
}

export async function getParty(partyId) {
  const { data } = await api.get(`/parties/${partyId}`)
  return data.data
}

export async function leaveParty(partyId) {
  await api.post(`/parties/${partyId}/leave`)
}

export async function deleteParty(partyId) {
  await api.delete(`/parties/${partyId}`)
}

export async function removeMember(partyId, userId) {
  await api.delete(`/parties/${partyId}/members/${userId}`)
}

export async function getPartyMembers(partyId) {
    const { data } = await api.get(`/parties/${partyId}/members`)
    return data.data
}

export async function joinParty(inviteCode) {
  const { data } = await api.post('/parties/join', { inviteCode })
  return data.data
}

//////////////// Session Functions //////////////////

export async function getActiveSession(partyId) {
  try {
    const { data } = await api.get(`/parties/${partyId}/sessions/active`)
    return data.data
  } catch (err) {
    if (err.response?.status === 404) return null
    throw err
  }
}

export async function startSession(partyId) {
  try {
    const { data } = await api.post(`/parties/${partyId}/sessions`)
    return data.data
  } catch (err) {
    if (err.response?.status === 409 && err.response.data?.data) return err.response.data.data
    throw err
  }
}

export async function getSession(partyId, sessionId) {
  const { data } = await api.get(`/parties/${partyId}/sessions/${sessionId}`)
  return data.data
}

export async function endSession(sessionId) {
  const { data } = await api.post(`/sessions/${sessionId}/end`)
  return data.data
}

export async function getSessionLocations(sessionId) {
  const { data } = await api.get(`/sessions/${sessionId}/locations`)
  return data.data
}

export async function updateMyLocation(sessionId, { latitude, longitude }) {
  const { data } = await api.put(`/sessions/${sessionId}/locations`, { latitude, longitude })
  return data.data
}
export async function discoverParties() {
  const { data } = await api.get('/parties/discover')
  return data.data
}

//////////////// Pin Functions //////////////////

export async function getPins(partyId) {
  const { data } = await api.get(`/parties/${partyId}/pins`)
  return data.data
}

export async function createPin(partyId, { sessionId, description, latitude, longitude }) {
  const { data } = await api.post(`/parties/${partyId}/pins`, { sessionId, description, latitude, longitude })
  return data.data
}

export async function updatePin(partyId, pinId, description) {
  await api.patch(`/parties/${partyId}/pins/${pinId}`, { description })
}

export async function deletePin(partyId, pinId) {
  await api.delete(`/parties/${partyId}/pins/${pinId}`)
}

//////////////// Message Functions //////////////////

export async function getMessages(partyId) {
  const { data } = await api.get(`/parties/${partyId}/messages`)
  return data.data
}

export async function sendMessage(partyId, content) {
  const { data } = await api.post(`/parties/${partyId}/messages`, { content })
  return data.data
}

export async function deleteMessage(messageId) {
  await api.delete(`/parties/messages/${messageId}`)
}

//////////////// AI Model Functions //////////////////

export async function identifyAnimal(file) {
  const form = new FormData()
  form.append('image', file)
  const { data } = await api.post('/submission', form, { timeout: 60000 })
  return data.content
}
//////////////// Competition Functions //////////////////

const toEntry = (record) => {
  const s = record.submission ?? {}
  return {
    _id: s.submissionId ?? record._id,
    challengeId: record.challengeId,
    userId: record.userId,
    user: record.user ?? null, 
    imageUrl: s.imageUrl ?? record.imageUrl ?? null,
    caption: s.caption ?? record.caption ?? '',
    status: s.status ?? record.status ?? null, 
    createdAt: s.submittedAt ?? record.createdAt ?? null,
    voteCount: s.voteCount ?? record.voteCount ?? 0,
    userVoted: s.userVoted ?? record.userVoted ?? false,
  }
}

export async function getCompetitions() {
  const { data } = await api.get('/challenges')
  return data.data
}

export async function getCompetition(competitionId) {
  const { data } = await api.get(`/competition/${competitionId}`)
  return data.data
}

export async function getMyCompetitions() {
  const { data } = await api.get('/competition/me/entries')
  return data.data
}

export async function getCompetitionEntries(competitionId) {
  const { data } = await api.get(`/competition/${competitionId}/submissions`)
  return data.data.map(toEntry)
}

export async function submitCompetitionEntry(competitionId, { image, caption, latitude, longitude, capturedAt }) {
  const form = new FormData()
  form.append('image', image)
  if (caption) form.append('caption', caption)
  form.append('latitude', latitude)
  form.append('longitude', longitude)
  form.append('capturedAt', capturedAt)
  form.append('clientSubmissionId', crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`)
  const { data } = await api.post(`/competition/${competitionId}/submit`, form)
  return data.data
}

export async function voteEntry(submissionId) {
  const { data } = await api.post(`/submissions/${submissionId}/vote`, { vote: true })
  return data.data 
}

export async function unvoteEntry(submissionId) {
  const { data } = await api.delete(`/submissions/${submissionId}/vote`)
  return data.data
}

//////////////// Leaderboard Functions //////////////////

export async function getLeaderboard({ page = 1, limit = 10 } = {}) {
  const { data } = await api.get('/leaderboard', { params: { page, limit } })
  return data.data 
}

export async function getMyRank() {
  const { data } = await api.get('/leaderboard/me')
  return data.data 
}

export const notBuiltYet = (err) => err.response?.status === 404 && !err.response?.data?.content
