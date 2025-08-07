"use client"

import { useMemo } from 'react'
import { VirtualGrid } from '@/components/ui/virtual-list'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Users, User, BookOpen } from 'lucide-react'

interface TimetableEntry {
  id: string
  dayOfWeek: string
  date?: Date
  timeSlot: {
    name: string
    startTime: string
    endTime: string
  }
  subject?: {
    name: string
    code: string
  }
  faculty?: {
    name: string
  }
  batch?: {
    name: string
  }
  customEventTitle?: string
  customEventColor?: string
  entryType: string
}

interface VirtualTimetableGridProps {
  entries: TimetableEntry[]
  timeSlots: Array<{ id: string; name: string; startTime: string; endTime: string }>
  days: string[]
  height?: number
  onEntryClick?: (entry: TimetableEntry) => void
  onSlotClick?: (day: string, timeSlotId: string) => void
  className?: string
}

export function VirtualTimetableGrid({
  entries,
  timeSlots,
  days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  height = 600,
  onEntryClick,
  onSlotClick,
  className = ""
}: VirtualTimetableGridProps) {
  
  // Create a grid data structure
  const gridData = useMemo(() => {
    const grid: Array<{ day: string; timeSlot: any; entry?: TimetableEntry }> = []
    
    days.forEach(day => {
      timeSlots.forEach(timeSlot => {
        const entry = entries.find(e => 
          e.dayOfWeek === day && e.timeSlot.name === timeSlot.name
        )
        
        grid.push({
          day,
          timeSlot,
          entry
        })
      })
    })
    
    return grid
  }, [entries, timeSlots, days])

  const renderGridItem = (
    gridItem: { day: string; timeSlot: any; entry?: TimetableEntry },
    index: number
  ) => {
    const { day, timeSlot, entry } = gridItem
    
    return (
      <Card 
        className={`h-full cursor-pointer transition-all duration-200 hover:shadow-md ${
          entry ? 'border-primary/20 bg-primary/5' : 'border-dashed hover:border-solid'
        }`}
        onClick={() => {
          if (entry) {
            onEntryClick?.(entry)
          } else {
            onSlotClick?.(day, timeSlot.id)
          }
        }}
      >
        <CardContent className="p-3 h-full">
          {entry ? (
            <div className="space-y-2 h-full flex flex-col">
              {/* Time Info */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{timeSlot.startTime} - {timeSlot.endTime}</span>
              </div>

              {/* Subject/Event Title */}
              <div className="flex-1">
                <h4 className="font-medium text-sm leading-tight">
                  {entry.subject?.name || entry.customEventTitle || 'Class'}
                </h4>
                {entry.subject?.code && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {entry.subject.code}
                  </p>
                )}
              </div>

              {/* Faculty */}
              {entry.faculty && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="truncate">{entry.faculty.name}</span>
                </div>
              )}

              {/* Batch */}
              {entry.batch && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span className="truncate">{entry.batch.name}</span>
                </div>
              )}

              {/* Entry Type Badge */}
              {entry.entryType !== 'REGULAR' && (
                <Badge variant="secondary" className="text-xs">
                  {entry.entryType}
                </Badge>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <div className="text-xs text-center">
                <div className="font-medium">{timeSlot.name}</div>
                <div>{timeSlot.startTime} - {timeSlot.endTime}</div>
                <div className="mt-2 text-xs opacity-60">Click to add</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Show time slot headers
  const renderHeaders = () => (
    <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
      {days.map(day => (
        <div key={day} className="text-center font-medium p-2 bg-muted/50 rounded">
          {day.charAt(0) + day.slice(1).toLowerCase()}
        </div>
      ))}
    </div>
  )

  if (gridData.length === 0) {
    return (
      <div className={`border rounded-lg p-8 text-center text-muted-foreground ${className}`}>
        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No timetable data available</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {renderHeaders()}
      
      <VirtualGrid
        items={gridData}
        height={height}
        itemHeight={120} // Height for each time slot card
        columns={days.length}
        gap={16}
        renderItem={renderGridItem}
        className="border rounded-lg"
      />
    </div>
  )
}

// Specialized component for weekly timetable view
interface WeeklyTimetableGridProps extends Omit<VirtualTimetableGridProps, 'days'> {
  weekStart?: Date
}

export function WeeklyTimetableGrid({
  weekStart = new Date(),
  ...props
}: WeeklyTimetableGridProps) {
  const days = useMemo(() => {
    const weekDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
    return weekDays
  }, [])

  return (
    <VirtualTimetableGrid
      {...props}
      days={days}
    />
  )
}

// Specialized component for full week view including weekends
export function FullWeekTimetableGrid(props: VirtualTimetableGridProps) {
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
  
  return (
    <VirtualTimetableGrid
      {...props}
      days={days}
    />
  )
}