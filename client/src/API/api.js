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
