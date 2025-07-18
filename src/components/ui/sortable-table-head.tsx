"use client"

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { TableHead } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SortDirection } from "@/hooks/useSorting"

interface SortableTableHeadProps {
  sortKey: string
  sortDirection: SortDirection
  onSort: (key: string) => void
  children: React.ReactNode
  className?: string
  canSort?: boolean
}

export function SortableTableHead({
  sortKey,
  sortDirection,
  onSort,
  children,
  className,
  canSort = true,
}: SortableTableHeadProps) {
  const getSortIcon = () => {
    if (!canSort) return null
    
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1 text-primary" />
    } else if (sortDirection === 'desc') {
      return <ArrowDown className="h-4 w-4 ml-1 text-primary" />
    } else {
      return <ArrowUpDown className="h-4 w-4 ml-1 text-muted-foreground opacity-50" />
    }
  }

  if (!canSort) {
    return (
      <TableHead className={className}>
        {children}
      </TableHead>
    )
  }

  return (
    <TableHead className={cn("p-0", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort(sortKey)}
        className={cn(
          "h-full w-full justify-start px-4 py-3 font-semibold text-sm tracking-wide uppercase hover:bg-muted/50 rounded-none",
          sortDirection && "text-primary"
        )}
      >
        <span className="flex items-center">
          {children}
          {getSortIcon()}
        </span>
      </Button>
    </TableHead>
  )
}