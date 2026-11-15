import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

//////////////// Functions Below //////////////////


export async function login({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function register({ name, email, password }) {
  const { data } = await api.post('/auth/register', { name, email, password })
  return data
}

export async function getUser() {
  const { data } = await api.get('/users:userId')
  return data
}