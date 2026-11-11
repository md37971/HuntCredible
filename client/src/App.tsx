import { AppShell, Burger, Group, NavLink, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

export default function App() {
  const [opened, { toggle }] = useDisclosure();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={4}>My App</Title>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md">
        <NavLink label="Home" active />
      </AppShell.Navbar>
      <AppShell.Main>Hello Mantine</AppShell.Main>
    </AppShell>
  );
}