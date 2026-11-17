import { useEffect, useState } from 'react'
import { AppShell, Burger, Group, NavLink, Title, Button } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { getMe, logout } from './API/api.js'
import UserMenu from './components/userMenu.jsx'

const links = [
  { label: 'Home', to: '/' },
  { label: 'Parties', to: '/parties'},
  { label: 'Hunting Sessions', to: './sessions'}
]

export default function App() {
  const [opened, { toggle, close }] = useDisclosure()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let ignore = false

    getMe()
      .then((data) => { if (!ignore) setUser(data.content.user) })
      .catch(() => { })
      .finally(() => { if (!ignore) setChecked(true) })

    return () => { ignore = true }
  }, [])

  async function handleLogout() {
    try {
      await logout()
    } finally {
      setUser(null)
      navigate('/login', { replace: true })
    }
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={4}>HuntCredible</Title>
          </Group>
          {checked && (user
            ? <UserMenu user={user} onLogout={handleLogout} />
            : (
              <Button component={Link} to="/login" variant="default">
                Login
              </Button>
            ))}
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        {links.map((link) => (
          <NavLink
            key={link.to}
            label={link.label}
            component={Link}
            to={link.to}
            onClick={close}
          />
        ))}
      </AppShell.Navbar>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
