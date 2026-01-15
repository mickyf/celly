import {
    Paper,
    Text,
    Group,
    Stack,
    Tooltip,
    Box,
    Badge,
    useMantineTheme
} from '@mantine/core'
import { IconBottle, IconInfoCircle } from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { Database } from '../types/database'

type Wine = Database['public']['Tables']['wines']['Row']
type WineLocation = Database['public']['Tables']['wine_locations']['Row']

interface CellarVisualizerProps {
    cellarId: string
    locations: (WineLocation & { wine: Wine })[]
}

export function CellarVisualizer({ locations }: CellarVisualizerProps) {
    const { t } = useTranslation(['wines', 'common'])
    const theme = useMantineTheme()
    const navigate = useNavigate()

    // Calculate grid dimensions
    const maxShelf = Math.max(...locations.map(w => w.shelf || 0), 1)
    const maxRow = Math.max(...locations.map(w => w.row || 0), 1)
    const maxColumn = Math.max(...locations.map(w => w.column || 0), 1)

    // Map locations to a 3D-ish structure (Shelves -> Rows -> Columns)
    // For now, we take the first wine in a slot if multiple exist (unlikely in this UI)
    const locationMap = new Map<string, WineLocation & { wine: Wine }>()
    locations.forEach(loc => {
        if (loc.shelf !== null && loc.row !== null && loc.column !== null) {
            locationMap.set(`${loc.shelf}-${loc.row}-${loc.column}`, loc)
        }
    })

    const shelves = Array.from({ length: maxShelf }, (_, i) => i + 1)
    const rows = Array.from({ length: maxRow }, (_, i) => i + 1)
    const columns = Array.from({ length: maxColumn }, (_, i) => i + 1)

    const getWineColor = (grapes: string[]) => {
        const mainGrape = grapes[0]?.toLowerCase() || ''
        if (mainGrape.includes('pinot noir') || mainGrape.includes('cabernet') || mainGrape.includes('merlot')) return theme.colors.red[7]
        if (mainGrape.includes('chardonnay') || mainGrape.includes('riesling') || mainGrape.includes('sauvignon')) return theme.colors.yellow[2]
        if (mainGrape.includes('rosé')) return theme.colors.pink[3]
        return theme.colors.grape[6]
    }

    return (
        <Stack gap="xl">
            {shelves.map(shelf => (
                <Paper key={shelf} shadow="xs" p="md" withBorder>
                    <Group justify="space-between" mb="md">
                        <Text fw={700} size="lg">
                            {t('wines:form.labels.shelf')} {shelf}
                        </Text>
                        <Badge variant="light" color="gray">
                            {locations.filter(w => w.shelf === shelf).reduce((acc, curr) => acc + curr.quantity, 0)} {t('common:plurals.bottle_other')}
                        </Badge>
                    </Group>

                    <Stack gap="xs">
                        {rows.map(row => (
                            <Group key={row} wrap="nowrap" gap="xs">
                                <Text size="xs" w={20} c="dimmed" ta="right">{row}</Text>
                                <Group gap="xs" style={{ flex: 1 }}>
                                    {columns.map(col => {
                                        const loc = locationMap.get(`${shelf}-${row}-${col}`)
                                        const wine = loc?.wine
                                        return (
                                            <Tooltip
                                                key={col}
                                                label={loc ? `${wine?.name} (${wine?.vintage}) - ${loc.quantity} ${t('common:plurals.bottle_other')}` : `${t('wines:form.labels.row')} ${row}, ${t('wines:form.labels.column')} ${col}`}
                                                position="top"
                                                withArrow
                                                disabled={!loc}
                                            >
                                                <Box
                                                    onClick={() => wine && navigate({ to: `/wines/${wine.id}` })}
                                                    style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: theme.radius.sm,
                                                        backgroundColor: wine ? getWineColor(wine.grapes) : theme.colors.gray[1],
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        position: 'relative',
                                                        cursor: wine ? 'pointer' : 'default',
                                                        transition: 'transform 0.1s ease, background-color 0.2s ease',
                                                        border: `1px solid ${wine ? 'transparent' : theme.colors.gray[3]}`
                                                    }}
                                                >
                                                    {wine && <IconBottle size={24} color="white" stroke={1.5} />}
                                                    {loc && loc.quantity > 1 && (
                                                        <Badge
                                                            size="xs"
                                                            circle
                                                            color="dark"
                                                            style={{
                                                                position: 'absolute',
                                                                top: -8,
                                                                right: -8,
                                                                zIndex: 1
                                                            }}
                                                        >
                                                            {loc.quantity}
                                                        </Badge>
                                                    )}
                                                </Box>
                                            </Tooltip>
                                        )
                                    })}
                                </Group>
                            </Group>
                        ))}
                    </Stack>
                </Paper>
            ))}

            {locations.filter(w => w.shelf === null || w.row === null || w.column === null).length > 0 && (
                <Paper shadow="xs" p="md" withBorder bg="gray.0">
                    <Group mb="xs">
                        <IconInfoCircle size={20} color={theme.colors.blue[6]} />
                        <Text fw={600}>{t('wines:overview.unpositionedWines')}</Text>
                    </Group>
                    <Text size="sm" c="dimmed" mb="md">
                        {t('wines:overview.unpositionedWinesDesc')}
                    </Text>
                    <Group gap="xs">
                        {locations
                            .filter(w => w.shelf === null || w.row === null || w.column === null)
                            .map(loc => (
                                <Badge
                                    key={loc.id}
                                    variant="outline"
                                    color="gray"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate({ to: `/wines/${loc.wine.id}` })}
                                >
                                    {loc.wine.name} ({loc.quantity})
                                </Badge>
                            ))}
                    </Group>
                </Paper>
            )}
        </Stack>
    )
}
