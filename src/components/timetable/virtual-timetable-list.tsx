"use client"

import { useMemo } from 'react'
import { VirtualList } from '@/components/ui/virtual-list'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  Users, 
  User, 
  BookOpen, 
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'

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
  notes?: string
}

interface VirtualTimetableListProps {
  entries: TimetableEntry[]
  height?: number
  onEdit?: (entry: TimetableEntry) => void
  onDelete?: (entryId: string) => void
  onCopy?: (entry: TimetableEntry) => void
  groupBy?: 'day' | 'subject' | 'faculty' | 'batch' | 'none'
  className?: string
}

export function VirtualTimetableList({
  entries,
  height = 600,
  onEdit,
  onDelete,
  onCopy,
  groupBy = 'day',
  className = ""
}: VirtualTimetableListProps) {

  // Group and sort entries
  const groupedEntries = useMemo(() => {
    if (groupBy === 'none') {
      return [{ title: 'All Entries', entries }]
    }

    const groups: Record<string, TimetableEntry[]> = {}
    
    entries.forEach(entry => {
      let groupKey = ''
      
      switch (groupBy) {
        case 'day':
          groupKey = entry.dayOfWeek
          break
        case 'subject':
          groupKey = entry.subject?.name || entry.customEventTitle || 'No Subject'
          break
        case 'faculty':
          groupKey = entry.faculty?.name || 'No Faculty'
          break
        case 'batch':
          groupKey = entry.batch?.name || 'No Batch'
          break
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(entry)
    })

    // Convert to array and sort
    const groupArray = Object.entries(groups).map(([title, entries]) => ({
      title,
      entries: entries.sort((a, b) => {
        // Sort by time slot
        return a.timeSlot.startTime.localeCompare(b.timeSlot.startTime)
      })
    }))

    // Sort groups
    if (groupBy === 'day') {
      const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
      groupArray.sort((a, b) => dayOrder.indexOf(a.title) - dayOrder.indexOf(b.title))
    } else {
      groupArray.sort((a, b) => a.title.localeCompare(b.title))
    }

    return groupArray
  }, [entries, groupBy])

  // Flatten for virtual list
  const listItems = useMemo(() => {
    const items: Array<{ type: 'header' | 'entry'; data: any }> = []
    
    groupedEntries.forEach(group => {
      if (groupBy !== 'none') {
        items.push({ type: 'header', data: group.title })
      }
      
      group.entries.forEach(entry => {
        items.push({ type: 'entry', data: entry })
      })
    })
    
    return items
  }, [groupedEntries, groupBy])

  const getItemHeight = (index: number) => {
    return listItems[index].type === 'header' ? 48 : 120
  }

  const renderItem = (item: { type: 'header' | 'entry'; data: any }, index: number) => {
    if (item.type === 'header') {
      return (
        <div className="bg-muted/50 px-4 py-3 font-medium text-sm border-b sticky top-0 z-10">
          <div className="flex items-center gap-2">
            {groupBy === 'day' && <Calendar className="h-4 w-4" />}
            {groupBy === 'subject' && <BookOpen className="h-4 w-4" />}
            {groupBy === 'faculty' && <User className="h-4 w-4" />}
            {groupBy === 'batch' && <Users className="h-4 w-4" />}
            <span>{item.data} ({groupedEntries.find(g => g.title === item.data)?.entries.length || 0})</span>
          </div>
        </div>
      )
    }

    const entry: TimetableEntry = item.data

    return (
      <Card className="mx-2 mb-2 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              {/* Header with subject/title and time */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-lg">
                    {entry.subject?.name || entry.customEventTitle || 'Class'}
                  </h3>
                  {entry.subject?.code && (
                    <p className="text-sm text-muted-foreground">
                      {entry.subject.code}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{entry.timeSlot.name}</span>
                  <span>{entry.timeSlot.startTime} - {entry.timeSlot.endTime}</span>
                </div>
              </div>

              {/* Details row */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                {/* Day */}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{entry.dayOfWeek.charAt(0) + entry.dayOfWeek.slice(1).toLowerCase()}</span>
                  {entry.date && (
                    <span>({format(entry.date, 'MMM dd')})</span>
                  )}
                </div>

                {/* Faculty */}
                {entry.faculty && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{entry.faculty.name}</span>
                  </div>
                )}

                {/* Batch */}
                {entry.batch && (
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{entry.batch.name}</span>
                  </div>
                )}

                {/* Entry Type */}
                {entry.entryType !== 'REGULAR' && (
                  <Badge variant="secondary" className="text-xs">
                    {entry.entryType}
                  </Badge>
                )}
              </div>

              {/* Notes */}
              {entry.notes && (
                <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                  {entry.notes}
                </p>
              )}
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => onEdit?.(entry)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Entry
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onCopy?.(entry)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate Entry
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete?.(entry.id)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Entry
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (entries.length === 0) {
    return (
      <div className={`border rounded-lg p-8 text-center text-muted-foreground ${className}`}>
        <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No timetable entries found</p>
      </div>
    )
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      <VirtualList
        items={listItems}
        height={height}
        itemHeight={getItemHeight}
        renderItem={renderItem}
        overscan={5}
      />
    </div>
  )
}

// Component with predefined grouping options
interface GroupedTimetableListProps extends Omit<VirtualTimetableListProps, 'groupBy'> {
  groupBy: 'day' | 'subject' | 'faculty' | 'batch'
}

export function GroupedTimetableList(props: GroupedTimetableListProps) {
  return <VirtualTimetableList {...props} />
}

// Specialized components
export function DayWiseTimetableList(props: Omit<VirtualTimetableListProps, 'groupBy'>) {
  return <VirtualTimetableList {...props} groupBy="day" />
}

export function SubjectWiseTimetableList(props: Omit<VirtualTimetableListProps, 'groupBy'>) {
  return <VirtualTimetableList {...props} groupBy="subject" />
}

export function FacultyWiseTimetableList(props: Omit<VirtualTimetableListProps, 'groupBy'>) {
  return <VirtualTimetableList {...props} groupBy="faculty" />
}