import {
    Paper,
    Text,
    Group,
    Stack,
    Tooltip,
    Box,
    Badge,
    Button,
    ActionIcon,
    Modal,
    Menu,
    useMantineTheme,
} from '@mantine/core'
import { IconBottle, IconTrash, IconPlus, IconPencil, IconEye, IconGlass, IconArrowBackUp } from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { useDisclosure } from '@mantine/hooks'
import { useDeleteShelf, useUnplaceWine, type SlotWithWine } from '../hooks/useWineLocations'
import { useAddStockMovement } from '../hooks/useStockMovements'

interface CellarVisualizerProps {
    cellarId: string
    slots: SlotWithWine[]
    onAddShelf: () => void
    onSlotClick: (slot: SlotWithWine) => void
    onEditShelf: (shelf: number) => void
}

export function CellarVisualizer({ cellarId, slots, onAddShelf, onSlotClick, onEditShelf }: CellarVisualizerProps) {
    const { t } = useTranslation(['wines', 'common'])
    const theme = useMantineTheme()
    const navigate = useNavigate()
    const deleteShelf = useDeleteShelf()
    const unplaceWine = useUnplaceWine()
    const addStockMovement = useAddStockMovement()
    const [confirmOpened, { open: openConfirm, close: closeConfirm }] = useDisclosure(false)
    const [shelfToDelete, setShelfToDelete] = useState<number | null>(null)

    const handleDrink = (slot: SlotWithWine) => {
        if (!slot.wine_id) return
        addStockMovement.mutate({
            wine_id: slot.wine_id,
            user_id: '',
            movement_type: 'out',
            quantity: 1,
            movement_date: new Date().toISOString().slice(0, 10),
            notes: null,
        })
        unplaceWine.mutate({ slotId: slot.id })
    }

    const handleUnplace = (slot: SlotWithWine) => {
        unplaceWine.mutate({ slotId: slot.id })
    }

    const shelves = useMemo(() => {
        const byShelf = new Map<number, SlotWithWine[]>()
        for (const slot of slots) {
            const arr = byShelf.get(slot.shelf) ?? []
            arr.push(slot)
            byShelf.set(slot.shelf, arr)
        }
        return Array.from(byShelf.entries())
            .map(([shelf, shelfSlots]) => ({
                shelf,
                rows: Math.max(...shelfSlots.map((s) => s.row)),
                columns: Math.max(...shelfSlots.map((s) => s.column)),
                slots: shelfSlots,
            }))
            .sort((a, b) => a.shelf - b.shelf)
    }, [slots])

    const getWineColor = (grapes: string[] | null) => {
        const mainGrape = grapes?.[0]?.toLowerCase() || ''
        if (mainGrape.includes('pinot noir') || mainGrape.includes('cabernet') || mainGrape.includes('merlot')) return theme.colors.red[7]
        if (mainGrape.includes('chardonnay') || mainGrape.includes('riesling') || mainGrape.includes('sauvignon')) return theme.colors.yellow[2]
        if (mainGrape.includes('rosé') || mainGrape.includes('rose')) return theme.colors.pink[3]
        return theme.colors.grape[6]
    }

    const handleDeleteShelf = (shelf: number) => {
        setShelfToDelete(shelf)
        openConfirm()
    }

    const confirmDelete = () => {
        if (shelfToDelete !== null) {
            deleteShelf.mutate({ cellarId, shelf: shelfToDelete })
        }
        closeConfirm()
        setShelfToDelete(null)
    }

    if (shelves.length === 0) {
        return (
            <Paper shadow="xs" p="xl" withBorder>
                <Stack align="center" gap="md">
                    <Text c="dimmed" ta="center">{t('wines:overview.noShelves')}</Text>
                    <Button leftSection={<IconPlus size={18} />} onClick={onAddShelf}>
                        {t('wines:overview.addShelf')}
                    </Button>
                </Stack>
            </Paper>
        )
    }

    return (
        <>
        <Modal
            opened={confirmOpened}
            onClose={closeConfirm}
            title={t('wines:overview.deleteShelf')}
            centered
        >
            <Stack>
                <Text size="sm">
                    {shelfToDelete !== null && t('wines:overview.confirmDeleteShelf', { n: shelfToDelete })}
                </Text>
                <Group justify="flex-end">
                    <Button variant="default" onClick={closeConfirm}>
                        {t('common:buttons.cancel')}
                    </Button>
                    <Button color="red" onClick={confirmDelete} loading={deleteShelf.isPending}>
                        {t('common:buttons.delete')}
                    </Button>
                </Group>
            </Stack>
        </Modal>
        <Stack gap="xl">
            {shelves.map(({ shelf, rows, columns, slots: shelfSlots }) => {
                const slotMap = new Map<string, SlotWithWine>()
                for (const slot of shelfSlots) {
                    slotMap.set(`${slot.row}-${slot.column}`, slot)
                }
                const occupied = shelfSlots.filter((s) => s.wine_id).length

                return (
                    <Paper key={shelf} shadow="xs" p="md" withBorder>
                        <Group justify="space-between" mb="md">
                            <Group gap="sm">
                                <Text fw={700} size="lg">
                                    {t('wines:overview.shelfNumber', { n: shelf })}
                                </Text>
                                <Badge variant="light" color="gray">
                                    {occupied} / {shelfSlots.length}
                                </Badge>
                            </Group>
                            <Group gap="xs">
                                <ActionIcon
                                    variant="subtle"
                                    onClick={() => onEditShelf(shelf)}
                                    aria-label={t('common:buttons.edit')}
                                >
                                    <IconPencil size={16} />
                                </ActionIcon>
                                <Tooltip
                                    label={t('wines:overview.cannotDeleteOccupied')}
                                    disabled={occupied === 0}
                                >
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={() => handleDeleteShelf(shelf)}
                                        disabled={occupied > 0}
                                        aria-label={t('wines:overview.deleteShelf')}
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Tooltip>
                            </Group>
                        </Group>

                        <Stack gap="xs">
                            {Array.from({ length: rows }, (_, i) => i + 1).map((row) => (
                                <Group key={row} wrap="nowrap" gap="xs">
                                    <Text size="xs" w={20} c="dimmed" ta="right">{row}</Text>
                                    <Group gap="xs" style={{ flex: 1 }}>
                                        {Array.from({ length: columns }, (_, i) => i + 1).map((col) => {
                                            const slot = slotMap.get(`${row}-${col}`)
                                            if (!slot) {
                                                return <Box key={col} style={{ width: 40, height: 40 }} />
                                            }
                                            const wine = slot.wine
                                            const occupied = !!wine
                                            const slotBox = (
                                                <Box
                                                    onClick={() => {
                                                        if (!occupied) onSlotClick(slot)
                                                    }}
                                                    style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: theme.radius.sm,
                                                        backgroundColor: occupied ? getWineColor(wine?.grapes ?? null) : theme.colors.gray[1],
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        border: `1px dashed ${occupied ? 'transparent' : theme.colors.gray[4]}`,
                                                    }}
                                                >
                                                    {occupied && <IconBottle size={24} color="white" stroke={1.5} />}
                                                </Box>
                                            )
                                            const tooltipLabel = wine
                                                ? `${wine.name}${wine.vintage ? ` (${wine.vintage})` : ''}`
                                                : `${t('wines:overview.slotEmpty')} — ${t('wines:form.labels.row')} ${row}, ${t('wines:form.labels.column')} ${col}`

                                            if (occupied && wine) {
                                                return (
                                                    <Menu key={col} position="top" withArrow shadow="md">
                                                        <Menu.Target>
                                                            {slotBox}
                                                        </Menu.Target>
                                                        <Menu.Dropdown p="xs">
                                                            <Stack gap="xs" align="center">
                                                                <Text size="xs" fw={600} ta="center" maw={200}>
                                                                    {wine.name}{wine.vintage ? ` (${wine.vintage})` : ''}
                                                                </Text>
                                                                <Group gap="xs" wrap="nowrap">
                                                                    <Tooltip label={t('wines:overview.actions.openDetail')} withArrow>
                                                                        <ActionIcon
                                                                            variant="light"
                                                                            onClick={() => navigate({ to: `/wines/${wine.id}` })}
                                                                            aria-label={t('wines:overview.actions.openDetail')}
                                                                        >
                                                                            <IconEye size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                    <Tooltip label={t('wines:overview.actions.drink')} withArrow>
                                                                        <ActionIcon
                                                                            variant="light"
                                                                            color="grape"
                                                                            onClick={() => handleDrink(slot)}
                                                                            aria-label={t('wines:overview.actions.drink')}
                                                                        >
                                                                            <IconGlass size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                    <Tooltip label={t('wines:overview.actions.unplace')} withArrow>
                                                                        <ActionIcon
                                                                            variant="light"
                                                                            color="gray"
                                                                            onClick={() => handleUnplace(slot)}
                                                                            aria-label={t('wines:overview.actions.unplace')}
                                                                        >
                                                                            <IconArrowBackUp size={16} />
                                                                        </ActionIcon>
                                                                    </Tooltip>
                                                                </Group>
                                                            </Stack>
                                                        </Menu.Dropdown>
                                                    </Menu>
                                                )
                                            }

                                            return (
                                                <Tooltip key={col} label={tooltipLabel} position="top" withArrow>
                                                    {slotBox}
                                                </Tooltip>
                                            )
                                        })}
                                    </Group>
                                </Group>
                            ))}
                        </Stack>
                    </Paper>
                )
            })}

            <Button leftSection={<IconPlus size={18} />} variant="light" onClick={onAddShelf}>
                {t('wines:overview.addShelf')}
            </Button>
        </Stack>
        </>
    )
}
