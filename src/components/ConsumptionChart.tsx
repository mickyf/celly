import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Paper, Title, Group, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import type { DashboardStats } from '../hooks/useDashboard'

interface ConsumptionChartProps {
  data: DashboardStats['consumptionData']
}

export function ConsumptionChart({ data }: ConsumptionChartProps) {
  const { t } = useTranslation('dashboard')

  if (!data || data.length === 0) {
    return (
      <Paper shadow="sm" p="xl" radius="md" withBorder>
        <Group justify="center">
          <Text c="dimmed">{t('consumption.noData')}</Text>
        </Group>
      </Paper>
    )
  }

  const countLabel = t('consumption.count')
  const monthLabel = t('consumption.month')

  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Title order={3} mb="md">
        {t('sections.consumption')}
      </Title>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip
              formatter={(value) => [value, countLabel]}
              labelFormatter={(label) => `${monthLabel}: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              name={countLabel}
              stroke="#4ecdc4"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Text size="sm" c="dimmed" mt="md">
        {t('consumption.description')}
      </Text>
    </Paper>
  )
}
