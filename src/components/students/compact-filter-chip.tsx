import React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface CompactFilterChipProps {
  label?: string
  value?: string
  onRemove: () => void
  variant?: "default" | "secondary" | "outline" | "destructive"
  criteria?: any
  fieldConfig?: any
  onUpdate?: (updates: any) => void
  students?: any[]
  batches?: any[]
}

export function CompactFilterChip({ 
  label = "Filter", 
  value = "", 
  onRemove, 
  variant = "secondary",
  criteria,
  fieldConfig,
  onUpdate,
  students,
  batches
}: CompactFilterChipProps) {
  return (
    <Badge variant={variant} className="pr-1 gap-1">
      <span className="text-xs">
        {label}: <span className="font-semibold">{value}</span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-4 w-4 p-0 hover:bg-transparent"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  )
}