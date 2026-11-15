import { useState } from 'react'
import {
  Alert, Button, Center, Paper, PasswordInput,
  SegmentedControl, Stack, TextInput, Title,
} from '@mantine/core'
import { login, register } from '../API/api.js'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isRegister = mode === 'register'
  const update = (field) => (e) => setForm({ ...form, [field]: e.currentTarget.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (isRegister && form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const data = isRegister ? await register(form) : await login(form)

      console.log(`${mode} success`, data)
    } catch (err) {
      setError(err.message)
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
              {isRegister ? 'Create account' : 'Welcome back'}
            </Title>

            <SegmentedControl
              fullWidth
              value={mode}
              onChange={(v) => {
                setMode(v)
                setError('')
              }}
              data={[
                { label: 'Login', value: 'login' },
                { label: 'Register', value: 'register' },
              ]}
            />

            {isRegister && (
              <TextInput label="Name" required value={form.name} onChange={update('name')} />
            )}
            <TextInput label="Email" type="email" required value={form.email} onChange={update('email')} />
            <PasswordInput label="Password" required value={form.password} onChange={update('password')} />
            {isRegister && (
              <PasswordInput label="Confirm password" required value={form.confirm} onChange={update('confirm')} />
            )}

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