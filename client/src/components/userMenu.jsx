import { Avatar, Menu, Text, UnstyledButton } from '@mantine/core'
import { Link } from 'react-router'

export default function UserMenu({ user, onLogout }) {
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email

  return (
    <Menu position="bottom-end" width={220} shadow="md">
      <Menu.Target>
        <UnstyledButton aria-label="Account menu">
          <Avatar name={name} color="initials" radius="xl" />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>
          <Text size="sm" fw={500} c="bright">{name}</Text>
          {user.email && <Text size="xs" c="dimmed" truncate>{user.email}</Text>}
        </Menu.Label>
        <Menu.Item component={Link} to="/profile">View profile</Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" onClick={onLogout}>Log out</Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
