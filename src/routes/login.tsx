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

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loginForm = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
    },
  })

  const signupForm = useForm({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length >= 6 ? null : 'Password must be at least 6 characters'),
      confirmPassword: (value, values) =>
        value !== values.password ? 'Passwords do not match' : null,
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
        title: 'Login failed',
        message: error.message,
        color: 'red',
      })
    } else {
      notifications.show({
        title: 'Success',
        message: 'Logged in successfully',
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
        title: 'Signup failed',
        message: error.message,
        color: 'red',
      })
    } else {
      notifications.show({
        title: 'Success',
        message: 'Account created! Please check your email to confirm.',
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
      <Title ta="center">Welcome to Celly</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Manage your wine cellar with ease
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Tabs defaultValue="login">
          <Tabs.List grow>
            <Tabs.Tab value="login">Login</Tabs.Tab>
            <Tabs.Tab value="signup">Sign Up</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="login" pt="xl">
            <form onSubmit={loginForm.onSubmit(handleLogin)}>
              <Stack>
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  required
                  {...loginForm.getInputProps('email')}
                />
                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  required
                  {...loginForm.getInputProps('password')}
                />
                <Button type="submit" fullWidth loading={submitting}>
                  Sign in
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="signup" pt="xl">
            <form onSubmit={signupForm.onSubmit(handleSignup)}>
              <Stack>
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  required
                  {...signupForm.getInputProps('email')}
                />
                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  required
                  {...signupForm.getInputProps('password')}
                />
                <PasswordInput
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  required
                  {...signupForm.getInputProps('confirmPassword')}
                />
                <Button type="submit" fullWidth loading={submitting}>
                  Create account
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  )
}
