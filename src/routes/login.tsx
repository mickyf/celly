import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import {
  Container,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Tabs,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { t } = useTranslation('auth')

  const loginForm = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t('validation.invalidEmail')),
      password: (value) => (value.length >= 6 ? null : t('validation.passwordTooShort')),
    },
  })

  const signupForm = useForm({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : t('validation.invalidEmail')),
      password: (value) => (value.length >= 6 ? null : t('validation.passwordTooShort')),
      confirmPassword: (value, values) =>
        value !== values.password ? t('validation.passwordsDoNotMatch') : null,
    },
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
  }, [])

  const handleLogin = async (values: typeof loginForm.values) => {
    setSubmitting(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      notifications.show({
        title: t('notifications.loginFailed'),
        message: error.message,
        color: 'red',
      })
    } else {
      notifications.show({
        title: t('notifications.success'),
        message: t('notifications.loggedIn'),
        color: 'green',
      })
      navigate({ to: '/' })
    }
    setSubmitting(false)
  }

  const handleSignup = async (values: typeof signupForm.values) => {
    setSubmitting(true)
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    })

    if (error) {
      notifications.show({
        title: t('notifications.signupFailed'),
        message: error.message,
        color: 'red',
      })
    } else {
      notifications.show({
        title: t('notifications.success'),
        message: t('notifications.accountCreated'),
        color: 'green',
      })
    }
    setSubmitting(false)
  }

  if (loading) {
    return null
  }

  if (user) {
    return <Navigate to="/" />
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center">{t('title')}</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        {t('subtitle')}
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Tabs defaultValue="login">
          <Tabs.List grow>
            <Tabs.Tab value="login">{t('tabs.login')}</Tabs.Tab>
            <Tabs.Tab value="signup">{t('tabs.signup')}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="login" pt="xl">
            <form onSubmit={loginForm.onSubmit(handleLogin)}>
              <Stack>
                <TextInput
                  label={t('fields.email')}
                  placeholder={t('placeholders.email')}
                  required
                  {...loginForm.getInputProps('email')}
                />
                <PasswordInput
                  label={t('fields.password')}
                  placeholder={t('placeholders.password')}
                  required
                  {...loginForm.getInputProps('password')}
                />
                <Button type="submit" fullWidth loading={submitting}>
                  {t('buttons.signIn')}
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="signup" pt="xl">
            <form onSubmit={signupForm.onSubmit(handleSignup)}>
              <Stack>
                <TextInput
                  label={t('fields.email')}
                  placeholder={t('placeholders.email')}
                  required
                  {...signupForm.getInputProps('email')}
                />
                <PasswordInput
                  label={t('fields.password')}
                  placeholder={t('placeholders.password')}
                  required
                  {...signupForm.getInputProps('password')}
                />
                <PasswordInput
                  label={t('fields.confirmPassword')}
                  placeholder={t('placeholders.confirmPassword')}
                  required
                  {...signupForm.getInputProps('confirmPassword')}
                />
                <Button type="submit" fullWidth loading={submitting}>
                  {t('buttons.createAccount')}
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  )
}
