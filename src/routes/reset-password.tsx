import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
    Container,
    Paper,
    Title,
    Text,
    PasswordInput,
    Button,
    Stack,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { supabase } from '../lib/supabase'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/reset-password')({
    component: ResetPassword,
})

function ResetPassword() {
    const navigate = useNavigate()
    const [submitting, setSubmitting] = useState(false)
    const { t } = useTranslation('auth')

    const form = useForm({
        initialValues: {
            password: '',
            confirmPassword: '',
        },
        validate: {
            password: (value) => (value.length >= 6 ? null : t('validation.passwordTooShort')),
            confirmPassword: (value, values) =>
                value !== values.password ? t('validation.passwordsDoNotMatch') : null,
        },
    })

    const handleSubmit = async (values: typeof form.values) => {
        setSubmitting(true)
        const { error } = await supabase.auth.updateUser({
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
                message: t('validation.passwordResetSuccess'),
                color: 'green',
            })
            navigate({ to: '/login' })
        }
        setSubmitting(false)
    }

    return (
        <Container size={420} my={40}>
            <Title ta="center">{t('notifications.resetPasswordTitle')}</Title>
            <Text c="dimmed" size="sm" ta="center" mt={5}>
                {t('notifications.resetPasswordSubtitle')}
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack>
                        <PasswordInput
                            label={t('fields.password')}
                            placeholder={t('placeholders.password')}
                            required
                            {...form.getInputProps('password')}
                        />
                        <PasswordInput
                            label={t('fields.confirmPassword')}
                            placeholder={t('placeholders.confirmPassword')}
                            required
                            {...form.getInputProps('confirmPassword')}
                        />
                        <Button type="submit" fullWidth loading={submitting}>
                            {t('buttons.updatePassword')}
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    )
}
