import { ActionIcon, Menu } from '@mantine/core'
import { useTranslation } from 'react-i18next'

const languages = {
  en: { flag: '🇬🇧', label: 'English' },
  'de-CH': { flag: '🇨🇭', label: 'Deutsch' },
}

export function LanguageSelector() {
  const { i18n } = useTranslation()

  // Match i18next's resolved language so the flag never disagrees with the labels.
  const getCurrentLang = (): keyof typeof languages => {
    const lang = i18n.resolvedLanguage || i18n.language || ''
    if (lang in languages) return lang as keyof typeof languages
    if (lang.toLowerCase().startsWith('de')) return 'de-CH'
    return 'en'
  }

  const currentLang = getCurrentLang()

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
