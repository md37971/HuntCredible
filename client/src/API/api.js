import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
})

//////////////// Functions Below //////////////////


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