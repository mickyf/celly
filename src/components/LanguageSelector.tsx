import { Select } from '@mantine/core'
import { useTranslation } from 'react-i18next'

export function LanguageSelector() {
  const { i18n } = useTranslation()

  return (
    <Select
      value={i18n.language}
      onChange={(value) => value && i18n.changeLanguage(value)}
      data={[
        { value: 'en', label: 'English' },
        { value: 'de-CH', label: 'Deutsch (Schweiz)' },
      ]}
      w={180}
      comboboxProps={{ withinPortal: false }}
    />
  )
}
