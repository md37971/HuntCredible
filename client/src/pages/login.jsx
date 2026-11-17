import { useState } from 'react'
import {
  Alert, Button, Center, Paper, PasswordInput,
  SegmentedControl, Stack, TextInput, Title, Group
} from '@mantine/core'
import { login, register } from '../API/api.js'
import { useNavigate } from 'react-router'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  
  const navigate = useNavigate()
  const isRegister = mode === 'register'
  const update = (field) => (e) => setForm({ ...form, [field]: e.currentTarget.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (isRegister && form.password !== form.confirm) {
      setError('Passwords do not match')
      setForm({ ...form, password: '', confirm: '' })
      return
    }

    setLoading(true)
    try {
      if (isRegister) {
        await register(form)
        setMode('login')
        setForm({ ...form, firstName: '', lastName: '', password: '', confirm: '' })
        setSuccess('Account created. Please log in.')
      } else {
        const data = await login(form)
        navigate('/', {replace: true})
        console.log('login success', data)
      }
    } catch (err) {
      setError(err.response?.data?.content?.message || err.message)
      if (isRegister) {
        setForm({ ...form, email: ''})
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Center mih="80vh">
      <Paper withBorder p="xl" w={360}>
        <form onSubmit={handleSubmit}>
          <Stack>
            <Title order={3} ta="center">
              {isRegister ? 'Create account' : 'HuntCredible'}
            </Title>

            <SegmentedControl
              fullWidth
              value={mode}
              onChange={(v) => {
                setMode(v)
                setError('')
                setSuccess('')
              }}
              data={[
                { label: 'Login', value: 'login' },
                { label: 'Register', value: 'register' },
              ]}
            />

            {isRegister && (
              <Group grow>
                <TextInput label="First name" required value={form.firstName} onChange={update('firstName')} />
                <TextInput label="Last name" required value={form.lastName} onChange={update('lastName')} />
              </Group>
            )}
            <TextInput label="Email" type="email" required value={form.email} onChange={update('email')} />
            <PasswordInput label="Password" required value={form.password} onChange={update('password')} />
            {isRegister && (
              <PasswordInput label="Confirm password" required value={form.confirm} onChange={update('confirm')} />
            )}
            {success && <Alert color="green" variant="light">{success}</Alert>}
            {error && <Alert color="red" variant="light">{error}</Alert>}

            <Button type="submit" loading={loading} fullWidth>
              {isRegister ? 'Register' : 'Login'}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}