import {
  LineChart,
  Line,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Paper, Title, Group, Text, Stack } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import type { DashboardStats } from '../hooks/useDashboard'

type ConsumptionPoint = DashboardStats['consumptionData'][number]

interface ConsumptionChartProps {
  data: ConsumptionPoint[]
}

/**
 * `added` / `removed` are both stored positive; the sign is presentation.
 * `whenZero` differs by surface: the on-chart labels drop out entirely so a
 * one-directional month isn't cluttered, while the tooltip always lists all
 * three figures and shows a plain 0.
 */
const formatDelta = (sign: '+' | '-', value: number, whenZero: string) =>
  value > 0 ? `${sign}${value}` : whenZero

const labelDelta = (sign: '+' | '-') => (value: unknown) =>
  typeof value === 'number' ? formatDelta(sign, value, '') : ''

interface DeltaTooltipProps {
  active?: boolean
  label?: string | number
  payload?: { payload: ConsumptionPoint }[]
}

// Exported for direct testing: driving recharts' hover state in happy-dom is
// far more brittle than rendering the tooltip body with the props it receives.
export function DeltaTooltip({ active, payload, label }: DeltaTooltipProps) {
  const { t } = useTranslation('dashboard')
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <Paper shadow="md" p="xs" radius="sm" withBorder>
      <Stack gap={2}>
        <Text size="xs" fw={600}>
          {t('consumption.month')}: {label}
        </Text>
        <Text size="xs" c="teal.7">
          {t('consumption.added')}: {formatDelta('+', point.added, '0')}
        </Text>
        <Text size="xs" c="red.7">
          {t('consumption.removed')}: {formatDelta('-', point.removed, '0')}
        </Text>
        <Text size="xs" fw={600}>
          {t('consumption.count')}: {point.count}
        </Text>
      </Stack>
    </Paper>
  )
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

  // Still used for the legend and the line's series name; the tooltip does its
  // own translation inside DeltaTooltip.
  const countLabel = t('consumption.count')

  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Title order={3} mb="md">
        {t('sections.consumption')}
      </Title>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            // Extra top/right room so a delta label on the first or last point
            // isn't clipped by the SVG edge.
            margin={{ top: 24, right: 40, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            {/*
              Line doesn't constrain its labels to the plot area, so a point at
              the very top or bottom of the range would push its +/- label into
              the margin or onto the x-axis ticks. Padding keeps the series off
              both edges and leaves room for the labels.
            */}
            <YAxis padding={{ top: 24, bottom: 24 }} />
            <Tooltip content={<DeltaTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              name={countLabel}
              stroke="#4ecdc4"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              // Load-bearing: recharts gates label rendering on `!isAnimating`,
              // so with the entry animation on, the +/- annotations only appear
              // once it finishes. Off means they're there immediately.
              isAnimationActive={false}
            >
              <LabelList
                dataKey="added"
                position="top"
                offset={10}
                formatter={labelDelta('+')}
                fill="var(--mantine-color-teal-7)"
                fontSize={11}
                fontWeight={600}
              />
              <LabelList
                dataKey="removed"
                position="bottom"
                offset={10}
                formatter={labelDelta('-')}
                fill="var(--mantine-color-red-7)"
                fontSize={11}
                fontWeight={600}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Text size="sm" c="dimmed" mt="md">
        {t('consumption.description')}
      </Text>
    </Paper>
  )
}
