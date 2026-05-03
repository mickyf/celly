import { Alert } from '@mantine/core'
import { IconWifiOff } from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()
  const { t } = useTranslation('common')
  if (online) return null
  return (
    <Alert
      icon={<IconWifiOff size={18} />}
      color="orange"
      variant="filled"
      radius={0}
      m={0}
      title={t('offline.title')}
    >
      {t('offline.message')}
    </Alert>
  )
}
