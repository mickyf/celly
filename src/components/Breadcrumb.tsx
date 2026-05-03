import { Breadcrumbs, Anchor, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

export interface BreadcrumbItem {
  label: string
  to?: string // undefined = current page (not clickable)
  search?: Record<string, unknown>
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <Breadcrumbs separator=">" mt="xs">
      {items.map((item, index) => {
        if (!item.to) {
          return (
            <Text key={index} size="sm" c="dimmed">
              {item.label}
            </Text>
          )
        }

        return (
          <Anchor
            key={index}
            component={Link}
            // breadcrumb entries are user-data driven; widen TanStack's strict types
            to={item.to as never}
            search={item.search as never}
            size="sm"
          >
            {item.label}
          </Anchor>
        )
      })}
    </Breadcrumbs>
  )
}
