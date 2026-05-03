import { createFileRoute } from '@tanstack/react-router'
import {
    Container,
    Title,
    Paper,
    Stack,
    Button,
    PasswordInput,
    Text,
    Anchor,
    Alert,
    Group,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import { IconSettings, IconKey, IconLock, IconExternalLink, IconAlertCircle } from '@tabler/icons-react'
import { useUserSetting, useUpdateUserSetting } from '../hooks/useUserSettings'
import { supabase } from '../lib/supabase'
import { validatePasswordComplexity } from '../lib/passwordPolicy'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/settings')({
    component: SettingsPage,
})

function SettingsPage() {
    const { t } = useTranslation(['common', 'settings', 'auth'])
    const { data: claudeKeySetting, isLoading } = useUserSetting('claude_api_key')
    const updateSetting = useUpdateUserSetting()
    const [changingPassword, setChangingPassword] = useState(false)

    const form = useForm({
        initialValues: {
            claude_api_key: '',
        },
    })

    const passwordForm = useForm({
        initialValues: {
            password: '',
            confirmPassword: '',
        },
        validate: {
            password: (value) => {
                const err = validatePasswordComplexity(value)
                return err ? t(`auth:${err}`) : null
            },
            confirmPassword: (value, values) =>
                value !== values.password ? t('auth:validation.passwordsDoNotMatch') : null,
        },
    })

    const handlePasswordSubmit = async (values: typeof passwordForm.values) => {
        setChangingPassword(true)
        const { error } = await supabase.auth.updateUser({ password: values.password })

        if (error) {
            notifications.show({
                title: t('auth:notifications.loginFailed'),
                message: error.message,
                color: 'red',
            })
        } else {
            notifications.show({
                title: t('auth:notifications.success'),
                message: t('auth:validation.passwordResetSuccess'),
                color: 'green',
            })
            passwordForm.reset()
        }
        setChangingPassword(false)
    }

    useEffect(() => {
        if (claudeKeySetting) {
            form.setValues({
                claude_api_key: (claudeKeySetting.value as string) || '',
            })
        }
        // Mantine form ref is stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [claudeKeySetting])

    const handleSubmit = (values: typeof form.values) => {
        updateSetting.mutate({
            key: 'claude_api_key',
            value: values.claude_api_key,
        })
    }

    return (
        <Container size="sm" py="xl">
            <Stack gap="lg">
                <Title order={2}>
                    <Stack gap="xs" align="center" style={{ flexDirection: 'row' }}>
                        <IconSettings size={32} stroke={1.5} />
                        {t('common:nav.settings', { defaultValue: 'Settings' })}
                    </Stack>
                </Title>

                <Paper shadow="sm" p="lg" radius="md" withBorder>
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md">
                            <Title order={4}>
                                <Stack gap="xs" align="center" style={{ flexDirection: 'row' }}>
                                    <IconKey size={20} stroke={1.5} />
                                    {t('settings:claude.title', { defaultValue: 'Claude AI API' })}
                                </Stack>
                            </Title>

                            <Text size="sm" c="dimmed">
                                {t('settings:claude.description', {
                                    defaultValue: 'To use AI features like wine enrichment and food pairing recommendations, you can provide your own Claude API key.'
                                })}
                            </Text>

                            <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                                {t('settings:claude.fallbackInfo', {
                                    defaultValue: 'If you don\'t provide a key, the application will attempt to use the server-wide default key if configured.'
                                })}
                            </Alert>

                            <PasswordInput
                                label={t('settings:claude.label', { defaultValue: 'Claude API Key' })}
                                placeholder="sk-ant-..."
                                {...form.getInputProps('claude_api_key')}
                            />

                            <Group justify="flex-start">
                                <Anchor href="https://console.anthropic.com/" target="_blank" size="xs">
                                    <Stack gap={4} align="center" style={{ flexDirection: 'row' }}>
                                        {t('settings:claude.getApiKey', { defaultValue: 'Get an API key from Anthropic' })}
                                        <IconExternalLink size={12} stroke={1.5} />
                                    </Stack>
                                </Anchor>
                            </Group>

                            <Button
                                type="submit"
                                loading={updateSetting.isPending || isLoading}
                                leftSection={<IconSettings size={18} />}
                            >
                                {t('common:buttons.save')}
                            </Button>
                        </Stack>
                    </form>
                </Paper>

                <Paper shadow="sm" p="lg" radius="md" withBorder>
                    <form onSubmit={passwordForm.onSubmit(handlePasswordSubmit)}>
                        <Stack gap="md">
                            <Title order={4}>
                                <Stack gap="xs" align="center" style={{ flexDirection: 'row' }}>
                                    <IconLock size={20} stroke={1.5} />
                                    {t('settings:password.title', { defaultValue: 'Change password' })}
                                </Stack>
                            </Title>

                            <Text size="sm" c="dimmed">
                                {t('settings:password.description', {
                                    defaultValue: 'Set a new password for your account.'
                                })}
                            </Text>

                            <PasswordInput
                                label={t('auth:fields.password')}
                                placeholder={t('auth:placeholders.password')}
                                required
                                {...passwordForm.getInputProps('password')}
                            />
                            <PasswordInput
                                label={t('auth:fields.confirmPassword')}
                                placeholder={t('auth:placeholders.confirmPassword')}
                                required
                                {...passwordForm.getInputProps('confirmPassword')}
                            />

                            <Button
                                type="submit"
                                loading={changingPassword}
                                leftSection={<IconLock size={18} />}
                            >
                                {t('auth:buttons.updatePassword')}
                            </Button>
                        </Stack>
                    </form>
                </Paper>

                <Paper shadow="sm" p="lg" radius="md" withBorder>
                    <Stack gap="sm">
                        <Title order={4}>{t('settings:about.title', { defaultValue: 'About Celly' })}</Title>
                        <Text size="sm">
                            {t('settings:about.description', {
                                defaultValue: 'Celly is your personal wine cellar assistant. Manage your collection, get AI-powered insights, and find the perfect food pairings.'
                            })}
                        </Text>
                        <Text size="xs" c="dimmed">
                            Version 1.0.0
                        </Text>
                    </Stack>
                </Paper>
            </Stack>
        </Container>
    )
}
