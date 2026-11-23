import { Outlet, useLocation, useNavigate } from 'react-router'
import { Stack, Tabs, Text, Title } from '@mantine/core'

export default function Competition() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const tab = pathname.endsWith('/leaderboard') ? 'leaderboard' : 'list'

  return (
    <Stack maw={900} mx="auto">
      <div>
        <Title order={2}>Competitions</Title>
        <Text c="dimmed">Enter weekly photo competitions, vote for your favorites and climb the leaderboard.</Text>
      </div>

      <Tabs
        value={tab}
        onChange={(value) => navigate(value === 'leaderboard' ? '/competitions/leaderboard' : '/competitions')}
      >
        <Tabs.List>
          <Tabs.Tab value="list">Competitions</Tabs.Tab>
          <Tabs.Tab value="leaderboard">Leaderboard</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <Outlet />
    </Stack>
  )
}
