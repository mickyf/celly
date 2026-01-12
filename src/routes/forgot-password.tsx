import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
    Container,
    Paper,
    Title,
    Text,
    TextInput,
    Button,
    Stack,
    Anchor,
    Group,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { supabase } from '../lib/supabase'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconArrowLeft } from '@tabler/icons-react'

export const Route = createFileRoute('/forgot-password')({
    component: ForgotPassword,
})

function ForgotPassword() {
    const navigate = useNavigate()
    const [submitting, setSubmitting] = useState(false)
    const { t } = useTranslation('auth')

    const form = useForm({
        initialValues: {
            email: '',
        },
        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : t('validation.invalidEmail')),
        },
    })

    const handleSubmit = async (values: typeof form.values) => {
        setSubmitting(true)
        const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
            redirectTo: `${window.location.origin}/reset-password`,
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
                message: t('validation.resetLinkSent'),
                color: 'green',
            })
            navigate({ to: '/login' })
        }
        setSubmitting(false)
    }

    return (
        <Container size={420} my={40}>
            <Title ta="center">{t('notifications.forgotPasswordTitle')}</Title>
            <Text c="dimmed" size="sm" ta="center" mt={5}>
                {t('notifications.forgotPasswordSubtitle')}
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        <TextInput
                            label={t('fields.email')}
                            placeholder={t('placeholders.email')}
                            required
                            {...form.getInputProps('email')}
                        />
                        <Group justify="space-between" mt="lg">
                            <Anchor
                                component={Link}
                                to="/login"
                                size="sm"
                                display="flex"
                                style={{ alignItems: 'center', gap: '4px' }}
                            >
                                <IconArrowLeft size={14} />
                                {t('buttons.backToLogin')}
                            </Anchor>
                            <Button type="submit" loading={submitting}>
                                {t('buttons.sendResetLink')}
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Paper>
        </Container>
    )
}
