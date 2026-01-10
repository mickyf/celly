import { Stack, Button, Group } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { useRouter, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[]
  onBack?: () => void // Custom back handler, defaults to router.history.back()
  title?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ breadcrumbs, onBack, title, actions }: PageHeaderProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      // Fallback: navigate to breadcrumb parent if no history
      const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2]

      if (window.history.length > 1) {
        router.history.back()
      } else if (parentBreadcrumb?.to) {
        navigate({
          to: parentBreadcrumb.to as any,
          search: parentBreadcrumb.search as any
        })
      }
    }
  }

  return (
    <Stack gap="xs">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={20} />}
        onClick={handleBack}
        style={{ alignSelf: 'flex-start' }}
      >
        {t('buttons.back')}
      </Button>

      <Breadcrumb items={breadcrumbs} />

      {title && (
        <Group justify="space-between" mt="sm">
          {title}
          {actions}
        </Group>
      )}
    </Stack>
  )
}
