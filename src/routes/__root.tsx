import { Outlet, createRootRoute, Link } from '@tanstack/react-router'
import { AppShell, Burger, Group, NavLink, Title, Anchor } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconBottle,
  IconBuilding,
  IconChefHat,
  IconHome,
  IconLogin,
  IconLogout,
  IconSettings,
  IconGridDots,
} from '@tabler/icons-react'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../components/LanguageSelector'
import { AppErrorBoundary } from '../components/ErrorBoundary'
import { setSentryUser } from '../lib/sentryUser'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const [opened, { toggle }] = useDisclosure()
  const [user, setUser] = useState<User | null>(null)
  const { t } = useTranslation('common')

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setSentryUser(currentUser)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setSentryUser(currentUser)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSentryUser(null)
  }

  return (
    <AppErrorBoundary>
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
              <Anchor component={Link} to="/" underline="never" c="inherit">
                <Group gap="xs">
                  <IconBottle size={28} stroke={1.5} />
                  <Title order={3}>Celly</Title>
                </Group>
              </Anchor>
            </Group>
            <LanguageSelector />
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          {user ? (
            <>
              <NavLink
                href="/"
                label={t('nav.dashboard')}
                leftSection={<IconHome size={24} stroke={1.5} />}
              />
              <NavLink
                href="/wines"
                label={t('nav.myWines')}
                leftSection={<IconBottle size={24} stroke={1.5} />}
              />
              <NavLink
                href="/cellars"
                label={t('nav.cellarOverview')}
                leftSection={<IconGridDots size={24} stroke={1.5} />}
              />
              <NavLink
                href="/wineries"
                label={t('nav.wineries')}
                leftSection={<IconBuilding size={24} stroke={1.5} />}
              />
              <NavLink
                href="/pairing"
                label={t('nav.foodPairing')}
                leftSection={<IconChefHat size={24} stroke={1.5} />}
              />
              <NavLink
                href="/settings"
                label={t('nav.settings')}
                leftSection={<IconSettings size={24} stroke={1.5} />}
              />
              <NavLink
                label={t('actions.signOut')}
                leftSection={<IconLogout size={24} stroke={1.5} />}
                onClick={handleSignOut}
                style={{ marginTop: 'auto' }}
              />
            </>
          ) : (
            <NavLink
              href="/login"
              label={t('actions.signIn')}
              leftSection={<IconLogin size={20} stroke={1.5} />}
            />
          )}
        </AppShell.Navbar>

        <AppShell.Main>
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </AppErrorBoundary>
  )
}
