import { Card, Paper, SimpleGrid, Skeleton, Stack, Group } from '@mantine/core'

export function WineCardSkeleton() {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        <Skeleton height={200} radius={0} />
      </Card.Section>
      <Stack gap="sm" mt="md" mb="md">
        <Skeleton height={20} width="70%" />
        <Skeleton height={14} width="50%" />
        <Group gap="xs">
          <Skeleton height={18} width={60} />
          <Skeleton height={18} width={80} />
        </Group>
      </Stack>
      <Card.Section withBorder inheritPadding py="xs">
        <Group gap="xs">
          <Skeleton height={32} width={100} />
          <Skeleton height={32} width={32} />
          <Skeleton height={32} width={32} />
        </Group>
      </Card.Section>
    </Card>
  )
}

export function WineGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
      {Array.from({ length: count }).map((_, i) => (
        <WineCardSkeleton key={i} />
      ))}
    </SimpleGrid>
  )
}

export function StatCardSkeleton() {
  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Group>
        <Skeleton height={32} width={32} circle />
        <Stack gap={6} flex={1}>
          <Skeleton height={10} width="60%" />
          <Skeleton height={24} width="40%" />
        </Stack>
      </Group>
    </Paper>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </SimpleGrid>
  )
}
