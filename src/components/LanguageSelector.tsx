import { ActionIcon, Menu } from '@mantine/core'
import { useTranslation } from 'react-i18next'

const languages = {
  en: { flag: '🇬🇧', label: 'English' },
  'de-CH': { flag: '🇨🇭', label: 'Deutsch (Schweiz)' },
}

export function LanguageSelector() {
  const { i18n } = useTranslation()
  const currentLang = (i18n.language as keyof typeof languages) || 'en'

  return (
    <Menu position="bottom-end" withinPortal={false}>
      <Menu.Target>
        <ActionIcon variant="subtle" size="lg" aria-label="Change language">
          <span style={{ fontSize: '1.5rem' }}>{languages[currentLang].flag}</span>
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        {Object.entries(languages).map(([code, { flag, label }]) => (
          <Menu.Item
            key={code}
            onClick={() => i18n.changeLanguage(code)}
            leftSection={<span style={{ fontSize: '1.2rem' }}>{flag}</span>}
          >
            {label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}
