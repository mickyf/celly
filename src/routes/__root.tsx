import { Outlet, createRootRoute } from '@tanstack/react-router'
import { AppShell, Burger, Group, NavLink, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconBottle,
  IconHome,
  IconChefHat,
  IconLogin,
  IconLogout
} from '@tabler/icons-react'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const [opened, { toggle }] = useDisclosure()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <IconBottle size={28} stroke={1.5} />
            <Title order={3}>Celly</Title>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {user ? (
          <>
            <NavLink
              href="/"
              label="Dashboard"
              leftSection={<IconHome size={20} stroke={1.5} />}
            />
            <NavLink
              href="/wines"
              label="My Wines"
              leftSection={<IconBottle size={20} stroke={1.5} />}
            />
            <NavLink
              href="/pairing"
              label="Food Pairing"
              leftSection={<IconChefHat size={20} stroke={1.5} />}
            />
            <NavLink
              label="Sign Out"
              leftSection={<IconLogout size={20} stroke={1.5} />}
              onClick={handleSignOut}
              style={{ marginTop: 'auto' }}
            />
          </>
        ) : (
          <NavLink
            href="/login"
            label="Sign In"
            leftSection={<IconLogin size={20} stroke={1.5} />}
          />
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
