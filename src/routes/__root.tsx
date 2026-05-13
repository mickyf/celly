import { Outlet, createRootRoute, Link, useNavigate } from '@tanstack/react-router'
import { notifications } from '@mantine/notifications'
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
import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useTranslation } from 'react-i18next'
import { LanguageSelector } from '../components/LanguageSelector'
import { AppErrorBoundary } from '../components/ErrorBoundary'
import { OfflineBanner } from '../components/OfflineBanner'
import { setSentryUser } from '../lib/sentryUser'

export const Route = createRootRoute({
  component: RootLayout,
})

const PUBLIC_ROUTE_PREFIXES = ['/login', '/forgot-password', '/reset-password']

function RootLayout() {
  const [opened, { toggle, close }] = useDisclosure()
  const [user, setUser] = useState<User | null>(null)
  const { t } = useTranslation(['common', 'auth'])
  const navigate = useNavigate()
  const intentionalSignOut = useRef(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setSentryUser(currentUser)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setSentryUser(currentUser)

      // Surface unintentional sign-outs (e.g. token refresh failure).
      if (event === 'SIGNED_OUT' && !intentionalSignOut.current) {
        const onPublicRoute = PUBLIC_ROUTE_PREFIXES.some((p) =>
          window.location.pathname.startsWith(p),
        )
        if (!onPublicRoute) {
          notifications.show({
            title: t('auth:notifications.sessionExpiredTitle'),
            message: t('auth:notifications.sessionExpiredMessage'),
            color: 'orange',
          })
          navigate({ to: '/login' })
        }
      }
      intentionalSignOut.current = false
    })

    return () => subscription.unsubscribe()
  }, [navigate, t])

  const handleSignOut = async () => {
    intentionalSignOut.current = true
    await supabase.auth.signOut()
    setSentryUser(null)
    navigate({ to: '/login' })
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
        padding={{ base: 'xs', sm: 'md' }}
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label={t('buttons.openMenu')} />
              <Anchor component={Link} to="/" underline="never" c="inherit" onClick={close}>
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
                component={Link}
                to="/"
                label={t('nav.dashboard')}
                leftSection={<IconHome size={24} stroke={1.5} />}
                onClick={close}
              />
              <NavLink
                component={Link}
                to="/wines"
                label={t('nav.myWines')}
                leftSection={<IconBottle size={24} stroke={1.5} />}
                onClick={close}
              />
              <NavLink
                component={Link}
                to="/cellars"
                label={t('nav.cellarOverview')}
                leftSection={<IconGridDots size={24} stroke={1.5} />}
                onClick={close}
              />
              <NavLink
                component={Link}
                to="/wineries"
                label={t('nav.wineries')}
                leftSection={<IconBuilding size={24} stroke={1.5} />}
                onClick={close}
              />
              <NavLink
                component={Link}
                to="/pairing"
                label={t('nav.foodPairing')}
                leftSection={<IconChefHat size={24} stroke={1.5} />}
                onClick={close}
              />
              <NavLink
                component={Link}
                to="/settings"
                label={t('nav.settings')}
                leftSection={<IconSettings size={24} stroke={1.5} />}
                onClick={close}
              />
              <NavLink
                label={t('actions.signOut')}
                leftSection={<IconLogout size={24} stroke={1.5} />}
                onClick={() => {
                  close()
                  handleSignOut()
                }}
                style={{ marginTop: 'auto' }}
              />
            </>
          ) : (
            <NavLink
              component={Link}
              to="/login"
              label={t('actions.signIn')}
              leftSection={<IconLogin size={20} stroke={1.5} />}
              onClick={close}
            />
          )}
        </AppShell.Navbar>

        <AppShell.Main style={{ overflowX: 'hidden' }}>
          <OfflineBanner />
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </AppErrorBoundary>
  )
}
