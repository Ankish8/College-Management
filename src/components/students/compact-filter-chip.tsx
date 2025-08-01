import React, { useState, useRef, useEffect } from "react"
import { X, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  FilterCriteria, 
  FilterFieldConfig, 
  FilterFieldType, 
  FilterOperator,
  requiresValue,
  requiresRangeValue,
  OPERATOR_LABELS
} from "@/types/student-filters"

interface CompactFilterChipProps {
  criteria: FilterCriteria
  fieldConfig: Record<FilterFieldType, FilterFieldConfig>
  onUpdate: (updates: Partial<FilterCriteria>) => void
  onRemove: () => void
  students?: any[]
  batches?: any[]
}

export function CompactFilterChip({ 
  criteria,
  fieldConfig,
  onUpdate,
  onRemove,
  students,
  batches
}: CompactFilterChipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempValue, setTempValue] = useState(criteria.value)

  const currentFieldConfig = fieldConfig[criteria.field]

  // Generate display label for the chip
  const getDisplayLabel = (): string => {
    const fieldLabel = currentFieldConfig?.label || criteria.field
    const operatorLabel = OPERATOR_LABELS[criteria.operator] || criteria.operator
    
    if (!requiresValue(criteria.operator)) {
      return `${fieldLabel} ${operatorLabel}`
    }

    if (requiresRangeValue(criteria.operator)) {
      const rangeValue = criteria.value as { from: string | number; to: string | number }
      return `${fieldLabel} ${operatorLabel} ${rangeValue.from}-${rangeValue.to}`
    }

    // For array values (multi-select)
    if (Array.isArray(criteria.value)) {
      const displayValue = criteria.value.length > 2 
        ? `${criteria.value.slice(0, 2).join(', ')}...` 
        : criteria.value.join(', ')
      return `${fieldLabel} ${operatorLabel} ${displayValue}`
    }

    // For regular values
    const displayValue = typeof criteria.value === 'string' && criteria.value.length > 20
      ? criteria.value.substring(0, 20) + '...'
      : String(criteria.value)
    
    return `${fieldLabel} ${operatorLabel} ${displayValue}`
  }

  const handleFieldChange = (newField: FilterFieldType) => {
    const newFieldConfig = fieldConfig[newField]
    const validOperators = newFieldConfig?.operators || []
    const newOperator = validOperators.includes(criteria.operator) 
      ? criteria.operator 
      : validOperators[0]
    
    onUpdate({ 
      field: newField, 
      operator: newOperator,
      value: requiresRangeValue(newOperator) ? { from: '', to: '' } : ''
    })
  }

  const handleOperatorChange = (newOperator: FilterOperator) => {
    let newValue = criteria.value
    
    if (requiresRangeValue(newOperator)) {
      newValue = { from: '', to: '' }
    } else if (!requiresValue(newOperator)) {
      newValue = ''
    } else if (requiresRangeValue(criteria.operator) && !requiresRangeValue(newOperator)) {
      // Converting from range to non-range
      newValue = ''
    }
    
    onUpdate({ operator: newOperator, value: newValue })
    setTempValue(newValue)
  }

  const handleValueChange = (newValue: any) => {
    setTempValue(newValue)
    onUpdate({ value: newValue })
  }

  const renderValueInput = () => {
    if (!requiresValue(criteria.operator)) {
      return null
    }

    if (requiresRangeValue(criteria.operator)) {
      const rangeValue = criteria.value as { from: string | number; to: string | number }
      return (
        <div className="space-y-2">
          <Label className="text-xs">Range</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="From"
              value={rangeValue.from || ''}
              onChange={(e) => handleValueChange({ ...rangeValue, from: e.target.value })}
              className="h-8"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="number"
              placeholder="To"
              value={rangeValue.to || ''}
              onChange={(e) => handleValueChange({ ...rangeValue, to: e.target.value })}
              className="h-8"
            />
          </div>
        </div>
      )
    }

    if (currentFieldConfig?.type === 'select') {
      return (
        <div className="space-y-2">
          <Label className="text-xs">Value</Label>
          <Select 
            value={String(criteria.value)} 
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder={currentFieldConfig.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {currentFieldConfig.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <Label className="text-xs">Value</Label>
        <Input
          type={currentFieldConfig?.type === 'number' || currentFieldConfig?.type === 'percentage' ? 'number' : 'text'}
          placeholder={currentFieldConfig?.placeholder}
          value={String(criteria.value)}
          onChange={(e) => handleValueChange(e.target.value)}
          className="h-8"
          min={currentFieldConfig?.min}
          max={currentFieldConfig?.max}
        />
      </div>
    )
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Badge 
          variant="secondary" 
          className="cursor-pointer hover:bg-secondary/80 pr-1 gap-1 max-w-xs"
        >
          <span className="text-xs truncate">
            {getDisplayLabel()}
          </span>
          <div className="flex items-center">
            <ChevronDown className="h-3 w-3 mr-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Field</Label>
            <Select value={criteria.field} onValueChange={handleFieldChange}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(fieldConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Operator</Label>
            <Select value={criteria.operator} onValueChange={handleOperatorChange}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentFieldConfig?.operators.map((operator) => (
                  <SelectItem key={operator} value={operator}>
                    {OPERATOR_LABELS[operator]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {renderValueInput()}
        </div>
      </PopoverContent>
    </Popover>
  )
}