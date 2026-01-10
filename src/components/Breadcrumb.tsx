import { Breadcrumbs, Anchor, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

export interface BreadcrumbItem {
  label: string
  to?: string // undefined = current page (not clickable)
  search?: any // Preserve search params when navigating
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <Breadcrumbs separator=">" mt="xs">
      {items.map((item, index) => {
        if (!item.to) {
          // Current page - not clickable
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
            to={item.to as any}
            search={item.search}
            size="sm"
          >
            {item.label}
          </Anchor>
        )
      })}
    </Breadcrumbs>
  )
}
